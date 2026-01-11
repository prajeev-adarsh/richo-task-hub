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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          id: string
          reason: string | null
          target_data: Json | null
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_data?: Json | null
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          target_data?: Json | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      chat_rooms: {
        Row: {
          client_id: string
          created_at: string
          doer_id: string
          id: string
          task_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          doer_id: string
          id?: string
          task_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          doer_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      doer_skills: {
        Row: {
          category: Database["public"]["Enums"]["task_category"]
          created_at: string | null
          id: string
          skill_id: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string | null
          id?: string
          skill_id?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string | null
          id?: string
          skill_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doer_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doer_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doer_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          read: boolean
          room_id: string
          sender_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          room_id: string
          sender_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          payload: Json | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          payload?: Json | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          payload?: Json | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          doer_id: string | null
          id: string
          payment_mode: string | null
          payment_status: string
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
            foreignKeyName: "fk_payments_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
            foreignKeyName: "fk_payments_doer_id"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
      portfolio_items: {
        Row: {
          category: Database["public"]["Enums"]["task_category"] | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          title: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["task_category"] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          title: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"] | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
            foreignKeyName: "proof_submissions_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
            foreignKeyName: "ratings_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users_public"
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
          {
            foreignKeyName: "ratings_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tasks: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["task_category"]
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["task_category"]
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
            foreignKeyName: "task_applications_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_doer_id_fkey"
            columns: ["doer_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"]
          auth_user_id: string
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          language: Database["public"]["Enums"]["user_language"]
          name: string
          onboarding_completed: boolean
          phone: string | null
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          upi_id: string | null
        }
        Insert: {
          active_role: Database["public"]["Enums"]["user_role"]
          auth_user_id: string
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          language?: Database["public"]["Enums"]["user_language"]
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          photo_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          upi_id?: string | null
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"]
          auth_user_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          language?: Database["public"]["Enums"]["user_language"]
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          upi_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      users_public: {
        Row: {
          active_role: Database["public"]["Enums"]["user_role"] | null
          created_at: string | null
          id: string | null
          name: string | null
          onboarding_completed: boolean | null
          photo_url: string | null
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          photo_url?: string | null
        }
        Update: {
          active_role?: Database["public"]["Enums"]["user_role"] | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          photo_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_notification: {
        Args: {
          p_message: string
          p_payload?: Json
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      get_doer_profile: {
        Args: { _user_id: string }
        Returns: {
          avg_rating: number
          completed_tasks: number
          id: string
          name: string
          photo_url: string
          skills: Json
          total_reviews: number
        }[]
      }
      get_public_profile: {
        Args: { _user_id: string }
        Returns: {
          active_role: Database["public"]["Enums"]["user_role"]
          id: string
          name: string
          photo_url: string
        }[]
      }
      get_public_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          active_role: Database["public"]["Enums"]["user_role"]
          id: string
          name: string
          photo_url: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_payment: {
        Args: { p_payment_proof_url?: string; p_task_id: string }
        Returns: string
      }
      send_contact_message: {
        Args: { p_doer_id: string; p_message: string }
        Returns: string
      }
      soft_delete_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      switch_user_role: {
        Args: { _new_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
    }
    Enums: {
      application_status: "pending" | "accepted" | "rejected"
      notification_type:
        | "application_received"
        | "application_accepted"
        | "application_rejected"
        | "task_assigned"
        | "proof_submitted"
        | "proof_accepted"
        | "proof_rejected"
        | "payment_released"
        | "rating_received"
        | "new_message"
        | "new_comment"
        | "new_task_posted"
      proof_status: "pending" | "accepted" | "rejected"
      task_category:
        | "student"
        | "skilled"
        | "ai"
        | "custom"
        | "ai_workflows"
        | "vibe_coding"
        | "prompt_engineering"
        | "ai_video"
        | "web_design"
        | "general"
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
      application_status: ["pending", "accepted", "rejected"],
      notification_type: [
        "application_received",
        "application_accepted",
        "application_rejected",
        "task_assigned",
        "proof_submitted",
        "proof_accepted",
        "proof_rejected",
        "payment_released",
        "rating_received",
        "new_message",
        "new_comment",
        "new_task_posted",
      ],
      proof_status: ["pending", "accepted", "rejected"],
      task_category: [
        "student",
        "skilled",
        "ai",
        "custom",
        "ai_workflows",
        "vibe_coding",
        "prompt_engineering",
        "ai_video",
        "web_design",
        "general",
      ],
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
