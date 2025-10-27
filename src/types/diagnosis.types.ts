export interface Diagnosis {
  id: string;
  company_id: string;
  user_id: string;
  version: number;
  strategy_score: number;
  operations_score: number;
  finance_score: number;
  marketing_score: number;
  legal_score: number;
  technology_score: number;
  form_responses: Record<string, any>;
  maturity_level: 'idea' | 'startup' | 'pyme' | 'corporate';
  insights: {
    insights: string[];
    critical_areas: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface DiagnosisFormData {
  companyName: string;
  industry: string;
  companySize: 'idea' | 'startup' | 'pyme' | 'corporate';
  responses: {
    strategy: string;
    operations: string;
    finance: string;
    marketing: string;
    legal: string;
    technology: string;
  };
}
