/**
 * Supabase database types — mirrors the schema in supabase/migrations/20240101000000_init.sql
 * Run `supabase gen types typescript` to regenerate from a live project.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>;
      };
      tracked_hashtags: {
        Row: {
          id: string;
          campaign_id: string;
          hashtag: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tracked_hashtags']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_hashtags']['Insert']>;
      };
      tracked_profiles: {
        Row: {
          id: string;
          campaign_id: string;
          handle: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tracked_profiles']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tracked_profiles']['Insert']>;
      };
      collection_runs: {
        Row: {
          id: string;
          campaign_id: string;
          started_at: string;
          finished_at: string | null;
          status: 'running' | 'completed' | 'failed' | 'partial';
          target: 'hashtags' | 'profiles' | 'both';
          posts_found: number | null;
          events_found: number | null;
          top_hashtags: Json | null;
          top_events: Json | null;
          error_message: string | null;
        };
        Insert: Omit<Database['public']['Tables']['collection_runs']['Row'], 'id' | 'started_at'> & {
          id?: string;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['collection_runs']['Insert']>;
      };
      scored_posts: {
        Row: {
          id: string;
          campaign_id: string;
          source: string;
          hashtags: string[];
          media_type: string;
          likes: number;
          comments: number;
          shares: number;
          views: number;
          engagement_rate: number;
          trend_score: number;
          velocity_score: number;
          thumbnail_url: string | null;
          permalink: string | null;
          caption: string | null;
          author_handle: string | null;
          published_at: string | null;
          collected_at: string;
        };
        Insert: Omit<Database['public']['Tables']['scored_posts']['Row'], 'collected_at'> & {
          collected_at?: string;
        };
        Update: Partial<Database['public']['Tables']['scored_posts']['Insert']>;
      };
      hashtag_snapshots: {
        Row: {
          id: string;
          campaign_id: string;
          hashtag: string;
          trend_score: number;
          post_count: number;
          snapshotted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['hashtag_snapshots']['Row'], 'id' | 'snapshotted_at'> & {
          id?: string;
          snapshotted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['hashtag_snapshots']['Insert']>;
      };
      news_events: {
        Row: {
          id: string;
          campaign_id: string;
          detected_at: string;
          event_type: string;
          title: string;
          summary: string | null;
          hashtags: string[];
          author_handles: string[];
          post_ids: string[];
          confidence: number;
          strategy: string | null;
          strategy_reason: string | null;
          metadata: Json | null;
        };
        Insert: Omit<Database['public']['Tables']['news_events']['Row'], 'id' | 'detected_at'> & {
          id?: string;
          detected_at?: string;
        };
        Update: Partial<Database['public']['Tables']['news_events']['Insert']>;
      };
      ai_analyses: {
        Row: {
          id: string;
          campaign_id: string;
          created_at: string;
          selected_post_ids: string[];
          main_topic: string;
          reasoning: string | null;
          suggested_hashtags: string[];
          content_ideas: string[];
          urgency_level: string;
          content_format: string;
          content_prompt: string | null;
        };
        Insert: Omit<Database['public']['Tables']['ai_analyses']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_analyses']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          hashtag: string;
          threshold: number;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
    };
  };
}

// Convenience row types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
