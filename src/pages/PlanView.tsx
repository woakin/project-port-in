import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { usePlan } from '@/hooks/usePlan';
import { 
  Loader2, 
  ArrowLeft, 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PlanView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPlan, loading } = usePlan();
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadPlan();
    }
  }, [id]);

  const loadPlan = async () => {
    if (!id) return;
    const data = await fetchPlan(id);
    setPlan(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'blocked': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'blocked': return <AlertCircle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!plan) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Card variant="content">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Plan no encontrado</h2>
              <Button onClick={() => navigate('/')}>Volver al Dashboard</Button>
            </div>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {plan.title}
              </h1>
              <p className="text-muted-foreground mb-4">{plan.description}</p>
              <div className="flex gap-2">
                <Badge variant={plan.status === 'active' ? 'success' : 'default'}>
                  {plan.status}
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
            </div>
          </div>
        </div>

        {/* Áreas del Plan */}
        <Accordion type="single" collapsible className="space-y-4">
          {plan.plan_areas?.map((area: any) => (
            <AccordionItem key={area.id} value={area.id}>
              <Card variant="content">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold">{area.name}</h3>
                      {area.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {area.description}
                        </p>
                      )}
                    </div>
                    {area.target_score && (
                      <Badge variant="default">
                        Objetivo: {area.target_score}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {area.plan_objectives?.map((objective: any) => (
                      <Card key={objective.id} variant="service" className="ml-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">
                              {objective.title}
                            </h4>
                            {objective.description && (
                              <p className="text-sm text-muted-foreground">
                                {objective.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={getPriorityColor(objective.priority)}>
                            {objective.priority}
                          </Badge>
                        </div>

                        {/* Tareas */}
                        <div className="space-y-2 mt-4">
                          {objective.tasks?.map((task: any) => (
                            <div 
                              key={task.id}
                              className="flex items-start gap-3 p-3 rounded-md bg-background/50 border border-border"
                            >
                              <div className="mt-1">
                                {getStatusIcon(task.status)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{task.title}</p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                  <Badge 
                                    variant={getStatusColor(task.status)}
                                    className="ml-2"
                                  >
                                    {task.status}
                                  </Badge>
                                </div>

                                {task.task_kpis && task.task_kpis.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {task.task_kpis.map((kpi: any) => (
                                      <Badge key={kpi.id} variant="default" className="text-xs">
                                        {kpi.name}: {kpi.target_value}{kpi.unit}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {task.estimated_effort && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Esfuerzo estimado: {task.estimated_effort} días
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MainLayout>
  );
}
