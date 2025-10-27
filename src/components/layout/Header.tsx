import { Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-standard">
      <div className="flex items-center gap-comfortable">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-sm">CI</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Consultoría Inteligente</h1>
        </div>
      </div>

      {user && (
        <nav className="flex items-center gap-8">
          <a href="/" className="text-base text-foreground hover:text-primary transition-colors">
            Dashboard
          </a>
          <a href="#" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            Diagnóstico
          </a>
          <a href="#" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            Planes
          </a>
          <a href="#" className="text-base text-muted-foreground hover:text-foreground transition-colors">
            Documentos
          </a>
        </nav>
      )}

      <div className="flex items-center gap-4">
        {!loading && user ? (
          <>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="ml-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : !loading && !user ? (
          <Button onClick={() => navigate('/auth')}>
            Iniciar Sesión
          </Button>
        ) : null}
      </div>
    </header>
  );
}
