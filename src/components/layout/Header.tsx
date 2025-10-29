import { Bell, LogOut, User, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Link, useNavigate } from "react-router-dom";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import alashaLogo from "@/assets/alasha-logo.png";

export function Header() {
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md">
            <img src={alashaLogo} alt="Alasha AI Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground leading-none tracking-tight">Alasha AI</h1>
            <span className="text-xs text-muted-foreground">Inteligencia Empresarial</span>
          </div>
        </div>

        {user && (
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link to="/kpis" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              KPIs
            </Link>
            <Link to="/tasks" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Tareas
            </Link>
            <Link to="/documents" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Documentos
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <ProjectSelector />
              
              <Link to="/chat-diagnosis">
                <Button variant="gradient" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Asistente IA
                </Button>
              </Link>
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground max-w-[150px] truncate">{user.email}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon" title="Administración">
                    <Shield className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </>
          ) : !loading && !user ? (
            <Button onClick={() => navigate('/auth')} variant="gradient">
              Iniciar Sesión
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
