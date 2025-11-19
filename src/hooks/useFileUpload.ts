import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DocumentAnalysis } from '@/types/document.types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// Tipos de archivo permitidos con validación estricta
export const ACCEPTED_FILE_TYPES = {
  // Documentos
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  
  // Imágenes
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  
  // Texto
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

// Límites de seguridad
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES_PER_MESSAGE = 3;

export interface UploadedFileInfo {
  id: string;
  name: string;
  analysis: DocumentAnalysis | null;
}

export function useFileUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  // Sanitizar nombre de archivo
  const sanitizeFileName = (fileName: string): string => {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Eliminar caracteres especiales
      .substring(0, 200); // Limitar longitud
  };

  // Validar archivo individual
  const validateFile = (file: File): string | null => {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return `El archivo "${file.name}" excede el tamaño máximo de 20MB`;
    }

    // Validar extensión
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = Object.values(ACCEPTED_FILE_TYPES).flat();
    
    if (!acceptedExtensions.includes(extension)) {
      return `El tipo de archivo "${extension}" no está permitido`;
    }

    // Validar mime type
    const acceptedMimeTypes = Object.keys(ACCEPTED_FILE_TYPES);
    if (!acceptedMimeTypes.includes(file.type) && file.type !== '') {
      return `El tipo MIME "${file.type}" no está permitido`;
    }

    return null;
  };

  // Subir y analizar múltiples archivos
  const uploadFilesForChat = async (
    files: File[],
    category: string = 'chat_upload'
  ): Promise<UploadedFileInfo[]> => {
    if (!user) {
      toast.error('Debes iniciar sesión para subir archivos');
      return [];
    }

    // Validar cantidad
    if (files.length > MAX_FILES_PER_MESSAGE) {
      toast.error(`Máximo ${MAX_FILES_PER_MESSAGE} archivos por mensaje`);
      return [];
    }

    // Validar cada archivo
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return [];
      }
    }

    setUploading(true);
    const uploadedFiles: UploadedFileInfo[] = [];

    try {
      // Obtener company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('No se encontró la empresa del usuario');
        return [];
      }

      // Procesar cada archivo
      for (const file of files) {
        try {
          console.log(`📎 Subiendo: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`);

          // 1. Subir a Storage
          const fileExt = file.name.split('.').pop();
          const sanitizedName = sanitizeFileName(file.name.replace(`.${fileExt}`, ''));
          const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`;
          const filePath = `${profile.company_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              contentType: file.type || 'application/octet-stream'
            });

          if (uploadError) {
            console.error('Error subiendo a storage:', uploadError);
            throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);
          }

          // 2. Crear registro en DB
          const { data: docData, error: dbError } = await supabase
            .from('documents')
            .insert({
              company_id: profile.company_id,
              uploaded_by: user.id,
              file_name: file.name,
              file_url: filePath,
              file_type: fileExt,
              file_size: file.size,
              category: category,
              analysis_status: 'pending'
            })
            .select()
            .single();

          if (dbError) {
            console.error('Error creando registro en DB:', dbError);
            throw new Error(`Error al registrar ${file.name}: ${dbError.message}`);
          }

          console.log(`✅ Documento registrado: ${docData.id}`);

          // 3. Analizar documento
          console.log(`🔍 Analizando: ${file.name}`);
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
            'analyze-document',
            { body: { documentId: docData.id } }
          );

          if (analysisError) {
            console.warn('Error analizando documento:', analysisError);
            // No bloqueamos si el análisis falla
            uploadedFiles.push({
              id: docData.id,
              name: file.name,
              analysis: null
            });
          } else {
            console.log(`✅ Análisis completado: ${file.name}`);
            uploadedFiles.push({
              id: docData.id,
              name: file.name,
              analysis: analysisData?.analysis || null
            });
          }
        } catch (fileError: any) {
          console.error(`Error procesando ${file.name}:`, fileError);
          toast.error(fileError.message || `Error al procesar ${file.name}`);
        }
      }

      if (uploadedFiles.length > 0) {
        toast.success(
          uploadedFiles.length === 1
            ? '✓ Documento analizado y listo'
            : `✓ ${uploadedFiles.length} documentos analizados y listos`
        );
      }

      return uploadedFiles;
    } catch (error: any) {
      console.error('Error general en upload:', error);
      toast.error(error.message || 'Error al subir archivos');
      return [];
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFilesForChat,
    uploading,
    MAX_FILE_SIZE,
    MAX_FILES_PER_MESSAGE,
    ACCEPTED_FILE_TYPES
  };
}
