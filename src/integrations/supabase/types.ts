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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklist_items: {
        Row: {
          description: string | null
          id: number
          name: string
          order_idx: number
          reference_correct_path: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
          order_idx: number
          reference_correct_path?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          order_idx?: number
          reference_correct_path?: string | null
        }
        Relationships: []
      }
      checklist_runs: {
        Row: {
          finished_at: string | null
          id: string
          machine_id: string
          operator_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          machine_id: string
          operator_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          machine_id?: string
          operator_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "user_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_runs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          created_at: string | null
          from_user: string | null
          id: string
          kind: string
          payload: string
          run_id: string | null
          to_user: string | null
        }
        Insert: {
          created_at?: string | null
          from_user?: string | null
          id?: string
          kind: string
          payload: string
          run_id?: string | null
          to_user?: string | null
        }
        Update: {
          created_at?: string | null
          from_user?: string | null
          id?: string
          kind?: string
          payload?: string
          run_id?: string | null
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "user_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "user_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      item_responses: {
        Row: {
          answered_at: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          item_id: number
          observation: string | null
          photo_path: string
          run_id: string
          status: string
          validated_at: string | null
          validated_by: string | null
          validation_note: string | null
          validation_status: string | null
        }
        Insert: {
          answered_at?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          item_id: number
          observation?: string | null
          photo_path?: string
          run_id: string
          status: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
        }
        Update: {
          answered_at?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          item_id?: number
          observation?: string | null
          photo_path?: string
          run_id?: string
          status?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_responses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_responses_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_responses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "user_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_responses_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lubrication_counters: {
        Row: {
          hours_since_last: number
          last_lubricated_at: string | null
          machine_id: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          hours_since_last?: number
          last_lubricated_at?: string | null
          machine_id: string
          threshold?: number
          updated_at?: string | null
        }
        Update: {
          hours_since_last?: number
          last_lubricated_at?: string | null
          machine_id?: string
          threshold?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lubrication_counters_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: true
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_reference_photos: {
        Row: {
          item_id: number
          machine_id: string
          path: string
          updated_at: string
        }
        Insert: {
          item_id: number
          machine_id: string
          path: string
          updated_at?: string
        }
        Update: {
          item_id?: number
          machine_id?: string
          path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machine_reference_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "machine_reference_photos_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          model: string
          serial: string
          specs: Json | null
          status: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          model: string
          serial: string
          specs?: Json | null
          status?: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          model?: string
          serial?: string
          specs?: Json | null
          status?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      morning_dispatches: {
        Row: {
          dispatched_at: string
          dispatched_on: string
          user_id: string
        }
        Insert: {
          dispatched_at?: string
          dispatched_on: string
          user_id: string
        }
        Update: {
          dispatched_at?: string
          dispatched_on?: string
          user_id?: string
        }
        Relationships: []
      }
      refusals: {
        Row: {
          created_at: string | null
          id: string
          justification: string
          reason_category: string | null
          run_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          justification: string
          reason_category?: string | null
          run_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          justification?: string
          reason_category?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refusals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          morning_enabled: boolean
          morning_time: string
          name: string
          phone: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          morning_enabled?: boolean
          morning_time?: string
          name: string
          phone: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          morning_enabled?: boolean
          morning_time?: string
          name?: string
          phone?: string
          role?: string
        }
        Relationships: []
      }
      wa_processed: {
        Row: {
          message_id: string
          processed_at: string
        }
        Insert: {
          message_id: string
          processed_at?: string
        }
        Update: {
          message_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error: string | null
          external_id: string | null
          id: string
          message_type: string
          phone: string
          raw_payload: Json | null
          status: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: string
          error?: string | null
          external_id?: string | null
          id?: string
          message_type?: string
          phone: string
          raw_payload?: Json | null
          status?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          external_id?: string | null
          id?: string
          message_type?: string
          phone?: string
          raw_payload?: Json | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_public_info: {
        Row: {
          id: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _normalize_phone: { Args: { _phone: string }; Returns: string }
      _validate_admin: { Args: never; Returns: undefined }
      add_checklist_item: {
        Args: { _description: string; _name: string }
        Returns: number
      }
      admin_create_user: {
        Args: {
          _morning_enabled?: boolean
          _morning_time?: string
          _name: string
          _phone: string
          _role: string
        }
        Returns: string
      }
      admin_delete_user: { Args: { _id: string }; Returns: undefined }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          id: string
          morning_enabled: boolean
          morning_time: string
          name: string
          phone: string
          role: string
        }[]
      }
      admin_update_user: {
        Args: {
          _id: string
          _morning_enabled: boolean
          _morning_time: string
          _name: string
          _phone: string
          _role: string
        }
        Returns: undefined
      }
      current_role: { Args: never; Returns: string }
      move_checklist_item: {
        Args: { _direction: string; _item_id: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
