import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/ui/button';
import { FileSearch, ExternalLink, Loader2 } from 'lucide-react';

type Diagnosis = {
  id: string;
  version: number;
  maturity_level: string;
  created_at: string;
  strategy_score?: number;
  operations_score?: number;
  finance_score?: number;
  marketing_score?: number;
  technology_score?: number;
  legal_score?: number;
};

export default function DiagnosesSheet() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDiagnoses();
  }, [user]);

  const fetchDiagnoses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Get diagnoses
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDiagnoses((data || []) as Diagnosis[]);
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
      diagnosis.technology_score,
      diagnosis.legal_score
    ].filter(score => score !== null && score !== undefined) as number[];

    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'default';
    if (score >= 80) return 'success';
    if (score >= 60) return 'default';
    if (score >= 40) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (diagnoses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay diagnósticos generados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {diagnoses.map((diagnosis) => {
        const avgScore = getAverageScore(diagnosis);

        return (
          <Card key={diagnosis.id} variant="content" className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground">
                    Diagnóstico v{diagnosis.version}
                  </h4>
                  {avgScore !== null && (
                    <Badge variant={getScoreColor(avgScore)}>
                      {avgScore}/100
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(diagnosis.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/diagnosis/${diagnosis.id}`)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {diagnosis.maturity_level && (
              <div className="mb-3">
                <Badge variant="default">{diagnosis.maturity_level}</Badge>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {diagnosis.strategy_score !== null && diagnosis.strategy_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Estrategia</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.strategy_score}/100
                  </div>
                </div>
              )}
              {diagnosis.operations_score !== null && diagnosis.operations_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Operaciones</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.operations_score}/100
                  </div>
                </div>
              )}
              {diagnosis.finance_score !== null && diagnosis.finance_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Finanzas</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.finance_score}/100
                  </div>
                </div>
              )}
              {diagnosis.marketing_score !== null && diagnosis.marketing_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Marketing</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.marketing_score}/100
                  </div>
                </div>
              )}
              {diagnosis.technology_score !== null && diagnosis.technology_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Tecnología</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.technology_score}/100
                  </div>
                </div>
              )}
              {diagnosis.legal_score !== null && diagnosis.legal_score !== undefined && (
                <div className="bg-muted/50 rounded p-2">
                  <div className="text-xs text-muted-foreground mb-1">Legal</div>
                  <div className="font-semibold text-sm text-foreground">
                    {diagnosis.legal_score}/100
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
