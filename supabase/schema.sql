-- =============================================
-- Beauty Docs App - Supabase Database Schema
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

-- Formularze
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"fields": []}',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wypełnione formularze (submissions)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- =============================================

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

CREATE POLICY "Anyone can view public forms" ON forms
  FOR SELECT USING (is_public = true);

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

-- Submissions: Salon owners can view, anyone can submit to public forms
CREATE POLICY "Salon owners can view submissions" ON submissions
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can submit to public forms" ON submissions
  FOR INSERT WITH CHECK (
    form_id IN (SELECT id FROM forms WHERE is_public = true)
  );

CREATE POLICY "Salon owners can delete submissions" ON submissions
  FOR DELETE USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- 4. Indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_clients_salon_id ON clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_forms_salon_id ON forms(salon_id);
CREATE INDEX IF NOT EXISTS idx_forms_is_public ON forms(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_salon_id ON submissions(salon_id);
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

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Done! Your database is ready.
-- =============================================
