export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      churches: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          accent_color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          accent_color?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          church_id: string
          full_name: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          church_id: string
          full_name: string
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          church_id?: string
          full_name?: string
          email?: string
          role?: string
          created_at?: string
        }
      }
      sermons: {
        Row: {
          id: string
          author_id: string
          title: string
          subtitle: string | null
          content: Json | null
          status: 'draft' | 'review' | 'ready' | 'preached'
          preach_date: string | null
          series_name: string | null
          series_order: number | null
          scripture_primary: string | null
          scriptures_all: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          subtitle?: string | null
          content?: Json | null
          status?: 'draft' | 'review' | 'ready' | 'preached'
          preach_date?: string | null
          series_name?: string | null
          series_order?: number | null
          scripture_primary?: string | null
          scriptures_all?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          subtitle?: string | null
          content?: Json | null
          status?: 'draft' | 'review' | 'ready' | 'preached'
          preach_date?: string | null
          series_name?: string | null
          series_order?: number | null
          scripture_primary?: string | null
          scriptures_all?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      sermon_tags: {
        Row: {
          id: string
          sermon_id: string
          tag_type: 'topic' | 'scripture' | 'holiday' | 'custom'
          tag_value: string
        }
        Insert: {
          id?: string
          sermon_id: string
          tag_type: 'topic' | 'scripture' | 'holiday' | 'custom'
          tag_value: string
        }
        Update: {
          id?: string
          sermon_id?: string
          tag_type?: 'topic' | 'scripture' | 'holiday' | 'custom'
          tag_value?: string
        }
      }
      ideas: {
        Row: {
          id: string
          profile_id: string
          content: string
          source_type: 'photo' | 'typed' | 'voice'
          photo_url: string | null
          ocr_text: string | null
          promoted_to_sermon: string | null
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          content: string
          source_type: 'photo' | 'typed' | 'voice'
          photo_url?: string | null
          ocr_text?: string | null
          promoted_to_sermon?: string | null
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          content?: string
          source_type?: 'photo' | 'typed' | 'voice'
          photo_url?: string | null
          ocr_text?: string | null
          promoted_to_sermon?: string | null
          archived?: boolean
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          profile_id: string
          title: string
          event_type: 'sermon_study' | 'meeting' | 'visit' | 'personal' | 'service'
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          recurrence_rule: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          title: string
          event_type: 'sermon_study' | 'meeting' | 'visit' | 'personal' | 'service'
          description?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          recurrence_rule?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          title?: string
          event_type?: 'sermon_study' | 'meeting' | 'visit' | 'personal' | 'service'
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          recurrence_rule?: string | null
          color?: string | null
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          profile_id: string
          full_name: string
          phone: string | null
          email: string | null
          address: string | null
          notes: string | null
          status: 'active' | 'inactive' | 'visitor'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          full_name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          status?: 'active' | 'inactive' | 'visitor'
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          full_name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          status?: 'active' | 'inactive' | 'visitor'
          created_at?: string
        }
      }
      care_tasks: {
        Row: {
          id: string
          member_id: string
          profile_id: string
          task_type: 'visit' | 'hospital' | 'call' | 'ride' | 'deacon_request' | 'other'
          description: string
          status: 'pending' | 'in_progress' | 'completed'
          priority: 'low' | 'normal' | 'urgent'
          due_date: string | null
          completed_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          profile_id: string
          task_type: 'visit' | 'hospital' | 'call' | 'ride' | 'deacon_request' | 'other'
          description: string
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'normal' | 'urgent'
          due_date?: string | null
          completed_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          profile_id?: string
          task_type?: 'visit' | 'hospital' | 'call' | 'ride' | 'deacon_request' | 'other'
          description?: string
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'normal' | 'urgent'
          due_date?: string | null
          completed_date?: string | null
          notes?: string | null
          created_at?: string
        }
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

export type Church = Database['public']['Tables']['churches']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Sermon = Database['public']['Tables']['sermons']['Row']
export type SermonTag = Database['public']['Tables']['sermon_tags']['Row']
export type Idea = Database['public']['Tables']['ideas']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type CareTask = Database['public']['Tables']['care_tasks']['Row']
