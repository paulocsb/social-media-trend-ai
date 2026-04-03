export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analysis_queue: {
        Row: {
          campaign_id: string
          post_id: string
          added_at: string
        }
        Insert: {
          campaign_id: string
          post_id: string
          added_at?: string
        }
        Update: {
          campaign_id?: string
          post_id?: string
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyses: {
        Row: {
          campaign_id: string
          content_format: string
          content_ideas: string[]
          content_prompt: string | null
          created_at: string
          generated_content: Json | null
          id: string
          main_topic: string
          reasoning: string | null
          selected_post_ids: string[]
          suggested_hashtags: string[]
          urgency_level: string
        }
        Insert: {
          campaign_id: string
          content_format?: string
          content_ideas?: string[]
          content_prompt?: string | null
          created_at?: string
          generated_content?: Json | null
          id?: string
          main_topic: string
          reasoning?: string | null
          selected_post_ids?: string[]
          suggested_hashtags?: string[]
          urgency_level?: string
        }
        Update: {
          campaign_id?: string
          content_format?: string
          content_ideas?: string[]
          content_prompt?: string | null
          created_at?: string
          generated_content?: Json | null
          id?: string
          main_topic?: string
          reasoning?: string | null
          selected_post_ids?: string[]
          suggested_hashtags?: string[]
          urgency_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          hashtag: string
          id: string
          threshold: number
          user_id: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          hashtag: string
          id?: string
          threshold: number
          user_id: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          hashtag?: string
          id?: string
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_runs: {
        Row: {
          campaign_id: string
          error_message: string | null
          events_found: number | null
          finished_at: string | null
          id: string
          posts_found: number | null
          started_at: string
          status: string
          target: string
          top_events: Json | null
          top_hashtags: Json | null
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          events_found?: number | null
          finished_at?: string | null
          id?: string
          posts_found?: number | null
          started_at?: string
          status?: string
          target?: string
          top_events?: Json | null
          top_hashtags?: Json | null
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          events_found?: number | null
          finished_at?: string | null
          id?: string
          posts_found?: number | null
          started_at?: string
          status?: string
          target?: string
          top_events?: Json | null
          top_hashtags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_snapshots: {
        Row: {
          campaign_id: string
          hashtag: string
          id: string
          post_count: number
          snapshotted_at: string
          trend_score: number
        }
        Insert: {
          campaign_id: string
          hashtag: string
          id?: string
          post_count?: number
          snapshotted_at?: string
          trend_score?: number
        }
        Update: {
          campaign_id?: string
          hashtag?: string
          id?: string
          post_count?: number
          snapshotted_at?: string
          trend_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      news_events: {
        Row: {
          author_handles: string[]
          campaign_id: string
          confidence: number
          detected_at: string
          event_type: string
          hashtags: string[]
          id: string
          metadata: Json | null
          post_ids: string[]
          strategy: string | null
          strategy_reason: string | null
          summary: string | null
          title: string
        }
        Insert: {
          author_handles?: string[]
          campaign_id: string
          confidence?: number
          detected_at?: string
          event_type: string
          hashtags?: string[]
          id?: string
          metadata?: Json | null
          post_ids?: string[]
          strategy?: string | null
          strategy_reason?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          author_handles?: string[]
          campaign_id?: string
          confidence?: number
          detected_at?: string
          event_type?: string
          hashtags?: string[]
          id?: string
          metadata?: Json | null
          post_ids?: string[]
          strategy?: string | null
          strategy_reason?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scored_posts: {
        Row: {
          author_handle: string | null
          campaign_id: string
          caption: string | null
          collected_at: string
          comments: number
          engagement_rate: number
          hashtags: string[]
          id: string
          likes: number
          media_type: string
          permalink: string | null
          published_at: string | null
          run_id: string | null
          shares: number
          source: string
          thumbnail_url: string | null
          trend_score: number
          velocity_score: number
          views: number
        }
        Insert: {
          author_handle?: string | null
          campaign_id: string
          caption?: string | null
          collected_at?: string
          comments?: number
          engagement_rate?: number
          hashtags?: string[]
          id: string
          likes?: number
          media_type: string
          permalink?: string | null
          published_at?: string | null
          run_id?: string | null
          shares?: number
          source: string
          thumbnail_url?: string | null
          trend_score?: number
          velocity_score?: number
          views?: number
        }
        Update: {
          author_handle?: string | null
          campaign_id?: string
          caption?: string | null
          collected_at?: string
          comments?: number
          engagement_rate?: number
          hashtags?: string[]
          id?: string
          likes?: number
          media_type?: string
          permalink?: string | null
          published_at?: string | null
          run_id?: string | null
          shares?: number
          source?: string
          thumbnail_url?: string | null
          trend_score?: number
          velocity_score?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "scored_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scored_posts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "collection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_hashtags: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          hashtag: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          hashtag: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          hashtag?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_hashtags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_profiles: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          handle: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          handle: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          handle?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_profiles_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

