import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';

interface DiagnosisData {
  id: string;
  strategy_score: number;
  operations_score: number;
  finance_score: number;
  marketing_score: number;
  legal_score: number;
  technology_score: number;
  insights: {
    insights: string[];
    critical_areas: string[];
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

  useEffect(() => {
    fetchDiagnosis();
  }, [id]);

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

      if (error) throw error;

      setDiagnosis(data as any);
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

  return (
    <MainLayout>
      <div className="container mx-auto p-comfortable space-y-comfortable">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Diagnóstico: {diagnosis.companies.name}
          </h1>
          <p className="text-muted-foreground">
            {diagnosis.companies.industry} • {diagnosis.maturity_level}
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
        <Card variant="content">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Insights Clave
          </h3>
          <div className="space-y-3">
            {diagnosis.insights.insights.map((insight, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 bg-muted rounded-md"
              >
                {index === 0 && <TrendingUp className="h-5 w-5 text-color-success-default flex-shrink-0 mt-0.5" />}
                {index > 0 && <TrendingDown className="h-5 w-5 text-color-warning-default flex-shrink-0 mt-0.5" />}
                <p className="text-foreground">{insight}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Áreas críticas */}
        <Card variant="content">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Áreas que Requieren Atención
          </h3>
          <div className="flex flex-wrap gap-2">
            {diagnosis.insights.critical_areas.map((area) => (
              <Badge key={area} variant="error">
                {area.charAt(0).toUpperCase() + area.slice(1)}
              </Badge>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card variant="content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                ¿Listo para mejorar?
              </h3>
              <p className="text-muted-foreground">
                Genera un plan de acción personalizado basado en este diagnóstico
              </p>
            </div>
            <Button>
              Crear Plan de Acción
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
