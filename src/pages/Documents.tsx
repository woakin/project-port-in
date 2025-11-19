import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Document } from '@/types/document.types';

export default function Documents() {
  const { documents, loading, deleteDocument, downloadDocument, analyzeDocument } = useDocuments();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      financial: 'Financiero',
      legal: 'Legal',
      operational: 'Operacional',
      marketing: 'Marketing',
      strategic: 'Estratégico',
      other: 'Otro'
    };
    return category ? labels[category] || category : 'Sin categoría';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { variant: 'default' as const, icon: Clock, label: 'Pendiente' },
      processing: { variant: 'default' as const, icon: Loader2, label: 'Procesando' },
      completed: { variant: 'success' as const, icon: CheckCircle2, label: 'Completado' },
      failed: { variant: 'error' as const, icon: AlertCircle, label: 'Error' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const handleViewDetails = (doc: Document) => {
    setSelectedDoc(doc);
    setDetailsOpen(true);
  };

  const categories = ['all', 'financial', 'legal', 'operational', 'marketing', 'strategic', 'other'];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Sube y analiza documentos empresariales con IA
          </p>
        </div>

        <DocumentUpload />

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">Todos ({documents.length})</TabsTrigger>
            {categories.slice(1).map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {getCategoryLabel(cat)} ({documents.filter(d => d.category === cat).length})
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => {
            const filteredDocs = category === 'all' 
              ? documents 
              : documents.filter(d => d.category === category);

            return (
              <TabsContent key={category} value={category} className="mt-6">
                {filteredDocs.length === 0 ? (
                  <Card variant="content" className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No hay documentos en esta categoría
                    </p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map(doc => {
                      const statusBadge = getStatusBadge(doc.analysis_status);
                      const StatusIcon = statusBadge.icon;

                      return (
                        <Card key={doc.id} variant="content" className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm truncate">
                                    {doc.file_name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {doc.category && (
                                <Badge variant="default" className="text-xs">
                                  {getCategoryLabel(doc.category)}
                                </Badge>
                              )}
                              <Badge variant={statusBadge.variant} className="text-xs">
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </Badge>
                            </div>

                            {doc.analysis_status === 'completed' && doc.analysis_result && (
                              <div className="text-xs text-muted-foreground line-clamp-2">
                                {doc.analysis_result.summary}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleViewDetails(doc)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadDocument(doc.file_url, doc.file_name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteDocument(doc.id, doc.file_url)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            {doc.analysis_status === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => analyzeDocument(doc.id)}
                              >
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Analizar
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDoc?.file_name}</DialogTitle>
            </DialogHeader>
            
            {selectedDoc && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Categoría</p>
                    <p className="font-medium">{getCategoryLabel(selectedDoc.category)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <Badge variant={getStatusBadge(selectedDoc.analysis_status).variant}>
                      {getStatusBadge(selectedDoc.analysis_status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tamaño</p>
                    <p className="font-medium">
                      {selectedDoc.file_size 
                        ? `${(selectedDoc.file_size / 1024).toFixed(1)} KB` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha</p>
                    <p className="font-medium">
                      {format(new Date(selectedDoc.created_at), "d MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                {selectedDoc.analysis_result && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Resumen Ejecutivo</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedDoc.analysis_result.summary}
                      </p>
                    </div>

                    {selectedDoc.analysis_result.insights && selectedDoc.analysis_result.insights.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Insights y Recomendaciones</h4>
                        <ul className="space-y-2">
                          {selectedDoc.analysis_result.insights.map((insight, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedDoc.analysis_result.key_data && (
                      <div>
                        <h4 className="font-semibold mb-2">Datos Clave</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {selectedDoc.analysis_result.key_data.dates?.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Fechas:</p>
                              <p>{selectedDoc.analysis_result.key_data.dates.join(', ')}</p>
                            </div>
                          )}
                          {selectedDoc.analysis_result.key_data.numbers?.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Números:</p>
                              <p>{selectedDoc.analysis_result.key_data.numbers.join(', ')}</p>
                            </div>
                          )}
                          {selectedDoc.analysis_result.key_data.entities?.length > 0 && (
                            <div>
                              <p className="text-muted-foreground">Entidades:</p>
                              <p>{selectedDoc.analysis_result.key_data.entities.join(', ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </MainLayout>
  );
}
