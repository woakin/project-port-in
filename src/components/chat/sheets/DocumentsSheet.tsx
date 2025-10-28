import { useDocuments } from '@/hooks/useDocuments';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DocumentsSheet() {
  const { documents, downloadDocument, loading } = useDocuments();

  const handleDownload = async (id: string, fileName: string) => {
    try {
      await downloadDocument(id, fileName);
      toast({
        title: 'Descarga iniciada',
        description: `Descargando ${fileName}`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo descargar el documento',
        variant: 'destructive'
      });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, label: 'Analizado', variant: 'success' as const };
      case 'processing':
        return { icon: Clock, label: 'Analizando', variant: 'default' as const };
      case 'failed':
        return { icon: AlertCircle, label: 'Error', variant: 'error' as const };
      default:
        return { icon: Clock, label: 'Pendiente', variant: 'warning' as const };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay documentos subidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {documents.map((doc) => {
        const statusInfo = getStatusInfo(doc.analysis_status);
        const StatusIcon = statusInfo.icon;
        const fileSizeMB = doc.file_size ? (doc.file_size / (1024 * 1024)).toFixed(2) : null;

        return (
          <Card key={doc.id} variant="content" className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1 truncate">
                  {doc.file_name}
                </h4>
                
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant={statusInfo.variant}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  {doc.category && (
                    <Badge variant="default">{doc.category}</Badge>
                  )}
                  {fileSizeMB && (
                    <span className="text-xs text-muted-foreground">
                      {fileSizeMB} MB
                    </span>
                  )}
                </div>

                {doc.analysis_result && (
                  <div className="bg-muted/50 rounded p-2 mb-2">
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {typeof doc.analysis_result === 'string' 
                        ? doc.analysis_result 
                        : JSON.stringify(doc.analysis_result).substring(0, 150) + '...'}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()} · {doc.file_type}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.id, doc.file_name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
