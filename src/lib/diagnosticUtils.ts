import { Diagnosis } from "@/types/diagnosis.types";

export interface DiagnosticStatus {
  level: 'critical' | 'warning' | 'healthy';
  message: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  badgeColor: string;
}

export const calculateAverageScore = (diagnosis: Diagnosis): number => {
  return Math.round(
    (diagnosis.strategy_score + 
     diagnosis.operations_score + 
     diagnosis.finance_score + 
     diagnosis.marketing_score + 
     diagnosis.legal_score + 
     diagnosis.technology_score) / 6
  );
};

export const getDiagnosticStatus = (score: number): DiagnosticStatus => {
  if (score >= 75) {
    return {
      level: 'healthy',
      message: 'Tu negocio está en buen camino',
      color: 'green',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500',
      textColor: 'text-green-700 dark:text-green-400',
      iconColor: 'text-green-500',
      badgeColor: 'bg-green-500'
    };
  }
  
  if (score >= 50) {
    return {
      level: 'warning',
      message: 'Hay oportunidades de mejora importantes',
      color: 'yellow',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      iconColor: 'text-yellow-500',
      badgeColor: 'bg-yellow-500'
    };
  }
  
  return {
    level: 'critical',
    message: 'Tu negocio requiere atención inmediata en varias áreas',
    color: 'red',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    textColor: 'text-destructive',
    iconColor: 'text-destructive',
    badgeColor: 'bg-destructive'
  };
};

export const needsUpdate = (diagnosis: Diagnosis): boolean => {
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(diagnosis.updated_at || diagnosis.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceUpdate > 30;
};

export const getDaysSinceUpdate = (diagnosis: Diagnosis): number => {
  return Math.floor(
    (Date.now() - new Date(diagnosis.updated_at || diagnosis.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
};

export const getCriticalArea = (diagnosis: Diagnosis): { name: string; score: number } => {
  const areas = [
    { name: 'Estrategia', score: diagnosis.strategy_score },
    { name: 'Operaciones', score: diagnosis.operations_score },
    { name: 'Finanzas', score: diagnosis.finance_score },
    { name: 'Marketing', score: diagnosis.marketing_score },
    { name: 'Legal', score: diagnosis.legal_score },
    { name: 'Tecnología', score: diagnosis.technology_score }
  ];
  
  return areas.reduce((min, area) => area.score < min.score ? area : min);
};

export const getStrongestArea = (diagnosis: Diagnosis): { name: string; score: number } => {
  const areas = [
    { name: 'Estrategia', score: diagnosis.strategy_score },
    { name: 'Operaciones', score: diagnosis.operations_score },
    { name: 'Finanzas', score: diagnosis.finance_score },
    { name: 'Marketing', score: diagnosis.marketing_score },
    { name: 'Legal', score: diagnosis.legal_score },
    { name: 'Tecnología', score: diagnosis.technology_score }
  ];
  
  return areas.reduce((max, area) => area.score > max.score ? area : max);
};
