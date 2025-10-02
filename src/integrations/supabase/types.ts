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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      access_overrides: {
        Row: {
          created_at: string
          expires_at: string | null
          product: Database["public"]["Enums"]["product_kind"] | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          product?: Database["public"]["Enums"]["product_kind"] | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          product?: Database["public"]["Enums"]["product_kind"] | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string | null
          category: string
          content: string
          created_at: string
          evidence_strength: string
          excerpt: string | null
          featured_image_url: string | null
          format: string
          id: string
          meta_description: string | null
          published: boolean
          read_time_minutes: number
          slug: string
          summary: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category: string
          content?: string
          created_at?: string
          evidence_strength?: string
          excerpt?: string | null
          featured_image_url?: string | null
          format: string
          id?: string
          meta_description?: string | null
          published?: boolean
          read_time_minutes?: number
          slug: string
          summary: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string
          content?: string
          created_at?: string
          evidence_strength?: string
          excerpt?: string | null
          featured_image_url?: string | null
          format?: string
          id?: string
          meta_description?: string | null
          published?: boolean
          read_time_minutes?: number
          slug?: string
          summary?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          admin_notes: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          duration_minutes: number
          google_event_id: string | null
          id: string
          pre_meeting_info: Json | null
          preferred_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          pre_meeting_info?: Json | null
          preferred_date: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          pre_meeting_info?: Json | null
          preferred_date?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_logs: {
        Row: {
          challenge_id: string
          challenge_slug: string
          completed: boolean | null
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          challenge_id: string
          challenge_slug: string
          completed?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          challenge_id?: string
          challenge_slug?: string
          completed?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      challenges_master: {
        Row: {
          created_at: string | null
          slug: string
          target: number | null
          title: string
          type: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          slug: string
          target?: number | null
          title: string
          type: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          slug?: string
          target?: number | null
          title?: string
          type?: string
          unit?: string | null
        }
        Relationships: []
      }
      client_days: {
        Row: {
          assigned_weekday: number | null
          client_program_id: string
          day_order: number
          id: string
          inserted_at: string | null
          note: string | null
          template_day_id: string | null
          title: string
          user_id: string | null
          weekday: number | null
        }
        Insert: {
          assigned_weekday?: number | null
          client_program_id: string
          day_order: number
          id?: string
          inserted_at?: string | null
          note?: string | null
          template_day_id?: string | null
          title: string
          user_id?: string | null
          weekday?: number | null
        }
        Update: {
          assigned_weekday?: number | null
          client_program_id?: string
          day_order?: number
          id?: string
          inserted_at?: string | null
          note?: string | null
          template_day_id?: string | null
          title?: string
          user_id?: string | null
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_days_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_days_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_client_programs_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_days_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_analytics"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "client_days_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "client_days_template_day_fk"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "template_days"
            referencedColumns: ["id"]
          },
        ]
      }
      client_items: {
        Row: {
          client_day_id: string
          coach_notes: string | null
          exercise_name: string
          id: string
          inserted_at: string | null
          order_in_day: number
          reps: string
          rest_seconds: number | null
          rir_max: number | null
          rir_min: number | null
          seconds: number | null
          sets: number
          user_id: string | null
          video_url: string | null
          weight_kg: number | null
        }
        Insert: {
          client_day_id: string
          coach_notes?: string | null
          exercise_name: string
          id?: string
          inserted_at?: string | null
          order_in_day: number
          reps: string
          rest_seconds?: number | null
          rir_max?: number | null
          rir_min?: number | null
          seconds?: number | null
          sets: number
          user_id?: string | null
          video_url?: string | null
          weight_kg?: number | null
        }
        Update: {
          client_day_id?: string
          coach_notes?: string | null
          exercise_name?: string
          id?: string
          inserted_at?: string | null
          order_in_day?: number
          reps?: string
          rest_seconds?: number | null
          rir_max?: number | null
          rir_min?: number | null
          seconds?: number | null
          sets?: number
          user_id?: string | null
          video_url?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_items_client_day_id_fkey"
            columns: ["client_day_id"]
            isOneToOne: false
            referencedRelation: "client_days"
            referencedColumns: ["id"]
          },
        ]
      }
      client_programs: {
        Row: {
          assigned_by: string
          assigned_to: string
          auto_progression_enabled: boolean | null
          completed_at: string | null
          duration_weeks: number | null
          goal_override: string | null
          id: string
          inserted_at: string | null
          is_active: boolean | null
          progression_parameters: Json | null
          start_date: string | null
          status: string | null
          template_id: string | null
          title_override: string | null
          training_days_per_week: number | null
          user_id: string | null
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          auto_progression_enabled?: boolean | null
          completed_at?: string | null
          duration_weeks?: number | null
          goal_override?: string | null
          id?: string
          inserted_at?: string | null
          is_active?: boolean | null
          progression_parameters?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title_override?: string | null
          training_days_per_week?: number | null
          user_id?: string | null
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          auto_progression_enabled?: boolean | null
          completed_at?: string | null
          duration_weeks?: number | null
          goal_override?: string | null
          id?: string
          inserted_at?: string | null
          is_active?: boolean | null
          progression_parameters?: Json | null
          start_date?: string | null
          status?: string | null
          template_id?: string | null
          title_override?: string | null
          training_days_per_week?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_habits: {
        Row: {
          created_at: string
          icon_name: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_notes: {
        Row: {
          client_day_id: string
          client_item_id: string
          id: string
          inserted_at: string
          notes: string
          program_id: string
          rir_done: number | null
          rpe: number | null
          rpe_history: Json | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_day_id: string
          client_item_id: string
          id?: string
          inserted_at?: string
          notes?: string
          program_id: string
          rir_done?: number | null
          rpe?: number | null
          rpe_history?: Json | null
          session_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_day_id?: string
          client_item_id?: string
          id?: string
          inserted_at?: string
          notes?: string
          program_id?: string
          rir_done?: number | null
          rpe?: number | null
          rpe_history?: Json | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_notes_client_day_id_fkey"
            columns: ["client_day_id"]
            isOneToOne: false
            referencedRelation: "client_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_client_item_id_fkey"
            columns: ["client_item_id"]
            isOneToOne: false
            referencedRelation: "client_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_client_programs_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_analytics"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "exercise_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "v_program_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "exercise_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "exercise_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_en_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_en_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: string
          duration: string
          id: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          difficulty: string
          duration: string
          id?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: string
          duration?: string
          id?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string | null
          id: string
          is_paid: boolean
          role: string
          trial_ends_at: string | null
          trial_used: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id: string
          is_paid?: boolean
          role?: string
          trial_ends_at?: string | null
          trial_used?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          is_paid?: boolean
          role?: string
          trial_ends_at?: string | null
          trial_used?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      programday: {
        Row: {
          created_at: string | null
          day: number
          exercise1: string | null
          exercise2: string | null
          exercise3: string | null
          exercise4: string | null
          exercise5: string | null
          hint1: string | null
          hint2: string | null
          hint3: string | null
          hint4: string | null
          hint5: string | null
          hintprogramday: string | null
          id: string
          notes: string | null
          program_id: string | null
          reps1: number | null
          reps2: number | null
          reps3: number | null
          reps4: number | null
          reps5: number | null
          seconds1: number | null
          seconds2: number | null
          seconds3: number | null
          seconds4: number | null
          seconds5: number | null
          sets1: number | null
          sets2: number | null
          sets3: number | null
          sets4: number | null
          sets5: number | null
          setsprogramday: number | null
          title: string | null
          updated_at: string | null
          videolink1: string | null
          videolink2: string | null
          videolink3: string | null
          videolink4: string | null
          videolink5: string | null
          week: number
        }
        Insert: {
          created_at?: string | null
          day: number
          exercise1?: string | null
          exercise2?: string | null
          exercise3?: string | null
          exercise4?: string | null
          exercise5?: string | null
          hint1?: string | null
          hint2?: string | null
          hint3?: string | null
          hint4?: string | null
          hint5?: string | null
          hintprogramday?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          reps1?: number | null
          reps2?: number | null
          reps3?: number | null
          reps4?: number | null
          reps5?: number | null
          seconds1?: number | null
          seconds2?: number | null
          seconds3?: number | null
          seconds4?: number | null
          seconds5?: number | null
          sets1?: number | null
          sets2?: number | null
          sets3?: number | null
          sets4?: number | null
          sets5?: number | null
          setsprogramday?: number | null
          title?: string | null
          updated_at?: string | null
          videolink1?: string | null
          videolink2?: string | null
          videolink3?: string | null
          videolink4?: string | null
          videolink5?: string | null
          week: number
        }
        Update: {
          created_at?: string | null
          day?: number
          exercise1?: string | null
          exercise2?: string | null
          exercise3?: string | null
          exercise4?: string | null
          exercise5?: string | null
          hint1?: string | null
          hint2?: string | null
          hint3?: string | null
          hint4?: string | null
          hint5?: string | null
          hintprogramday?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          reps1?: number | null
          reps2?: number | null
          reps3?: number | null
          reps4?: number | null
          reps5?: number | null
          seconds1?: number | null
          seconds2?: number | null
          seconds3?: number | null
          seconds4?: number | null
          seconds5?: number | null
          sets1?: number | null
          sets2?: number | null
          sets3?: number | null
          sets4?: number | null
          sets5?: number | null
          setsprogramday?: number | null
          title?: string | null
          updated_at?: string | null
          videolink1?: string | null
          videolink2?: string | null
          videolink3?: string | null
          videolink4?: string | null
          videolink5?: string | null
          week?: number
        }
        Relationships: []
      }
      programday_backup: {
        Row: {
          created_at: string | null
          day: number | null
          exercise1: string | null
          exercise1_hint: string | null
          exercise1_reps: number | null
          exercise1_reps_text: string | null
          exercise1_sets: number | null
          exercise1_sets_text: string | null
          exercise2: string | null
          exercise2_hint: string | null
          exercise2_reps: number | null
          exercise2_reps_text: string | null
          exercise2_sets: number | null
          exercise2_sets_text: string | null
          exercise3: string | null
          exercise3_hint: string | null
          exercise3_reps: number | null
          exercise3_reps_text: string | null
          exercise3_sets: number | null
          exercise3_sets_text: string | null
          exercise4: string | null
          exercise4_hint: string | null
          exercise4_reps: number | null
          exercise4_reps_text: string | null
          exercise4_sets: number | null
          exercise4_sets_text: string | null
          exercise5: string | null
          exercise5_hint: string | null
          exercise5_reps: number | null
          exercise5_reps_text: string | null
          exercise5_sets: number | null
          exercise5_sets_text: string | null
          exercises: Json | null
          hintprogramday: string | null
          id: string
          notes: string | null
          program_id: string | null
          repsprogramday: number | null
          repsprogramday_text: string | null
          secondsprogramday: number | null
          secondsprogramday_text: string | null
          setsprogramday: number | null
          title: string | null
          updated_at: string | null
          videolink1: string | null
          videolink2: string | null
          videolink3: string | null
          videolink4: string | null
          videolink5: string | null
          week: number | null
        }
        Insert: {
          created_at?: string | null
          day?: number | null
          exercise1?: string | null
          exercise1_hint?: string | null
          exercise1_reps?: number | null
          exercise1_reps_text?: string | null
          exercise1_sets?: number | null
          exercise1_sets_text?: string | null
          exercise2?: string | null
          exercise2_hint?: string | null
          exercise2_reps?: number | null
          exercise2_reps_text?: string | null
          exercise2_sets?: number | null
          exercise2_sets_text?: string | null
          exercise3?: string | null
          exercise3_hint?: string | null
          exercise3_reps?: number | null
          exercise3_reps_text?: string | null
          exercise3_sets?: number | null
          exercise3_sets_text?: string | null
          exercise4?: string | null
          exercise4_hint?: string | null
          exercise4_reps?: number | null
          exercise4_reps_text?: string | null
          exercise4_sets?: number | null
          exercise4_sets_text?: string | null
          exercise5?: string | null
          exercise5_hint?: string | null
          exercise5_reps?: number | null
          exercise5_reps_text?: string | null
          exercise5_sets?: number | null
          exercise5_sets_text?: string | null
          exercises?: Json | null
          hintprogramday?: string | null
          id: string
          notes?: string | null
          program_id?: string | null
          repsprogramday?: number | null
          repsprogramday_text?: string | null
          secondsprogramday?: number | null
          secondsprogramday_text?: string | null
          setsprogramday?: number | null
          title?: string | null
          updated_at?: string | null
          videolink1?: string | null
          videolink2?: string | null
          videolink3?: string | null
          videolink4?: string | null
          videolink5?: string | null
          week?: number | null
        }
        Update: {
          created_at?: string | null
          day?: number | null
          exercise1?: string | null
          exercise1_hint?: string | null
          exercise1_reps?: number | null
          exercise1_reps_text?: string | null
          exercise1_sets?: number | null
          exercise1_sets_text?: string | null
          exercise2?: string | null
          exercise2_hint?: string | null
          exercise2_reps?: number | null
          exercise2_reps_text?: string | null
          exercise2_sets?: number | null
          exercise2_sets_text?: string | null
          exercise3?: string | null
          exercise3_hint?: string | null
          exercise3_reps?: number | null
          exercise3_reps_text?: string | null
          exercise3_sets?: number | null
          exercise3_sets_text?: string | null
          exercise4?: string | null
          exercise4_hint?: string | null
          exercise4_reps?: number | null
          exercise4_reps_text?: string | null
          exercise4_sets?: number | null
          exercise4_sets_text?: string | null
          exercise5?: string | null
          exercise5_hint?: string | null
          exercise5_reps?: number | null
          exercise5_reps_text?: string | null
          exercise5_sets?: number | null
          exercise5_sets_text?: string | null
          exercises?: Json | null
          hintprogramday?: string | null
          id?: string
          notes?: string | null
          program_id?: string | null
          repsprogramday?: number | null
          repsprogramday_text?: string | null
          secondsprogramday?: number | null
          secondsprogramday_text?: string | null
          setsprogramday?: number | null
          title?: string | null
          updated_at?: string | null
          videolink1?: string | null
          videolink2?: string | null
          videolink3?: string | null
          videolink4?: string | null
          videolink5?: string | null
          week?: number | null
        }
        Relationships: []
      }
      rest_timers: {
        Row: {
          client_item_id: string
          ended_at: string | null
          id: string
          inserted_at: string | null
          session_id: string
          set_number: number
          started_at: string
          target_seconds: number
          user_id: string | null
        }
        Insert: {
          client_item_id: string
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          session_id: string
          set_number: number
          started_at?: string
          target_seconds: number
          user_id?: string | null
        }
        Update: {
          client_item_id?: string
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          session_id?: string
          set_number?: number
          started_at?: string
          target_seconds?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rest_timers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "rest_timers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rpe_history: {
        Row: {
          client_item_id: string
          created_at: string
          id: string
          note: string | null
          rpe: number
          session_id: string
          user_id: string
        }
        Insert: {
          client_item_id: string
          created_at?: string
          id?: string
          note?: string | null
          rpe: number
          session_id: string
          user_id: string
        }
        Update: {
          client_item_id?: string
          created_at?: string
          id?: string
          note?: string | null
          rpe?: number
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          client_day_id: string | null
          client_item_id: string
          id: string
          inserted_at: string | null
          marked_done_at: string
          notes: string | null
          program_id: string | null
          reps_done: number | null
          rir_done: number | null
          seconds_done: number | null
          session_id: string | null
          set_number: number
          user_id: string | null
          weight_kg_done: number | null
        }
        Insert: {
          client_day_id?: string | null
          client_item_id: string
          id?: string
          inserted_at?: string | null
          marked_done_at?: string
          notes?: string | null
          program_id?: string | null
          reps_done?: number | null
          rir_done?: number | null
          seconds_done?: number | null
          session_id?: string | null
          set_number: number
          user_id?: string | null
          weight_kg_done?: number | null
        }
        Update: {
          client_day_id?: string | null
          client_item_id?: string
          id?: string
          inserted_at?: string | null
          marked_done_at?: string
          notes?: string | null
          program_id?: string | null
          reps_done?: number | null
          rir_done?: number | null
          seconds_done?: number | null
          session_id?: string | null
          set_number?: number
          user_id?: string | null
          weight_kg_done?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sl_client_item"
            columns: ["client_item_id"]
            isOneToOne: false
            referencedRelation: "client_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sl_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sl_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs_backup: {
        Row: {
          client_day_id: string | null
          client_item_id: string | null
          id: string
          inserted_at: string | null
          marked_done_at: string | null
          notes: string | null
          program_id: string | null
          session_id: string | null
          set_number: number | null
          user_id: string | null
        }
        Insert: {
          client_day_id?: string | null
          client_item_id?: string | null
          id: string
          inserted_at?: string | null
          marked_done_at?: string | null
          notes?: string | null
          program_id?: string | null
          session_id?: string | null
          set_number?: number | null
          user_id?: string | null
        }
        Update: {
          client_day_id?: string | null
          client_item_id?: string | null
          id?: string
          inserted_at?: string | null
          marked_done_at?: string | null
          notes?: string | null
          program_id?: string | null
          session_id?: string | null
          set_number?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      static_starts: {
        Row: {
          created_at: string
          start_monday: string
          user_id: string
        }
        Insert: {
          created_at?: string
          start_monday: string
          user_id: string
        }
        Update: {
          created_at?: string
          start_monday?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "static_starts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "static_starts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          paused: boolean
          plan: string | null
          source: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          paused?: boolean
          plan?: string | null
          source?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          paused?: boolean
          plan?: string | null
          source?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_days: {
        Row: {
          day_order: number
          id: string
          inserted_at: string | null
          note: string | null
          template_id: string
          title: string
          weekday: number | null
        }
        Insert: {
          day_order: number
          id?: string
          inserted_at?: string | null
          note?: string | null
          template_id: string
          title: string
          weekday?: number | null
        }
        Update: {
          day_order?: number
          id?: string
          inserted_at?: string | null
          note?: string | null
          template_id?: string
          title?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_items: {
        Row: {
          coach_notes: string | null
          exercise_name: string
          id: string
          inserted_at: string | null
          order_in_day: number
          reps: string
          rest_seconds: number | null
          seconds: number | null
          sets: number
          template_day_id: string
          video_url: string | null
          weight_kg: number | null
        }
        Insert: {
          coach_notes?: string | null
          exercise_name: string
          id?: string
          inserted_at?: string | null
          order_in_day: number
          reps: string
          rest_seconds?: number | null
          seconds?: number | null
          sets: number
          template_day_id: string
          video_url?: string | null
          weight_kg?: number | null
        }
        Update: {
          coach_notes?: string | null
          exercise_name?: string
          id?: string
          inserted_at?: string | null
          order_in_day?: number
          reps?: string
          rest_seconds?: number | null
          seconds?: number | null
          sets?: number
          template_day_id?: string
          video_url?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_items_template_day_id_fkey"
            columns: ["template_day_id"]
            isOneToOne: false
            referencedRelation: "template_days"
            referencedColumns: ["id"]
          },
        ]
      }
      timezones: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      training_journal: {
        Row: {
          client_program_id: string | null
          content: string
          created_at: string
          energy_level: number | null
          id: string
          mood: number | null
          motivation: number | null
          session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_program_id?: string | null
          content?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          motivation?: number | null
          session_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_program_id?: string | null
          content?: string
          created_at?: string
          energy_level?: number | null
          id?: string
          mood?: number | null
          motivation?: number | null
          session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_journal_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_journal_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_client_programs_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_journal_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_analytics"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "training_journal_client_program_id_fkey"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "training_journal_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "training_journal_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          page_url: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          note: string | null
          paused: boolean
          product: Database["public"]["Enums"]["product_kind"]
          source: string | null
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          note?: string | null
          paused?: boolean
          product: Database["public"]["Enums"]["product_kind"]
          source?: string | null
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          note?: string | null
          paused?: boolean
          product?: Database["public"]["Enums"]["product_kind"]
          source?: string | null
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          created_at: string
          earned_at: string
          id: string
          iso_week: number | null
          iso_year: number
          points: number | null
          reward_description: string | null
          reward_title: string
          reward_type: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earned_at?: string
          id?: string
          iso_week?: number | null
          iso_year: number
          points?: number | null
          reward_description?: string | null
          reward_title: string
          reward_type: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          earned_at?: string
          id?: string
          iso_week?: number | null
          iso_year?: number
          points?: number | null
          reward_description?: string | null
          reward_title?: string
          reward_type?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          best_streak: number | null
          created_at: string
          current_streak: number | null
          id: string
          last_workout_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          id?: string
          last_workout_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          id?: string
          last_workout_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      userprogress: {
        Row: {
          completed_at: string
          created_at: string
          done: boolean | null
          id: string
          programday_id: string
          reps: number
          sets: number
          total_reps: number | null
          total_seconds: number | null
          total_sets: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          done?: boolean | null
          id?: string
          programday_id: string
          reps?: number
          sets?: number
          total_reps?: number | null
          total_seconds?: number | null
          total_sets?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          done?: boolean | null
          id?: string
          programday_id?: string
          reps?: number
          sets?: number
          total_reps?: number | null
          total_seconds?: number | null
          total_sets?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "userprogress_programday_id_fkey"
            columns: ["programday_id"]
            isOneToOne: false
            referencedRelation: "programday"
            referencedColumns: ["id"]
          },
        ]
      }
      userprogress_backup: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          programday_id: string
          reps: number
          sets: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          programday_id: string
          reps?: number
          sets?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          programday_id?: string
          reps?: number
          sets?: number
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          client_day_id: string
          client_program_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          inserted_at: string | null
          last_activity_at: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_day_id: string
          client_program_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          last_activity_at?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_day_id?: string
          client_program_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          inserted_at?: string | null
          last_activity_at?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ws_day"
            columns: ["client_day_id"]
            isOneToOne: false
            referencedRelation: "client_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_client_programs_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_analytics"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_by: string | null
          goal: string | null
          id: string
          inserted_at: string | null
          is_active: boolean | null
          title: string
        }
        Insert: {
          created_by?: string | null
          goal?: string | null
          id?: string
          inserted_at?: string | null
          is_active?: boolean | null
          title: string
        }
        Update: {
          created_by?: string | null
          goal?: string | null
          id?: string
          inserted_at?: string | null
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      app_catalog: {
        Row: {
          column_name: unknown | null
          data_type: string | null
          schema: unknown | null
          table_name: unknown | null
        }
        Relationships: []
      }
      v_access_matrix: {
        Row: {
          can_pt: boolean | null
          can_static: boolean | null
          is_admin: boolean | null
          reason: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_client_programs_admin: {
        Row: {
          assigned_by: string | null
          assigned_by_email: string | null
          assigned_to: string | null
          assigned_to_email: string | null
          auto_progression_enabled: boolean | null
          completed_at: string | null
          duration_weeks: number | null
          id: string | null
          inserted_at: string | null
          is_active: boolean | null
          start_date: string | null
          status: string | null
          template_goal: string | null
          template_id: string | null
          template_title: string | null
          title_override: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_programs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      v_program_analytics: {
        Row: {
          avg_session_duration: number | null
          completed_sessions: number | null
          completion_rate: number | null
          duration_weeks: number | null
          first_session: string | null
          last_session: string | null
          most_common_dropoff_day: number | null
          program_id: string | null
          start_date: string | null
          title_override: string | null
          total_days: number | null
          total_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      v_program_progress: {
        Row: {
          auto_progression_enabled: boolean | null
          completed_at: string | null
          duration_weeks: number | null
          is_due_for_completion: boolean | null
          program_id: string | null
          progress_percentage: number | null
          start_date: string | null
          status: string | null
          user_id: string | null
          weeks_elapsed: number | null
        }
        Relationships: []
      }
      v_session_summary: {
        Row: {
          avg_rpe: number | null
          client_day_id: string | null
          client_program_id: string | null
          day_title: string | null
          duration_minutes: number | null
          ended_at: string | null
          program_title: string | null
          session_id: string | null
          started_at: string | null
          total_sets_completed: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ws_day"
            columns: ["client_day_id"]
            isOneToOne: false
            referencedRelation: "client_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "client_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_client_programs_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_analytics"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "fk_ws_program"
            columns: ["client_program_id"]
            isOneToOne: false
            referencedRelation: "v_program_progress"
            referencedColumns: ["program_id"]
          },
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_static_status: {
        Row: {
          current_cycle: number | null
          current_day_in_cycle: number | null
          current_week_in_cycle: number | null
          current_weekday_in_cycle: number | null
          days_since_start: number | null
          start_monday: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          current_cycle?: never
          current_day_in_cycle?: never
          current_week_in_cycle?: never
          current_weekday_in_cycle?: never
          days_since_start?: never
          start_monday?: string | null
          status?: never
          user_id?: string | null
        }
        Update: {
          current_cycle?: never
          current_day_in_cycle?: never
          current_week_in_cycle?: never
          current_weekday_in_cycle?: never
          days_since_start?: never
          start_monday?: string | null
          status?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "static_starts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "static_starts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_user_entitlement: {
        Row: {
          created_at: string | null
          expires_at: string | null
          is_active: boolean | null
          note: string | null
          paused: boolean | null
          product: Database["public"]["Enums"]["product_kind"] | null
          source: string | null
          started_at: string | null
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          is_active?: never
          note?: string | null
          paused?: boolean | null
          product?: Database["public"]["Enums"]["product_kind"] | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          is_active?: never
          note?: string | null
          paused?: boolean | null
          product?: Database["public"]["Enums"]["product_kind"] | null
          source?: string | null
          started_at?: string | null
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_user_weekly: {
        Row: {
          avg_minutes_per_session: number | null
          completed_sessions: number | null
          iso_week: string | null
          sessions_count: number | null
          total_minutes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ws_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_access_matrix"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_userprogress_with_day: {
        Row: {
          completed_at: string | null
          created_at: string | null
          day: number | null
          day_title: string | null
          done: boolean | null
          id: string | null
          programday_id: string | null
          reps: number | null
          sets: number | null
          total_reps: number | null
          total_seconds: number | null
          total_sets: number | null
          updated_at: string | null
          user_id: string | null
          week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "userprogress_programday_id_fkey"
            columns: ["programday_id"]
            isOneToOne: false
            referencedRelation: "programday"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_analytics: {
        Args: Record<PropertyKey, never>
        Returns: {
          activeusers7d: number
          avgrpe7d: number
          avgsessionsperuser7d: number
          completionrate30d: number
          dropoffdaymean: number
          newusers7d: number
          retentionday30: number
          retentionday7: number
          totalusers: number
          workoutscompleted7d: number
          workoutsstarted7d: number
        }[]
      }
      admin_clear_entitlement: {
        Args: { p_product: string; p_user: string }
        Returns: undefined
      }
      admin_delete_client_program_cascade: {
        Args: { p_program_id: string }
        Returns: Json
      }
      admin_delete_template_cascade: {
        Args: { p_template_id: string }
        Returns: Json
      }
      admin_pause_entitlement: {
        Args: { p_pause?: boolean; p_product: string; p_user: string }
        Returns: undefined
      }
      admin_set_entitlement: {
        Args: {
          p_days?: number
          p_note?: string
          p_product: string
          p_status: string
          p_user: string
        }
        Returns: undefined
      }
      admin_set_override: {
        Args:
          | {
              p_expires_at: string
              p_product: Database["public"]["Enums"]["product_kind"]
              p_user: string
            }
          | { p_product: string; p_until: string; p_user: string }
        Returns: undefined
      }
      analyze_exercise_progression: {
        Args: { p_client_item_id: string; p_weeks_back?: number }
        Returns: Json
      }
      analyze_exercise_progression_enhanced: {
        Args: { p_client_item_id: string; p_weeks_back?: number }
        Returns: Json
      }
      analyze_exercise_progression_optimized: {
        Args: { p_client_item_id: string; p_weeks_back?: number }
        Returns: Json
      }
      assign_template_to_user: {
        Args: { start_date: string; target_email: string; template_id: string }
        Returns: string
      }
      assign_template_to_user_v2: {
        Args: {
          p_assigned_by?: string
          p_start_date: string
          p_target_email: string
          p_template_id: string
        }
        Returns: string
      }
      auto_progress_program: {
        Args: { p_program_id: string }
        Returns: Json
      }
      auto_progress_program_enhanced: {
        Args: { p_program_id: string }
        Returns: Json
      }
      auto_progress_program_optimized: {
        Args: { p_program_id: string }
        Returns: Json
      }
      calculate_user_streaks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_access_pt: {
        Args: { u: string }
        Returns: boolean
      }
      can_access_static: {
        Args: { u: string }
        Returns: boolean
      }
      combine_policies: {
        Args: {
          _cmd: string
          _newname: string
          _role: unknown
          _schema: string
          _table: string
        }
        Returns: undefined
      }
      complete_due_programs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      complete_static_program_day: {
        Args: { p_programday_id: string; p_user_id: string }
        Returns: Json
      }
      debug_auth_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      end_rest: {
        Args: { p_rest_timer_id: string }
        Returns: string
      }
      end_session: {
        Args:
          | { p_client_day_id: string; p_program_id: string; p_user_id: string }
          | { p_session_id: string }
        Returns: string
      }
      ensure_admin_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      finish_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      fix_program_integrity: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_analytics_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users: number
          avg_rpe: number
          avg_sessions_per_user_7d: number
          completion_rate: number
          dropoff_day: number
          new_users_7d: number
          retention_day_30: number
          retention_day_7: number
          total_users: number
          total_volume_kg: number
          workouts_completed_7d: number
          workouts_started_7d: number
        }[]
      }
      get_iso_week: {
        Args: { date_input?: string }
        Returns: string
      }
      get_safe_subscriber_info: {
        Args: { target_user_id?: string }
        Returns: {
          created_at: string
          email_masked: string
          expires_at: string
          id: string
          paused: boolean
          plan: string
          status: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_current_program_day: {
        Args: { p_user_id: string }
        Returns: {
          can_complete: boolean
          cycle_number: number
          day: number
          day_in_cycle: number
          programday_id: string
          week: number
        }[]
      }
      get_user_subscription_status: {
        Args: { check_user_id?: string }
        Returns: Json
      }
      has_active_subscription: {
        Args: { u: string }
        Returns: boolean
      }
      has_column: {
        Args: { colname: string; schemaname: string; tablename: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never> | { uid: string }
        Returns: boolean
      }
      is_admin_secure: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      is_allowed: {
        Args: { uid: string }
        Returns: boolean
      }
      is_subscriber: {
        Args: { uid: string }
        Returns: boolean
      }
      make_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      mark_set_done: {
        Args:
          | {
              p_client_day_id: string
              p_client_item_id: string
              p_max_sets?: number
              p_notes?: string
              p_program_id: string
              p_reps_done?: number
              p_seconds_done?: number
              p_session_id: string
              p_weight_kg_done?: number
            }
          | {
              p_client_item_id: string
              p_notes?: string
              p_session_id: string
              p_set_number: number
            }
        Returns: {
          id: string
          inserted: boolean
          set_number: number
          total_done: number
        }[]
      }
      parse_first_int: {
        Args: { txt: string }
        Returns: number
      }
      public_tt_parse_reps_seconds: {
        Args: { txt: string }
        Returns: Json
      }
      public_tt_parse_value_mode: {
        Args: { txt: string }
        Returns: Json
      }
      start_pt_trial_3d: {
        Args: { u: string }
        Returns: Json
      }
      start_session: {
        Args: { p_client_day_id: string; p_client_program_id: string }
        Returns: string
      }
      start_static_program: {
        Args: { p_force?: boolean }
        Returns: string
      }
      start_static_trial_7d: {
        Args: { u: string }
        Returns: Json
      }
      start_trial_once: {
        Args: { p_email: string; p_user: string }
        Returns: Json
      }
      test_admin_login: {
        Args: { test_email: string }
        Returns: Json
      }
      to_reps_text_from_defaults: {
        Args: {
          reps_num: number
          reps_txt: string
          seconds_num: number
          seconds_txt: string
        }
        Returns: string
      }
      track_user_event: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_page_url?: string
          p_session_id?: string
        }
        Returns: string
      }
      update_user_streak: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      validate_admin_action: {
        Args: { action_type: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      product_kind: "static" | "pt"
      service_type:
        | "initial_assessment"
        | "personal_program"
        | "monthly_support"
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
      app_role: ["admin", "moderator", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      product_kind: ["static", "pt"],
      service_type: [
        "initial_assessment",
        "personal_program",
        "monthly_support",
      ],
    },
  },
} as const
