export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      action_plans: {
        Row: {
          company_id: string
          complexity_level: string | null
          created_at: string | null
          description: string | null
          diagnosis_id: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          status: string | null
          time_horizon: number | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          company_id: string
          complexity_level?: string | null
          created_at?: string | null
          description?: string | null
          diagnosis_id?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          status?: string | null
          time_horizon?: number | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          company_id?: string
          complexity_level?: string | null
          created_at?: string | null
          description?: string | null
          diagnosis_id?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          status?: string | null
          time_horizon?: number | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          industry: string | null
          name: string
          size: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          company_id: string
          created_at: string | null
          finance_score: number | null
          form_responses: Json | null
          id: string
          insights: Json | null
          legal_score: number | null
          marketing_score: number | null
          maturity_level: string | null
          operations_score: number | null
          project_id: string | null
          strategy_score: number | null
          technology_score: number | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          finance_score?: number | null
          form_responses?: Json | null
          id?: string
          insights?: Json | null
          legal_score?: number | null
          marketing_score?: number | null
          maturity_level?: string | null
          operations_score?: number | null
          project_id?: string | null
          strategy_score?: number | null
          technology_score?: number | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          finance_score?: number | null
          form_responses?: Json | null
          id?: string
          insights?: Json | null
          legal_score?: number | null
          marketing_score?: number | null
          maturity_level?: string | null
          operations_score?: number | null
          project_id?: string | null
          strategy_score?: number | null
          technology_score?: number | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_alerts: {
        Row: {
          condition: string
          created_at: string
          id: string
          is_active: boolean
          kpi_id: string
          last_triggered_at: string | null
          notification_channel: string
          threshold: number
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          kpi_id: string
          last_triggered_at?: string | null
          notification_channel: string
          threshold: number
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kpi_id?: string
          last_triggered_at?: string | null
          notification_channel?: string
          threshold?: number
          user_id?: string
        }
        Relationships: []
      }
      kpis: {
        Row: {
          area: string
          company_id: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          period_end: string
          period_start: string
          source: string
          target_value: number | null
          unit: string | null
          value: number
        }
        Insert: {
          area: string
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          period_end: string
          period_start: string
          source: string
          target_value?: number | null
          unit?: string | null
          value: number
        }
        Update: {
          area?: string
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          period_end?: string
          period_start?: string
          source?: string
          target_value?: number | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      plan_areas: {
        Row: {
          description: string | null
          id: string
          name: string
          order_index: number | null
          plan_id: string
          target_score: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          plan_id: string
          target_score?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          plan_id?: string
          target_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_areas_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_objectives: {
        Row: {
          area_id: string
          description: string | null
          id: string
          order_index: number | null
          priority: string | null
          title: string
        }
        Insert: {
          area_id: string
          description?: string | null
          id?: string
          order_index?: number | null
          priority?: string | null
          title: string
        }
        Update: {
          area_id?: string
          description?: string | null
          id?: string
          order_index?: number | null
          priority?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_objectives_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "plan_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          metadata: Json | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      task_kpis: {
        Row: {
          current_value: number | null
          id: string
          name: string
          target_value: number | null
          task_id: string
          unit: string | null
        }
        Insert: {
          current_value?: number | null
          id?: string
          name: string
          target_value?: number | null
          task_id: string
          unit?: string | null
        }
        Update: {
          current_value?: number | null
          id?: string
          name?: string
          target_value?: number | null
          task_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_kpis_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          depends_on: string | null
          description: string | null
          due_date: string | null
          estimated_effort: number | null
          id: string
          metadata: Json | null
          objective_id: string
          priority: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_effort?: number | null
          id?: string
          metadata?: Json | null
          objective_id: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_effort?: number | null
          id?: string
          metadata?: Json | null
          objective_id?: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "plan_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "team_member" | "external_consultant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "team_member", "external_consultant"],
    },
  },
} as const
