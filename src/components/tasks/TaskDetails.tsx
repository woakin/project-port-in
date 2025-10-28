import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";

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
  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.start_date ? new Date(task.start_date) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.due_date ? new Date(task.due_date) : undefined
  );
  const [updatingDates, setUpdatingDates] = useState(false);

  useEffect(() => {
    if (task && open) {
      fetchComments();
      fetchAttachments();
      // Update dates when task changes
      setStartDate(task.start_date ? new Date(task.start_date) : undefined);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
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

  const handleUpdateDates = async () => {
    if (!task) return;

    setUpdatingDates(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) throw error;

      toast.success('Fechas actualizadas correctamente');
      onOpenChange(false);
      
      // Reload to update views
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error updating dates:', error);
      toast.error('Error al actualizar las fechas');
    } finally {
      setUpdatingDates(false);
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

          {/* Fechas editables */}
          <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-sm">Fechas de la tarea</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs">Fecha de inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs h-9",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {startDate ? format(startDate, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-xs">Fecha de entrega</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="due-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-xs h-9",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-3 w-3" />
                      {dueDate ? format(dueDate, "d MMM yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                      className={cn("p-3 pointer-events-auto")}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <Button 
              onClick={handleUpdateDates} 
              disabled={updatingDates || (!startDate && !dueDate)}
              size="sm"
              className="w-full"
            >
              {updatingDates ? 'Guardando...' : 'Guardar Fechas'}
            </Button>
          </div>

          {/* Otros detalles */}
          {(task.estimated_effort || task.depends_on) && (
            <div className="grid grid-cols-2 gap-4">
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
          )}

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
