import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePlan } from '@/hooks/usePlan';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

interface AreaInsights {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

interface DiagnosisData {
  id: string;
  strategy_score: number;
  operations_score: number;
  finance_score: number;
  marketing_score: number;
  legal_score: number;
  technology_score: number;
  insights: {
    strategy: AreaInsights;
    operations: AreaInsights;
    finance: AreaInsights;
    marketing: AreaInsights;
    legal: AreaInsights;
    technology: AreaInsights;
  };
  maturity_level: string;
  created_at: string;
  companies: {
    name: string;
    industry: string;
  };
}

export default function DiagnosisResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingPlan, setExistingPlan] = useState<any>(null);
  const { generatePlan, loading: generatingPlan } = usePlan();

  useEffect(() => {
    checkAuthAndFetch();
  }, [id]);

  const checkAuthAndFetch = async () => {
    // Verificar autenticación primero
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: 'Sesión requerida',
        description: 'Debes iniciar sesión para ver el diagnóstico',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }
    fetchDiagnosis();
  };

  const fetchDiagnosis = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select(`
          *,
          companies (
            name,
            industry
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching diagnosis:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Diagnóstico no encontrado');
      }

      setDiagnosis(data as any);

      // Verificar si ya existe un plan para este diagnóstico
      const { data: planData, error: planError } = await supabase
        .from('action_plans')
        .select('id')
        .eq('diagnosis_id', id)
        .maybeSingle();

      if (!planError && planData) {
        setExistingPlan(planData);
      }
    } catch (error) {
      console.error('Error fetching diagnosis:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el diagnóstico',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!id) return;

    const result = await generatePlan({
      diagnosisId: id,
      timeHorizon: 6,
      complexityLevel: 'medium'
    });

    if (result) {
      // Navegar al plan usando el ID correcto
      navigate(`/plans/${result.id}`);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando diagnóstico...</div>
        </div>
      </MainLayout>
    );
  }

  if (!diagnosis) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-muted-foreground">Diagnóstico no encontrado</div>
          <Button onClick={() => navigate('/')}>Volver al dashboard</Button>
        </div>
      </MainLayout>
    );
  }

  // Preparar datos para el radar chart
  const radarData = [
    {
      area: 'Estrategia',
      value: diagnosis.strategy_score,
      fullMark: 100,
    },
    {
      area: 'Operaciones',
      value: diagnosis.operations_score,
      fullMark: 100,
    },
    {
      area: 'Finanzas',
      value: diagnosis.finance_score,
      fullMark: 100,
    },
    {
      area: 'Marketing',
      value: diagnosis.marketing_score,
      fullMark: 100,
    },
    {
      area: 'Legal',
      value: diagnosis.legal_score,
      fullMark: 100,
    },
    {
      area: 'Tecnología',
      value: diagnosis.technology_score,
      fullMark: 100,
    },
  ];

  // Calcular promedio
  const avgScore = Math.round(
    (diagnosis.strategy_score +
      diagnosis.operations_score +
      diagnosis.finance_score +
      diagnosis.marketing_score +
      diagnosis.legal_score +
      diagnosis.technology_score) / 6
  );

  // Determinar color según score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-color-success-default';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-color-warning-default';
    return 'text-color-error-default';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="success">Excelente</Badge>;
    if (score >= 60) return <Badge variant="default">Bueno</Badge>;
    if (score >= 40) return <Badge variant="warning">Medio</Badge>;
    return <Badge variant="error">Necesita mejora</Badge>;
  };

  // Extraer insights clave (mejores fortalezas y recomendaciones principales)
  const getKeyInsights = () => {
    const insights: string[] = [];
    const areas = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'] as const;
    
    areas.forEach(area => {
      const areaInsights = diagnosis.insights?.[area];
      if (areaInsights) {
        // Agregar la primera fortaleza si existe
        if (areaInsights.strengths?.[0]) {
          insights.push(`✓ ${area.charAt(0).toUpperCase() + area.slice(1)}: ${areaInsights.strengths[0]}`);
        }
        // Agregar la primera recomendación si existe
        if (areaInsights.recommendations?.[0] && insights.length < 6) {
          insights.push(`→ ${area.charAt(0).toUpperCase() + area.slice(1)}: ${areaInsights.recommendations[0]}`);
        }
      }
    });
    
    return insights.slice(0, 5); // Limitar a 5 insights principales
  };

  // Determinar el tipo de insight basado en el contenido semántico
  const getInsightType = (insight: string): 'strength' | 'recommendation' | 'neutral' => {
    const lowerInsight = insight.toLowerCase();
    
    // Detectar mensajes neutrales/negativos (ausencia de fortalezas)
    if (lowerInsight.includes('no se ha discutido') || 
        lowerInsight.includes('no hay fortalezas') ||
        lowerInsight.includes('no hay información') ||
        lowerInsight.includes('no detectadas') ||
        lowerInsight.includes('no se detectaron') ||
        lowerInsight.includes('sin información')) {
      return 'neutral';
    }
    
    // Si empieza con ✓ y no es neutral, es una fortaleza
    if (insight.startsWith('✓')) {
      return 'strength';
    }
    
    // Si empieza con → es una recomendación
    if (insight.startsWith('→')) {
      return 'recommendation';
    }
    
    return 'neutral';
  };

  // Identificar áreas críticas (score < 40)
  const getCriticalAreas = () => {
    const critical: Array<{ name: string; score: number }> = [];
    const areaMap = {
      strategy: { name: 'Estrategia', score: diagnosis.strategy_score },
      operations: { name: 'Operaciones', score: diagnosis.operations_score },
      finance: { name: 'Finanzas', score: diagnosis.finance_score },
      marketing: { name: 'Marketing', score: diagnosis.marketing_score },
      legal: { name: 'Legal', score: diagnosis.legal_score },
      technology: { name: 'Tecnología', score: diagnosis.technology_score }
    };

    Object.entries(areaMap).forEach(([key, value]) => {
      if (value.score < 40) {
        critical.push(value);
      }
    });

    return critical.sort((a, b) => a.score - b.score);
  };

  const keyInsights = getKeyInsights();
  const criticalAreas = getCriticalAreas();

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable space-y-comfortable">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Diagnóstico: {diagnosis.companies?.name ?? 'Empresa'}
          </h1>
          <p className="text-muted-foreground">
            {(diagnosis.companies?.industry ?? 'Industria')} • {diagnosis.maturity_level ?? ''}
          </p>
        </div>

        {/* Score general */}
        <Card variant="content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Puntuación General
              </h3>
              <p className="text-muted-foreground">
                Nivel de madurez empresarial
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore}
              </div>
              {getScoreBadge(avgScore)}
            </div>
          </div>
        </Card>

        {/* Radar Chart */}
        <Card variant="content">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Perfil de Madurez Empresarial
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey="area" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Radar
                name="Puntuación"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Scores por área */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-standard">
          {radarData.map((item) => (
            <Card key={item.area} variant="service">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground">{item.area}</h4>
                {getScoreBadge(item.value)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${getScoreColor(item.value)}`}>
                  {item.value}
                </span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Insights */}
        {keyInsights.length > 0 && (
          <Card variant="content">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Insights Clave
            </h3>
            <div className="space-y-3">
              {keyInsights.map((insight, index) => {
                const type = getInsightType(insight);
                
                return (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-4 bg-muted rounded-md"
                  >
                    {type === 'strength' && (
                      <TrendingUp className="h-5 w-5 text-color-success-default flex-shrink-0 mt-0.5" />
                    )}
                    {type === 'recommendation' && (
                      <ArrowRight className="h-5 w-5 text-color-warning-default flex-shrink-0 mt-0.5" />
                    )}
                    {type === 'neutral' && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-foreground">{insight}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Áreas críticas */}
        {criticalAreas.length > 0 && (
          <Card variant="content">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Áreas que Requieren Atención
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {criticalAreas.map((area) => (
                <div key={area.name} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="font-medium text-foreground">{area.name}</span>
                  <Badge variant="error">{area.score}/100</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CTA */}
        <Card variant="content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {existingPlan ? 'Plan de Acción' : '¿Listo para mejorar?'}
              </h3>
              <p className="text-muted-foreground">
                {existingPlan 
                  ? 'Revisa tu plan de acción y las tareas pendientes'
                  : 'Genera un plan de acción personalizado basado en este diagnóstico'}
              </p>
            </div>
            {existingPlan ? (
              <Button onClick={() => navigate(`/plans/${existingPlan.id}`)}>
                Ver Plan de Acción
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleGeneratePlan} disabled={generatingPlan}>
                {generatingPlan ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    Crear Plan de Acción
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
