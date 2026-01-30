// Database types for Supabase
// These match the schema defined in the implementation plan

export interface Salon {
  id: string
  user_id: string
  name: string
  phone: string | null
  address: string | null
  pin_code: string | null
  created_at: string
}

export interface Client {
  id: string
  salon_id: string
  name: string
  email: string | null
  phone: string
  birth_date: string | null
  notes: string | null
  user_id: string | null // Linked auth user
  created_at: string
}

export interface Form {
  id: string
  salon_id: string
  title: string
  description: string | null
  schema: FormSchema
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientForm {
  id: string
  salon_id: string
  client_id: string
  form_id: string
  token: string
  status: 'pending' | 'completed'
  filled_at: string | null
  filled_by: 'client' | 'staff' | null
  created_at: string
}

export interface Submission {
  id: string
  client_form_id: string | null
  form_id: string
  client_id: string | null
  salon_id: string
  data: Record<string, unknown>
  client_name: string | null
  client_email: string | null
  signature: string | null
  created_at: string
}

export interface Treatment {
  id: string
  salon_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  // required_form_id: string | null -- DEPRECATED
  created_at: string
}

export interface TreatmentForm {
  treatment_id: string
  form_id: string
  created_at: string
}

export interface Appointment {
  id: string
  salon_id: string
  client_id: string
  treatment_id: string
  start_time: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending_forms'
  notes: string | null
  submission_id: string | null
  before_photo_path: string | null
  after_photo_path: string | null
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
          pin_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          address?: string | null
          pin_code?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: Client
        Insert: {
          id?: string
          salon_id: string
          name: string
          email?: string | null
          phone: string
          birth_date?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          name?: string
          email?: string | null
          phone?: string
          birth_date?: string | null
          notes?: string | null
          user_id?: string | null
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
          created_at?: string
          updated_at?: string
        }
      }
      client_forms: {
        Row: ClientForm
        Insert: {
          id?: string
          salon_id: string
          client_id: string
          form_id: string
          token: string
          status?: 'pending' | 'completed'
          filled_at?: string | null
          filled_by?: 'client' | 'staff' | null
          created_at?: string
        }
        Update: {
          id?: string
          salon_id?: string
          client_id?: string
          form_id?: string
          token?: string
          status?: 'pending' | 'completed'
          filled_at?: string | null
          filled_by?: 'client' | 'staff' | null
          created_at?: string
        }
      }
      submissions: {
        Row: Submission
        Insert: {
          id?: string
          client_form_id?: string | null
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
          client_form_id?: string | null
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
      treatments: {
        Row: Treatment
        Insert: Omit<Treatment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Treatment, 'id' | 'created_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Appointment, 'id' | 'created_at'>>
      }
      treatment_forms: {
        Row: TreatmentForm
        Insert: TreatmentForm
        Update: TreatmentForm
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
