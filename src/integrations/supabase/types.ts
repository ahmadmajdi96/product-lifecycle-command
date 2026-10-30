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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit: {
        Row: {
          action: string
          actor: string
          actor_id: string | null
          at: string
          detail: string | null
          entity: string
          id: string
          signature: string | null
        }
        Insert: {
          action: string
          actor: string
          actor_id?: string | null
          at?: string
          detail?: string | null
          entity: string
          id?: string
          signature?: string | null
        }
        Update: {
          action?: string
          actor?: string
          actor_id?: string | null
          at?: string
          detail?: string | null
          entity?: string
          id?: string
          signature?: string | null
        }
        Relationships: []
      }
      boms: {
        Row: {
          id: string
          kind: string
          lines: Json
          rev: string
          root: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          kind: string
          lines?: Json
          rev: string
          root: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: string
          lines?: Json
          rev?: string
          root?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      changes: {
        Row: {
          affected: Json
          approvals: Json
          category: string | null
          created_at: string
          disposition: string
          id: string
          kind: string
          number: string
          origin: string | null
          parent: string | null
          priority: string
          problem: string | null
          solution: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected?: Json
          approvals?: Json
          category?: string | null
          created_at?: string
          disposition: string
          id?: string
          kind: string
          number: string
          origin?: string | null
          parent?: string | null
          priority: string
          problem?: string | null
          solution?: string | null
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          affected?: Json
          approvals?: Json
          category?: string | null
          created_at?: string
          disposition?: string
          id?: string
          kind?: string
          number?: string
          origin?: string | null
          parent?: string | null
          priority?: string
          problem?: string | null
          solution?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      docs: {
        Row: {
          checked_out_by: string | null
          id: string
          kind: string
          linked_item: string | null
          number: string
          rev: string
          size_kb: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          checked_out_by?: string | null
          id?: string
          kind: string
          linked_item?: string | null
          number: string
          rev?: string
          size_kb?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          checked_out_by?: string | null
          id?: string
          kind?: string
          linked_item?: string | null
          number?: string
          rev?: string
          size_kb?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          on_hand: number
        }
        Insert: {
          id: string
          on_hand?: number
        }
        Update: {
          id?: string
          on_hand?: number
        }
        Relationships: []
      }
      items: {
        Row: {
          cost: number
          ctq: string | null
          effective_from: string
          effective_to: string | null
          id: string
          name: string
          number: string
          owner: string | null
          rev: string
          status: string
          type: string
          uom: string
          updated_at: string
        }
        Insert: {
          cost?: number
          ctq?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name: string
          number: string
          owner?: string | null
          rev?: string
          status?: string
          type: string
          uom?: string
          updated_at?: string
        }
        Update: {
          cost?: number
          ctq?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          name?: string
          number?: string
          owner?: string | null
          rev?: string
          status?: string
          type?: string
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      routings: {
        Row: {
          id: string
          item: string
          kind: string
          number: string
          ops: Json
          rev: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          item: string
          kind: string
          number: string
          ops?: Json
          rev: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item?: string
          kind?: string
          number?: string
          ops?: Json
          rev?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      syncs: {
        Row: {
          at: string
          entity: string
          id: string
          payload: string
          status: string
          target: string
        }
        Insert: {
          at?: string
          entity: string
          id?: string
          payload: string
          status: string
          target: string
        }
        Update: {
          at?: string
          entity?: string
          id?: string
          payload?: string
          status?: string
          target?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_centers: {
        Row: {
          area: string | null
          capacity_hrs: number | null
          code: string
          id: string
          name: string
          status: string
        }
        Insert: {
          area?: string | null
          capacity_hrs?: number | null
          code: string
          id: string
          name: string
          status?: string
        }
        Update: {
          area?: string | null
          capacity_hrs?: number | null
          code?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          done: number
          id: string
          item: string
          line: string | null
          qty: number
          wo: string
        }
        Insert: {
          done?: number
          id: string
          item: string
          line?: string | null
          qty: number
          wo: string
        }
        Update: {
          done?: number
          id?: string
          item?: string
          line?: string | null
          qty?: number
          wo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "engineer" | "quality" | "manufacturing" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "engineer", "quality", "manufacturing", "viewer"],
    },
  },
} as const
