// Database types for Supabase
// These match the schema defined in the implementation plan

export interface Salon {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export interface Client {
  id: string
  salon_id: string
  name: string
  email: string
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Form {
  id: string
  salon_id: string
  title: string
  description: string | null
  schema: FormSchema
  is_active: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  form_id: string
  client_id: string | null
  salon_id: string
  data: Record<string, unknown>
  client_name: string | null
  client_email: string | null
  signature: string | null
  created_at: string
}

// Form schema structure (matches form-builder output)
export interface FormSchema {
  fields: FormField[]
}

export interface FormField {
  name: string
  label: string
  type: string
  variant?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
  options?: { label: string; value: string }[]
  min?: number
  max?: number
  step?: number
}

// Supabase Database type definition
export type Database = {
  public: {
    Tables: {
      salons: {
        Row: Salon
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          address?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: Client
        Insert: {
          id?: string
          salon_id: string
          name: string
          email: string
          phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          name?: string
          email?: string
          phone?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      forms: {
        Row: Form
        Insert: {
          id?: string
          salon_id: string
          title: string
          description?: string | null
          schema: FormSchema
          is_active?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          title?: string
          description?: string | null
          schema?: FormSchema
          is_active?: boolean
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      submissions: {
        Row: Submission
        Insert: {
          id?: string
          form_id: string
          client_id?: string | null
          salon_id: string
          data: Record<string, unknown>
          client_name?: string | null
          client_email?: string | null
          signature?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          client_id?: string | null
          salon_id?: string
          data?: Record<string, unknown>
          client_name?: string | null
          client_email?: string | null
          signature?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

