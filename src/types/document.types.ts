export interface Document {
  id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_result: DocumentAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentAnalysis {
  category: string;
  summary: string;
  key_data: {
    dates: string[];
    numbers: string[];
    entities: string[];
  };
  insights: string[];
  suggested_kpis?: Array<{
    name: string;
    current_value: number;
    target_value: number;
    unit: string;
    area: string;
  }>;
}
