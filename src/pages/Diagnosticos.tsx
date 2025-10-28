import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus, Calendar, TrendingUp } from 'lucide-react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Diagnosis } from '@/types/diagnosis.types';

export default function Diagnosticos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentProject, loading: projectLoading } = useProjectContext();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject?.id) {
      fetchDiagnoses();
    }
  }, [currentProject?.id]);

  const fetchDiagnoses = async () => {
    if (!currentProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiagnoses((data || []) as any);
    } catch (error) {
      console.error('Error fetching diagnoses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAverageScore = (diagnosis: Diagnosis) => {
    const scores = [
      diagnosis.strategy_score,
      diagnosis.operations_score,
      diagnosis.finance_score,
      diagnosis.marketing_score,
      diagnosis.legal_score,
      diagnosis.technology_score,
    ];
    const validScores = scores.filter((s) => s !== null && s !== undefined) as number[];
    return validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;
  };

  const getMaturityLabel = (level: string) => {
    const labels: Record<string, string> = {
      idea: 'Idea',
      startup: 'Startup',
      pyme: 'PyME',
      corporate: 'Corporativo',
    };
    return labels[level] || level;
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading || projectLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando diagnósticos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Diagnósticos</h1>
            <p className="text-muted-foreground mt-2">
              {currentProject ? (
                <>Diagnósticos del proyecto: <span className="font-semibold">{currentProject.name}</span></>
              ) : (
                'Todos los diagnósticos'
              )}
            </p>
          </div>
          <Button onClick={() => navigate('/chat-diagnosis')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Diagnóstico
          </Button>
        </div>

        {diagnoses.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay diagnósticos</h3>
            <p className="text-muted-foreground mb-6">
              {currentProject
                ? `El proyecto "${currentProject.name}" aún no tiene diagnósticos`
                : 'Comienza creando tu primer diagnóstico'}
            </p>
            <Button onClick={() => navigate('/chat-diagnosis')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Diagnóstico
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagnoses.map((diagnosis) => {
              const avgScore = getAverageScore(diagnosis);
              return (
                <Card
                  key={diagnosis.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/diagnosis/${diagnosis.id}`)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">
                          Versión {diagnosis.version}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {getMaturityLabel(diagnosis.maturity_level || '')}
                      </Badge>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Puntuación General</span>
                        <span className="text-2xl font-bold text-primary">{avgScore}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${avgScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Estrategia</span>
                        <span className="font-semibold">{diagnosis.strategy_score || 0}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Operaciones</span>
                        <span className="font-semibold">{diagnosis.operations_score || 0}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Finanzas</span>
                        <span className="font-semibold">{diagnosis.finance_score || 0}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Marketing</span>
                        <span className="font-semibold">{diagnosis.marketing_score || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(diagnosis.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <Button className="w-full" variant="outline">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Ver Resultados
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
