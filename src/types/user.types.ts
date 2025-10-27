export type AppRole = 'admin' | 'manager' | 'team_member' | 'external_consultant';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: 'individual' | 'startup' | 'pyme' | 'corporate';
  created_at: string;
}
