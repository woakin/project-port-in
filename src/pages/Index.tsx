import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [latestDiagnosis, setLatestDiagnosis] = useState<any>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(true);

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    const fetchLatestDiagnosis = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setLatestDiagnosis(data);
        }
      } catch (error) {
        console.error('Error fetching diagnosis:', error);
      } finally {
        setLoadingDiagnosis(false);
      }
    };

    fetchLatestDiagnosis();
  }, [user]);

  if (loading || loadingDiagnosis) {
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
              {latestDiagnosis ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">Último Diagnóstico</h3>
                    <Badge variant="default">Completado</Badge>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Estrategia</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.strategy_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Operaciones</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.operations_score}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Finanzas</p>
                        <p className="text-lg font-semibold text-foreground">{latestDiagnosis.finance_score}%</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nivel de madurez: <span className="font-medium text-foreground capitalize">{latestDiagnosis.maturity_level}</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => navigate(`/diagnosis/${latestDiagnosis.id}`)}
                      variant="default"
                    >
                      Ver Diagnóstico Completo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => navigate('/chat-diagnosis')}
                      variant="outline"
                    >
                      Nuevo Diagnóstico
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">Plan de Acción Activo</h3>
                    <Badge variant="default">En progreso</Badge>
                  </div>
                  <p className="text-base text-muted-foreground">
                    Aún no tienes un plan de acción activo. Comienza realizando un diagnóstico de tu negocio.
                  </p>
                  <Button 
                    onClick={() => navigate('/chat-diagnosis')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit"
                  >
                    Iniciar Diagnóstico
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
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
