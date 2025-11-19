import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Plan {
  id: string;
  title: string;
  description: string;
  status: string;
  version: string;
  time_horizon: number;
  created_at: string;
  updated_at: string;
}

export default function Plans() {
  const navigate = useNavigate();
  const { loading } = usePlan();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('action_plans')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'warning';
      case 'completed': return 'default';
      case 'archived': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'draft': return 'Borrador';
      case 'completed': return 'Completado';
      case 'archived': return 'Archivado';
      default: return status;
    }
  };

  if (loadingPlans) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Planes de Acción
          </h1>
          <p className="text-muted-foreground">
            Gestiona y revisa todos tus planes estratégicos
          </p>
        </div>

        {/* Lista de planes */}
        {plans.length === 0 ? (
          <Card variant="content">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No hay planes creados
              </h3>
              <p className="text-muted-foreground mb-6">
                Comienza creando un diagnóstico para generar tu primer plan de acción
              </p>
              <Button onClick={() => navigate('/chat-diagnosis')}>
                Crear Diagnóstico
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className="cursor-pointer"
                onClick={() => navigate(`/plans/${plan.id}`)}
              >
                <Card 
                  variant="service"
                  className="hover:shadow-lg transition-shadow h-full"
                >
                  {/* Header del card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                        {plan.title}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={getStatusColor(plan.status)}>
                      {getStatusLabel(plan.status)}
                    </Badge>
                    <Badge variant="default">
                      v{plan.version}
                    </Badge>
                    {plan.time_horizon && (
                      <Badge variant="default">
                        {plan.time_horizon} meses
                      </Badge>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Creado: {format(new Date(plan.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        Actualizado: {format(new Date(plan.updated_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/plans/${plan.id}`);
                    }}
                  >
                    Ver Detalles
                  </Button>
                </Card>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
