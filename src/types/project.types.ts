export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived' | 'completed';
  is_default: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
