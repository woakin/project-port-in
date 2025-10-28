import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/types/document.types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments((data || []) as unknown as Document[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, category?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast.error('No se encontró la empresa del usuario');
        return null;
      }

      // 1. Upload a storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profile.company_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. Crear registro en DB
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          company_id: profile.company_id,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: filePath,
          file_type: fileExt,
          file_size: file.size,
          category: category || null,
          analysis_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Documento subido correctamente');
      await fetchDocuments();
      
      return docData.id;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
      return null;
    }
  };

  const analyzeDocument = async (documentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-document', {
        body: { documentId }
      });

      if (error) throw error;

      toast.success('Análisis completado');
      await fetchDocuments();
      
      return data;
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast.error('Error al analizar documento');
      return null;
    }
  };

  const deleteDocument = async (documentId: string, fileUrl: string) => {
    try {
      // 1. Eliminar de storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([fileUrl]);

      if (storageError) throw storageError;

      // 2. Eliminar de DB
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast.success('Documento eliminado');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const downloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(fileUrl);

      if (error) throw error;

      // Crear link de descarga
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar documento');
    }
  };

  const getDocumentsByCategory = (category: string) => {
    return documents.filter(doc => doc.category === category);
  };

  return {
    documents,
    loading,
    uploadDocument,
    analyzeDocument,
    deleteDocument,
    downloadDocument,
    getDocumentsByCategory,
    refetch: fetchDocuments
  };
}
