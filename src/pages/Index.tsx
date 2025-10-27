import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable">
        <div className="mb-comfortable">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Dashboard</h2>
          <p className="text-base text-muted-foreground">
            Resumen de tu progreso y métricas principales
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-standard mb-comfortable">
          <KPICard title="Progreso General" value="45" change={12} unit="%" />
          <KPICard title="Tareas Completadas" value="12" change={5} unit="de 27" />
          <KPICard title="KPIs en Meta" value="8" change={-3} unit="de 15" />
          <KPICard title="Días Activos" value="23" unit="días" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-standard">
          <div className="lg:col-span-2">
            <Card variant="content">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Plan de Acción Activo</h3>
                <Badge variant="default">En progreso</Badge>
              </div>
              <p className="text-base text-muted-foreground">
                Aún no tienes un plan de acción activo. Comienza realizando un diagnóstico de tu negocio.
              </p>
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit"
                onClick={() => window.location.href = '/onboarding'}
              >
                Iniciar Diagnóstico
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>

          <Card variant="service">
            <h3 className="text-base font-semibold text-foreground">Próximas Tareas</h3>
            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                No hay tareas pendientes
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
