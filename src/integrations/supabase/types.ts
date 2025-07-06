export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          doer_id: string | null
          id: string
          payment_mode: string | null
          payment_status: string
          razorpay_payment_id: string | null
          task_id: string
          uploaded_proof: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          doer_id?: string | null
          id?: string
          payment_mode?: string | null
          payment_status?: string
          razorpay_payment_id?: string | null
          task_id: string
          uploaded_proof?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          doer_id?: string | null
          id?: string
          payment_mode?: string | null
          payment_status?: string
          razorpay_payment_id?: string | null
          task_id?: string
          uploaded_proof?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_doer_id"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_submissions: {
        Row: {
          doer_id: string
          file_url: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["proof_status"]
          submitted_at: string
          task_id: string
        }
        Insert: {
          doer_id: string
          file_url: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          submitted_at?: string
          task_id: string
        }
        Update: {
          doer_id?: string
          file_url?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["proof_status"]
          submitted_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_submissions_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          from_user: string
          id: string
          review: string | null
          stars: number
          task_id: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          review?: string | null
          stars: number
          task_id: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          review?: string | null
          stars?: number
          task_id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_applications: {
        Row: {
          applied_at: string
          doer_id: string
          id: string
          status: Database["public"]["Enums"]["application_status"]
          task_id: string
        }
        Insert: {
          applied_at?: string
          doer_id: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          task_id: string
        }
        Update: {
          applied_at?: string
          doer_id?: string
          id?: string
          status?: Database["public"]["Enums"]["application_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_applications_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_applications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          client_id: string
          created_at: string
          deadline: string
          description: string
          doer_id: string | null
          id: string
          is_remote: boolean
          location: string
          payment_status: string | null
          proof_required: boolean
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          budget: number
          category: Database["public"]["Enums"]["task_category"]
          client_id: string
          created_at?: string
          deadline: string
          description: string
          doer_id?: string | null
          id?: string
          is_remote?: boolean
          location: string
          payment_status?: string | null
          proof_required?: boolean
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          budget?: number
          category?: Database["public"]["Enums"]["task_category"]
          client_id?: string
          created_at?: string
          deadline?: string
          description?: string
          doer_id?: string | null
          id?: string
          is_remote?: boolean
          location?: string
          payment_status?: string | null
          proof_required?: boolean
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          id: string
          language: Database["public"]["Enums"]["user_language"]
          name: string
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          upi_id: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          id?: string
          language?: Database["public"]["Enums"]["user_language"]
          name: string
          phone?: string | null
          photo_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          upi_id?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          id?: string
          language?: Database["public"]["Enums"]["user_language"]
          name?: string
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          upi_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: "pending" | "accepted" | "rejected"
      proof_status: "pending" | "accepted" | "rejected"
      task_category: "student" | "skilled" | "ai" | "custom"
      task_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      user_language: "en" | "te" | "hi"
      user_role: "client" | "doer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["pending", "accepted", "rejected"],
      proof_status: ["pending", "accepted", "rejected"],
      task_category: ["student", "skilled", "ai", "custom"],
      task_status: [
        "open",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      user_language: ["en", "te", "hi"],
      user_role: ["client", "doer", "admin"],
    },
  },
} as const
