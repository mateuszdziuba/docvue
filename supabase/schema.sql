-- =============================================
-- Reservue App - Supabase Database Schema
-- =============================================
-- Run this script in Supabase Dashboard: SQL Editor
-- =============================================

-- 1. Create Tables
-- =============================================

-- Tabela profili salonów (rozszerzenie auth.users)
CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  pin_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Klienci gabinetu
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Formularze (szablony)
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"fields": []}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Przypisanie formularzy do klientów
CREATE TABLE IF NOT EXISTS client_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  token VARCHAR(32) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, completed
  filled_at TIMESTAMPTZ,
  filled_by VARCHAR(20),  -- 'client' lub 'staff'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wypełnione formularze (submissions)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_form_id UUID REFERENCES client_forms(id) ON DELETE SET NULL,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  client_name TEXT,
  client_email TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
-- =============================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- =============================================

-- Drop existing policies first (for re-runs)
DROP POLICY IF EXISTS "Users can view own salon" ON salons;
DROP POLICY IF EXISTS "Users can insert own salon" ON salons;
DROP POLICY IF EXISTS "Users can update own salon" ON salons;
DROP POLICY IF EXISTS "Salon owners can view clients" ON clients;
DROP POLICY IF EXISTS "Salon owners can insert clients" ON clients;
DROP POLICY IF EXISTS "Salon owners can update clients" ON clients;
DROP POLICY IF EXISTS "Salon owners can delete clients" ON clients;
DROP POLICY IF EXISTS "Salon owners can view own forms" ON forms;
DROP POLICY IF EXISTS "Anyone can view public forms" ON forms;
DROP POLICY IF EXISTS "Salon owners can insert forms" ON forms;
DROP POLICY IF EXISTS "Salon owners can update forms" ON forms;
DROP POLICY IF EXISTS "Salon owners can delete forms" ON forms;
DROP POLICY IF EXISTS "Salon owners can view client_forms" ON client_forms;
DROP POLICY IF EXISTS "Salon owners can insert client_forms" ON client_forms;
DROP POLICY IF EXISTS "Salon owners can update client_forms" ON client_forms;
DROP POLICY IF EXISTS "Salon owners can delete client_forms" ON client_forms;
DROP POLICY IF EXISTS "Anyone can view client_forms by token" ON client_forms;
DROP POLICY IF EXISTS "Anyone can update client_forms by token" ON client_forms;
DROP POLICY IF EXISTS "Salon owners can view submissions" ON submissions;
DROP POLICY IF EXISTS "Anyone can submit to public forms" ON submissions;
DROP POLICY IF EXISTS "Anyone can submit with valid token" ON submissions;
DROP POLICY IF EXISTS "Salon owners can delete submissions" ON submissions;

-- Salons: Users can only see/edit their own salon
CREATE POLICY "Users can view own salon" ON salons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own salon" ON salons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own salon" ON salons
  FOR UPDATE USING (auth.uid() = user_id);

-- Clients: Salon owners can manage their clients
CREATE POLICY "Salon owners can view clients" ON clients
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can insert clients" ON clients
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can update clients" ON clients
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can delete clients" ON clients
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- Forms: Salon owners can manage their forms
CREATE POLICY "Salon owners can view own forms" ON forms
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can insert forms" ON forms
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can update forms" ON forms
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can delete forms" ON forms
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- Client Forms: Salon owners + token-based access for clients
CREATE POLICY "Salon owners can view client_forms" ON client_forms
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can insert client_forms" ON client_forms
  FOR INSERT WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can update client_forms" ON client_forms
  FOR UPDATE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Salon owners can delete client_forms" ON client_forms
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- Allow anonymous access via token (for public form filling)
CREATE POLICY "Anyone can view client_forms by token" ON client_forms
  FOR SELECT USING (true);  -- Token validation done in app layer

CREATE POLICY "Anyone can update client_forms by token" ON client_forms
  FOR UPDATE USING (true);  -- Token validation done in app layer

-- Submissions: Salon owners can view, anyone can submit via token
CREATE POLICY "Salon owners can view submissions" ON submissions
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can submit with valid token" ON submissions
  FOR INSERT WITH CHECK (true);  -- Token validation done in app layer

CREATE POLICY "Salon owners can delete submissions" ON submissions
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- 4. Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_clients_salon_id ON clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_forms_salon_id ON forms(salon_id);
CREATE INDEX IF NOT EXISTS idx_client_forms_salon_id ON client_forms(salon_id);
CREATE INDEX IF NOT EXISTS idx_client_forms_client_id ON client_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_forms_token ON client_forms(token);
CREATE INDEX IF NOT EXISTS idx_client_forms_status ON client_forms(status);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_salon_id ON submissions(salon_id);
CREATE INDEX IF NOT EXISTS idx_submissions_client_form_id ON submissions(client_form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- 5. Function to auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Function to generate unique token
-- =============================================

CREATE OR REPLACE FUNCTION generate_token()
RETURNS VARCHAR(32) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(32) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Done! Your database is ready.
-- =============================================

-- 7. Search Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_forms_title_search ON forms USING btree (title);
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON clients USING btree (name);
CREATE INDEX IF NOT EXISTS idx_clients_email_search ON clients USING btree (email);


-- =============================================
-- TREATMENTS & VISITS MODULE
-- =============================================

-- Create Treatments Table
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10, 2),
  required_form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage treatments" ON treatments
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view treatments" ON treatments
  FOR SELECT USING (true);

-- Link Clients to Auth Users
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create Appointments (Visits) Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled', 
  notes TEXT,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage appointments" ON appointments
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view their own appointments" ON appointments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_treatments_salon_id ON treatments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);


-- =============================================
-- MIGRATION: MULTI-FORMS PER TREATMENT
-- =============================================

CREATE TABLE IF NOT EXISTS treatment_forms (
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (treatment_id, form_id)
);

ALTER TABLE treatment_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage treatment_forms" ON treatment_forms
  USING (treatment_id IN (SELECT id FROM treatments WHERE salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())));

CREATE POLICY "everyone can view treatment_forms" ON treatment_forms
  FOR SELECT USING (true);

-- Note: We assume required_form_id column might be removed manually or we just ignore it in types henceforth.
-- ALTER TABLE treatments DROP COLUMN IF EXISTS required_form_id;
