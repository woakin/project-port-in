import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationPopover() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Cargando notificaciones...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notif.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-sm">{notif.title}</div>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{notif.message}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notif.created_at), { 
                        addSuffix: true,
                        locale: es 
                      })}
                    </div>
                    {notif.priority === 'high' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                        Alta prioridad
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
