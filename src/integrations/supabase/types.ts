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
      chapters: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          prerequisite_chapter_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          prerequisite_chapter_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          prerequisite_chapter_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_prerequisite_chapter_id_fkey"
            columns: ["prerequisite_chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      check_buttons: {
        Row: {
          hint_text: string | null
          id: string
          informative_feedback_text: string | null
          lesson_page_id: string
          question_id: string
          show_after_attempt: boolean
        }
        Insert: {
          hint_text?: string | null
          id?: string
          informative_feedback_text?: string | null
          lesson_page_id: string
          question_id: string
          show_after_attempt?: boolean
        }
        Update: {
          hint_text?: string | null
          id?: string
          informative_feedback_text?: string | null
          lesson_page_id?: string
          question_id?: string
          show_after_attempt?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "check_buttons_lesson_page_id_fkey"
            columns: ["lesson_page_id"]
            isOneToOne: false
            referencedRelation: "lesson_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_buttons_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          grade_level: number
          id: string
          is_published: boolean
          order_index: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level?: number
          id?: string
          is_published?: boolean
          order_index?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_level?: number
          id?: string
          is_published?: boolean
          order_index?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      chapter_quiz_attempts: {
        Row: {
          chapter_key: string
          correct_count: number
          created_at: string
          id: string
          points: number
          question_count: number
          student_id: string
          week_start: string
        }
        Insert: {
          chapter_key: string
          correct_count: number
          created_at?: string
          id?: string
          points: number
          question_count: number
          student_id: string
          week_start: string
        }
        Update: {
          chapter_key?: string
          correct_count?: number
          created_at?: string
          id?: string
          points?: number
          question_count?: number
          student_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_prizes: {
        Row: {
          description: string | null
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          description?: string | null
          title: string
          updated_at?: string
          week_start: string
        }
        Update: {
          description?: string | null
          title?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      daily_dungeon_sessions: {
        Row: {
          answers_json: Json
          completed_at: string | null
          id: string
          questions_json: Json
          score: number
          session_date: string
          streak_contribution: boolean
          student_id: string
        }
        Insert: {
          answers_json?: Json
          completed_at?: string | null
          id?: string
          questions_json?: Json
          score?: number
          session_date?: string
          streak_contribution?: boolean
          student_id: string
        }
        Update: {
          answers_json?: Json
          completed_at?: string | null
          id?: string
          questions_json?: Json
          score?: number
          session_date?: string
          streak_contribution?: boolean
          student_id?: string
        }
        Relationships: []
      }
      duel_sessions: {
        Row: {
          chapter_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          player1_answers_json: Json
          player1_id: string
          player1_score: number
          player2_answers_json: Json
          player2_id: string | null
          player2_score: number
          questions_json: Json
          started_at: string | null
          status: Database["public"]["Enums"]["duel_status"]
          winner_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          player1_answers_json?: Json
          player1_id: string
          player1_score?: number
          player2_answers_json?: Json
          player2_id?: string | null
          player2_score?: number
          questions_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["duel_status"]
          winner_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          player1_answers_json?: Json
          player1_id?: string
          player1_score?: number
          player2_answers_json?: Json
          player2_id?: string | null
          player2_score?: number
          questions_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["duel_status"]
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_reactions: {
        Row: {
          created_at: string
          feed_event_id: string
          id: string
          reaction_type: string
          reactor_id: string
        }
        Insert: {
          created_at?: string
          feed_event_id: string
          id?: string
          reaction_type?: string
          reactor_id: string
        }
        Update: {
          created_at?: string
          feed_event_id?: string
          id?: string
          reaction_type?: string
          reactor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_feed_event_id_fkey"
            columns: ["feed_event_id"]
            isOneToOne: false
            referencedRelation: "social_feed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          content_text: string
          created_at: string
          id: string
          is_pinned: boolean
          lesson_id: string | null
          likes_count: number
          parent_post_id: string | null
          post_type: Database["public"]["Enums"]["forum_post_type"]
          student_id: string
        }
        Insert: {
          content_text: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lesson_id?: string | null
          likes_count?: number
          parent_post_id?: string | null
          post_type?: Database["public"]["Enums"]["forum_post_type"]
          student_id: string
        }
        Update: {
          content_text?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lesson_id?: string | null
          likes_count?: number
          parent_post_id?: string | null
          post_type?: Database["public"]["Enums"]["forum_post_type"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          course_id: string | null
          id: string
          rank_position: number | null
          snapshot_date: string
          student_id: string
          xp_total: number
        }
        Insert: {
          course_id?: string | null
          id?: string
          rank_position?: number | null
          snapshot_date?: string
          student_id: string
          xp_total?: number
        }
        Update: {
          course_id?: string | null
          id?: string
          rank_position?: number | null
          snapshot_date?: string
          student_id?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_pages: {
        Row: {
          content_json: Json
          created_at: string
          id: string
          lesson_id: string
          order_index: number
          page_type: Database["public"]["Enums"]["page_type"]
          title: string | null
        }
        Insert: {
          content_json?: Json
          created_at?: string
          id?: string
          lesson_id: string
          order_index?: number
          page_type: Database["public"]["Enums"]["page_type"]
          title?: string | null
        }
        Update: {
          content_json?: Json
          created_at?: string
          id?: string
          lesson_id?: string
          order_index?: number
          page_type?: Database["public"]["Enums"]["page_type"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_pages_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          chapter_id: string
          created_at: string
          estimated_minutes: number
          id: string
          order_index: number
          status: Database["public"]["Enums"]["lesson_status"]
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          order_index?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      optional_items: {
        Row: {
          content_json: Json
          difficulty_level: number | null
          id: string
          item_type: Database["public"]["Enums"]["optional_item_type"]
          lesson_page_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          content_json?: Json
          difficulty_level?: number | null
          id?: string
          item_type: Database["public"]["Enums"]["optional_item_type"]
          lesson_page_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          content_json?: Json
          difficulty_level?: number | null
          id?: string
          item_type?: Database["public"]["Enums"]["optional_item_type"]
          lesson_page_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optional_items_lesson_page_id_fkey"
            columns: ["lesson_page_id"]
            isOneToOne: false
            referencedRelation: "lesson_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_goal_minutes: number | null
          email: string | null
          full_name: string | null
          grade: number | null
          id: string
          last_active_date: string | null
          learning_goal: Database["public"]["Enums"]["learning_goal"] | null
          level: number
          math_level: Database["public"]["Enums"]["math_level"] | null
          math_nickname: string | null
          onboarding_completed: boolean
          school: string | null
          show_in_feed: boolean
          streak_current: number
          streak_freezes: number
          streak_longest: number
          updated_at: string
          xp_total: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          email?: string | null
          full_name?: string | null
          grade?: number | null
          id: string
          last_active_date?: string | null
          learning_goal?: Database["public"]["Enums"]["learning_goal"] | null
          level?: number
          math_level?: Database["public"]["Enums"]["math_level"] | null
          math_nickname?: string | null
          onboarding_completed?: boolean
          school?: string | null
          show_in_feed?: boolean
          streak_current?: number
          streak_freezes?: number
          streak_longest?: number
          updated_at?: string
          xp_total?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          email?: string | null
          full_name?: string | null
          grade?: number | null
          id?: string
          last_active_date?: string | null
          learning_goal?: Database["public"]["Enums"]["learning_goal"] | null
          level?: number
          math_level?: Database["public"]["Enums"]["math_level"] | null
          math_nickname?: string | null
          onboarding_completed?: boolean
          school?: string | null
          show_in_feed?: boolean
          streak_current?: number
          streak_freezes?: number
          streak_longest?: number
          updated_at?: string
          xp_total?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string | null
          correct_answer: string
          created_at: string
          difficulty: number
          explanation: string | null
          id: string
          lesson_page_id: string | null
          options_json: Json
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          tags: string[] | null
        }
        Insert: {
          chapter_id?: string | null
          correct_answer: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          lesson_page_id?: string | null
          options_json?: Json
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          tags?: string[] | null
        }
        Update: {
          chapter_id?: string | null
          correct_answer?: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          lesson_page_id?: string | null
          options_json?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_lesson_page_id_fkey"
            columns: ["lesson_page_id"]
            isOneToOne: false
            referencedRelation: "lesson_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      social_feed_events: {
        Row: {
          created_at: string
          event_data_json: Json
          event_type: Database["public"]["Enums"]["feed_event_type"]
          id: string
          is_public: boolean
          student_id: string
        }
        Insert: {
          created_at?: string
          event_data_json?: Json
          event_type: Database["public"]["Enums"]["feed_event_type"]
          id?: string
          is_public?: boolean
          student_id: string
        }
        Update: {
          created_at?: string
          event_data_json?: Json
          event_type?: Database["public"]["Enums"]["feed_event_type"]
          id?: string
          is_public?: boolean
          student_id?: string
        }
        Relationships: []
      }
      spaced_repetition_queue: {
        Row: {
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review_date: string
          question_id: string
          review_count: number
          student_id: string
        }
        Insert: {
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id: string
          review_count?: number
          student_id: string
        }
        Update: {
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          question_id?: string
          review_count?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_repetition_queue_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          check_attempts_json: Json
          completed_at: string | null
          current_page_index: number
          id: string
          lesson_id: string
          notes: string | null
          score_percentage: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["lesson_progress_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          check_attempts_json?: Json
          completed_at?: string | null
          current_page_index?: number
          id?: string
          lesson_id: string
          notes?: string | null
          score_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          check_attempts_json?: Json
          completed_at?: string | null
          current_page_index?: number
          id?: string
          lesson_id?: string
          notes?: string | null
          score_percentage?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_xp_log: {
        Row: {
          created_at: string
          id: string
          reason: Database["public"]["Enums"]["xp_reason"]
          reference_id: string | null
          student_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          reason: Database["public"]["Enums"]["xp_reason"]
          reference_id?: string | null
          student_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          reason?: Database["public"]["Enums"]["xp_reason"]
          reference_id?: string | null
          student_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      app_role: "student" | "teacher" | "admin"
      duel_status: "waiting" | "active" | "completed"
      feed_event_type:
        | "streak_milestone"
        | "chapter_complete"
        | "level_up"
        | "duel_win"
        | "dungeon_perfect"
      forum_post_type: "tip" | "question" | "feedback_to_peer"
      learning_goal: "on_tap" | "thi_thpt" | "hoc_truoc"
      lesson_progress_status: "not_started" | "in_progress" | "completed"
      lesson_status: "draft" | "published"
      math_level: "yeu" | "trung_binh" | "kha" | "gioi"
      optional_item_type: "remediation" | "enrichment"
      page_type:
        | "opening"
        | "vocabulary"
        | "prior_knowledge"
        | "example"
        | "summary_practice"
      question_type: "multiple_choice" | "fill_blank" | "true_false"
      xp_reason:
        | "lesson_complete"
        | "check_correct"
        | "streak_bonus"
        | "duel_win"
        | "daily_dungeon"
        | "forum_post"
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
      app_role: ["student", "teacher", "admin"],
      duel_status: ["waiting", "active", "completed"],
      feed_event_type: [
        "streak_milestone",
        "chapter_complete",
        "level_up",
        "duel_win",
        "dungeon_perfect",
      ],
      forum_post_type: ["tip", "question", "feedback_to_peer"],
      learning_goal: ["on_tap", "thi_thpt", "hoc_truoc"],
      lesson_progress_status: ["not_started", "in_progress", "completed"],
      lesson_status: ["draft", "published"],
      math_level: ["yeu", "trung_binh", "kha", "gioi"],
      optional_item_type: ["remediation", "enrichment"],
      page_type: [
        "opening",
        "vocabulary",
        "prior_knowledge",
        "example",
        "summary_practice",
      ],
      question_type: ["multiple_choice", "fill_blank", "true_false"],
      xp_reason: [
        "lesson_complete",
        "check_correct",
        "streak_bonus",
        "duel_win",
        "daily_dungeon",
        "forum_post",
      ],
    },
  },
} as const
