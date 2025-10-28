import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Task } from "@/types/task.types";
import { TaskComment, TaskAttachment } from "@/types/comment.types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  Paperclip,
  Send,
  X
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TaskDetailsProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetails({ task, open, onOpenChange }: TaskDetailsProps) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task && open) {
      fetchComments();
      fetchAttachments();
    }
  }, [task, open]);

  const fetchComments = async () => {
    if (!task) return;

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAttachments = async () => {
    if (!task) return;

    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      toast.success('Comentario agregado');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'default';
      case 'blocked': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'in_progress': 'En Curso',
      'completed': 'Completada',
      'blocked': 'Bloqueada'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <span className="flex-1">{task.title}</span>
            <div className="flex gap-2">
              {task.priority && (
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              )}
              <Badge variant={getStatusColor(task.status)}>
                {getStatusLabel(task.status)}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Descripción */}
          {task.description && (
            <div>
              <h4 className="font-medium mb-2">Descripción</h4>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          {/* Detalles */}
          <div className="grid grid-cols-2 gap-4">
            {task.start_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inicio:</span>
                <span>{format(new Date(task.start_date), "d 'de' MMMM", { locale: es })}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Entrega:</span>
                <span>{format(new Date(task.due_date), "d 'de' MMMM", { locale: es })}</span>
              </div>
            )}
            {task.estimated_effort && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Esfuerzo:</span>
                <span>{task.estimated_effort} días</span>
              </div>
            )}
            {task.depends_on && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-muted-foreground">Tiene dependencias</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Adjuntos */}
          {attachments.length > 0 && (
            <>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Archivos adjuntos ({attachments.length})
                </h4>
                <div className="space-y-2">
                  {attachments.map(attachment => (
                    <div 
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        <span>{attachment.file_name}</span>
                        {attachment.file_size && (
                          <span className="text-xs text-muted-foreground">
                            ({(attachment.file_size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                          Ver
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Comentarios */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios ({comments.length})
            </h4>
            
            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay comentarios todavía
                </p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Usuario</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "d MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Agregar comentario */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
                className="resize-none"
                rows={2}
              />
              <Button
                size="icon"
                onClick={handleAddComment}
                disabled={!newComment.trim() || loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
