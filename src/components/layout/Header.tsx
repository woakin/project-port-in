import { LogOut, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { NotificationPopover } from "@/components/layout/NotificationPopover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/shared/Badge";

export function Header() {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-end px-6 gap-3">
          {!loading && user ? (
            <>
              <ProjectSelector />
              
              {/* Global Search Hint */}
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => {
                      const event = new KeyboardEvent('keydown', { 
                        key: 'k', 
                        metaKey: true, 
                        ctrlKey: true 
                      });
                      document.dispatchEvent(event);
                    }}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer border border-border/50"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Buscar</span>
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                      {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Búsqueda global rápida</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Notifications Bell */}
              <NotificationPopover />

              {/* Admin Link with Tooltip */}
              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                      Admin
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Panel de administración</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* User Info with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 cursor-default">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground max-w-[150px] truncate">{user.email}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Usuario actual</p>
                </TooltipContent>
              </Tooltip>

              {/* Logout Button with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar sesión</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            !loading && (
              <Button size="sm" onClick={() => navigate("/auth")}>
                Iniciar sesión
              </Button>
            )
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
