-- ============================================================================
-- docvue — pełny schemat produkcyjny (jeden plik)
-- Wygenerowany z supabase/schema.sql + supabase/migrations (bez seeda).
-- Zawiera: tabele, typy, funkcje, triggery, widok salon_public, indeksy, RLS.
--
-- Wklej CAŁOŚĆ w nowym projekcie Supabase → SQL Editor → Run.
-- ============================================================================

-- ============================================================
-- schema.sql
-- ============================================================
-- =============================================
-- Docvue App - Supabase Database Schema
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
drop trigger if exists "update_forms_updated_at" on forms;
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

-- ============================================================
-- add_pin_code.sql
-- ============================================================
ALTER TABLE salons ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- ============================================================
-- allow_form_read.sql
-- ============================================================
-- Allow public read access to forms so they can be viewed via token link
-- (The logic being: Forms contain only schema/title, no sensitive data)

CREATE POLICY "Anyone can view forms" ON forms
  FOR SELECT USING (true);

-- ============================================================
-- create_treatments_visits.sql
-- ============================================================
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

-- Enable RLS for treatments
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Treatments Policies
-- (pominięto duplikat polityki Salon owners can manage treatments on treatments)

-- (pominięto duplikat polityki Clients can view treatments on treatments) -- Publicly visible or restricted to salon clients? Public is easier for now.

-- Link Clients to Auth Users (for Client Portal)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create Appointments (Visits) Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, completed, cancelled
  notes TEXT,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL, -- Linked form response
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Appointments Policies
-- (pominięto duplikat polityki Salon owners can manage appointments on appointments)

-- (pominięto duplikat polityki Clients can view their own appointments on appointments)

-- Indexes
CREATE INDEX IF NOT EXISTS idx_treatments_salon_id ON treatments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- ============================================================
-- multi_forms_treatment.sql
-- ============================================================
-- Create junction table for Treatment <-> Forms
CREATE TABLE IF NOT EXISTS treatment_forms (
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (treatment_id, form_id)
);

-- Enable RLS
ALTER TABLE treatment_forms ENABLE ROW LEVEL SECURITY;

-- (pominięto duplikat polityki Salon owners can manage treatment_forms on treatment_forms)

-- (pominięto duplikat polityki everyone can view treatment_forms on treatment_forms)


-- Migrate existing data (if any)
INSERT INTO treatment_forms (treatment_id, form_id)
SELECT id, required_form_id FROM treatments WHERE required_form_id IS NOT NULL;

-- Remove old column
ALTER TABLE treatments DROP COLUMN required_form_id;

-- ============================================================
-- update_clients_schema.sql
-- ============================================================
-- Make phone required, email optional, and add birth_date to clients table

-- 1. Add birth_date column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Modify email to be NULLABLE
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- 3. Modify phone to be NOT NULL (We assume all current clients have phone or we might need to handle this)
-- First, ensure all rows have data if they don't (optional safety, or just fail if data is bad)
-- UPDATE clients SET phone = '' WHERE phone IS NULL; 
ALTER TABLE clients ALTER COLUMN phone SET NOT NULL;

-- ============================================================
-- visit_photos.sql
-- ============================================================
-- Add photo columns to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS before_photo_path TEXT,
ADD COLUMN IF NOT EXISTS after_photo_path TEXT;

-- NOTE: We use "path" instead of URL to store the relative path in bucket.

-- Create storage bucket if not exists (This usually requires API/Dashboard, strictly SQL can create simple buckets in some Supabase versions or via extension)
-- For standard Supabase storage, we insert into storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('visit-photos', 'visit-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Salon owners can upload visit photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'visit-photos' AND 
    auth.uid() IN (SELECT user_id FROM salons) -- Simplified check, ideally verify salon ownership
  );

CREATE POLICY "Salon owners can view visit photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'visit-photos' AND 
    auth.uid() IN (SELECT user_id FROM salons)
  );
  
CREATE POLICY "Salon owners can update visit photos" ON storage.objects
  FOR UPDATE WITH CHECK (
    bucket_id = 'visit-photos' AND 
    auth.uid() IN (SELECT user_id FROM salons)
  );

-- Extend status constraint if possible, but it's currently a VARCHAR default 'scheduled'.
-- We'll just start using 'pending_forms' in code.

-- ============================================================
-- 20240129_lock_forms.sql
-- ============================================================
-- 1. Funkcja sprawdzająca czy formularz ma wypełnienia
CREATE OR REPLACE FUNCTION check_form_schema_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Sprawdź, czy zmienia się struktura (schema)
  IF NEW.schema::text <> OLD.schema::text THEN
    -- Sprawdź, czy formularz ma jakiekolwiek wypełnienia (submissions)
    IF EXISTS (SELECT 1 FROM submissions WHERE form_id = OLD.id) THEN
      RAISE EXCEPTION 'Ten formularz został już wypełniony przez klientów. Edycja struktury jest zablokowana. Możesz go jedynie usunąć (co usunie również wszystkie odpowiedzi).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger uruchamiany przed aktualizacją
DROP TRIGGER IF EXISTS prevent_form_schema_update ON forms;
drop trigger if exists "prevent_form_schema_update" on forms;
CREATE TRIGGER prevent_form_schema_update
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION check_form_schema_update();

-- ============================================================
-- 20260305_create_beauty_plans.sql
-- ============================================================
-- Create beauty_plans table
CREATE TABLE IF NOT EXISTS beauty_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
    morning_description TEXT,
    evening_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(client_id)
);

-- Create beauty_plan_products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_time_of_day') THEN
        do $$ begin
  if not exists (select 1 from pg_type where typname = 'product_time_of_day') then
    create type product_time_of_day as enum ('morning', 'evening');
  end if;
end $$;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS beauty_plan_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES beauty_plans(id) ON DELETE CASCADE NOT NULL,
    time_of_day product_time_of_day NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    price NUMERIC(10, 2),
    usage_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure newly added columns exist if the table was already there
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS usage_description TEXT;

-- Set up Row Level Security (RLS) for beauty_plans
ALTER TABLE beauty_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can view beauty plans of their salon's clients" 
ON beauty_plans FOR SELECT 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert beauty plans for their salon's clients" ON beauty_plans;
CREATE POLICY "Users can insert beauty plans for their salon's clients" 
ON beauty_plans FOR INSERT 
WITH CHECK (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can update beauty plans of their salon's clients" 
ON beauty_plans FOR UPDATE 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can delete beauty plans of their salon's clients" 
ON beauty_plans FOR DELETE 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

-- Set up Row Level Security (RLS) for beauty_plan_products
ALTER TABLE beauty_plan_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can view beauty plan products of their salon's clients" 
ON beauty_plan_products FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert beauty plan products for their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can insert beauty plan products for their salon's clients" 
ON beauty_plan_products FOR INSERT 
WITH CHECK (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can update beauty plan products of their salon's clients" 
ON beauty_plan_products FOR UPDATE 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can delete beauty plan products of their salon's clients" 
ON beauty_plan_products FOR DELETE 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

-- Trigger for updated_at on beauty_plans
CREATE OR REPLACE FUNCTION update_beauty_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beauty_plans_updated_at ON beauty_plans;
drop trigger if exists "update_beauty_plans_updated_at" on beauty_plans;
CREATE TRIGGER update_beauty_plans_updated_at
BEFORE UPDATE ON beauty_plans
FOR EACH ROW
EXECUTE FUNCTION update_beauty_plans_updated_at();

-- Trigger for updated_at on beauty_plan_products
CREATE OR REPLACE FUNCTION update_beauty_plan_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beauty_plan_products_updated_at ON beauty_plan_products;
drop trigger if exists "update_beauty_plan_products_updated_at" on beauty_plan_products;
CREATE TRIGGER update_beauty_plan_products_updated_at
BEFORE UPDATE ON beauty_plan_products
FOR EACH ROW
EXECUTE FUNCTION update_beauty_plan_products_updated_at();

-- Add allow client profile view policy for beauty plans
DROP POLICY IF EXISTS "Clients can view their own beauty plans" ON beauty_plans;
CREATE POLICY "Clients can view their own beauty plans" 
ON beauty_plans FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Add allow client profile view policy for beauty plan products
DROP POLICY IF EXISTS "Clients can view their own beauty plan products" ON beauty_plan_products;
CREATE POLICY "Clients can view their own beauty plan products" 
ON beauty_plan_products FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
);

-- Public access policies for shareable links (security by obscurity via UUID)
DROP POLICY IF EXISTS "Anyone can view a beauty plan if they have the ID" ON beauty_plans;
CREATE POLICY "Anyone can view a beauty plan if they have the ID"
ON beauty_plans FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view beauty plan products if they have the plan ID" ON beauty_plan_products;
CREATE POLICY "Anyone can view beauty plan products if they have the plan ID"
ON beauty_plan_products FOR SELECT
USING (true);

-- ============================================================
-- 20260305_fix_products_and_cache.sql
-- ============================================================
-- 1. FIX THE BEAUTY PLAN PRODUCTS TABLE (Missing columns)
-- If the table existed from before but lacked image_url and usage_description
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS usage_description TEXT;
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS url TEXT;

-- 2. CREATE PRODUCT CACHE TABLE FOR FASTER SCRAPING
CREATE TABLE IF NOT EXISTS scraped_products_cache (
    url TEXT PRIMARY KEY,
    name TEXT,
    price NUMERIC(10, 2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Allow backend service role / authenticated users to read from the cache
ALTER TABLE scraped_products_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read scraped products cache" ON scraped_products_cache;
CREATE POLICY "Anyone can read scraped products cache" 
ON scraped_products_cache FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert scraped products" ON scraped_products_cache;
CREATE POLICY "Authenticated users can insert scraped products" 
ON scraped_products_cache FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update scraped products" ON scraped_products_cache;
CREATE POLICY "Authenticated users can update scraped products" 
ON scraped_products_cache FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 3. FIX POLICIES FOR BEAUTY PLANS (From previous instruction)
-- Allow salon owners to delete products
DROP POLICY IF EXISTS "Users can insert beauty plan products for their salon's clients" ON beauty_plan_products;
-- (pominięto duplikat polityki Users can insert beauty plan products for their salon's clients on beauty_plan_products)

DROP POLICY IF EXISTS "Users can delete beauty plan products of their salon's clients" ON beauty_plan_products;
-- (pominięto duplikat polityki Users can delete beauty plan products of their salon's clients on beauty_plan_products)

-- Fix public sharing view
DROP POLICY IF EXISTS "Anyone can view a beauty plan if they have the ID" ON beauty_plans;
-- (pominięto duplikat polityki Anyone can view a beauty plan if they have the ID on beauty_plans)

DROP POLICY IF EXISTS "Anyone can view beauty plan products if they have the plan ID" ON beauty_plan_products;
-- (pominięto duplikat polityki Anyone can view beauty plan products if they have the plan ID on beauty_plan_products)

-- ============================================================
-- 20260307_time_blocks_and_appointment_duration.sql
-- ============================================================
-- Create time_blocks table for calendar blocking / reservation
CREATE TABLE IF NOT EXISTS time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

-- Salon owners can manage their own time blocks
CREATE POLICY "Salon owners can manage time_blocks" ON time_blocks
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_blocks_salon_id ON time_blocks(salon_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON time_blocks(start_time);

-- Add custom duration column to appointments (allows overriding treatment default)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Backfill existing appointments with treatment duration
UPDATE appointments a
SET duration_minutes = t.duration_minutes
FROM treatments t
WHERE a.treatment_id = t.id
  AND a.duration_minutes IS NULL;

-- ============================================================
-- 20260502_add_staff_members.sql
-- ============================================================
-- Staff members table
-- Allows salon owners to invite staff accounts with limited dashboard access.
-- Staff cannot: manage other staff, change settings/PIN, delete clients/forms.

CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager')),
  avatar_path TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Unique constraint: one staff member per email per salon
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_salon_email_idx ON staff_members (salon_id, email);

-- Unique constraint: one staff_members row per auth user
CREATE UNIQUE INDEX IF NOT EXISTS staff_members_user_id_idx ON staff_members (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Salon owner can read/write all staff in their salon
CREATE POLICY "staff_members_owner_all" ON staff_members
  FOR ALL
  USING (
    salon_id = (SELECT id FROM salons WHERE user_id = auth.uid())
  )
  WITH CHECK (
    salon_id = (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- Staff members can read their own record
CREATE POLICY "staff_members_self_read" ON staff_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Staff members storage bucket (for avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-avatars', 'staff-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: salon owner can manage staff avatars
CREATE POLICY "staff_avatars_owner_manage" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'staff-avatars'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM salons WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'staff-avatars'
    AND (storage.foldername(name))[1] = (
      SELECT id::text FROM salons WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 20260503_appointments_staff.sql
-- ============================================================
-- Add staff_id to appointments
-- Allows assigning appointments to specific staff members

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);

-- ============================================================
-- 20260607_add_chat.sql
-- ============================================================
-- Chat messaging table for AI assistant + WhatsApp integration
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_client_lookup ON chat_messages(client_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Clients can see their own messages
CREATE POLICY "Clients can view their own chat messages" ON chat_messages
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Salon owners see all messages for their salon
CREATE POLICY "Salon owners can view chat messages" ON chat_messages
  FOR SELECT USING (
    salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())
  );

-- ============================================================
-- 20260607_add_treatment_indications.sql
-- ============================================================
-- Dodaje kolumnę indications do treatments dla lepszego dopasowania zabiegów do problemów klienta
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS indications TEXT[] DEFAULT '{}';

-- Indeks GIN dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_treatments_indications ON treatments USING GIN (indications);

-- ============================================================
-- 20260607_make_client_salon_nullable.sql
-- ============================================================
-- Allow clients to register without being assigned to a salon
ALTER TABLE clients ALTER COLUMN salon_id DROP NOT NULL;

-- Policy for unassigned clients to manage their own data
CREATE POLICY "Clients can manage their own profile" ON clients
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 20261005_import_fields.sql
-- ============================================================
-- ============================================================================
-- 20261005_import_fields.sql
-- Rozszerzenie schematu pod import Booksy (klienci + zabiegi) oraz dostęp
-- pracowników do danych gabinetu.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ZABIEGI — brakujące kolumny z eksportu
-- ----------------------------------------------------------------------------
alter table public.treatments
  add column if not exists category text,
  add column if not exists external_code text,
  add column if not exists price_max numeric(10,2),
  add column if not exists online_booking boolean not null default false,
  add column if not exists single_service_only boolean not null default false;

create index if not exists treatments_salon_category_idx
  on public.treatments (salon_id, category);

-- Klucz idempotencji importu (wiele NULL-i dozwolone w unikalnym indeksie)
create unique index if not exists treatments_salon_external_code_key
  on public.treatments (salon_id, external_code);

-- ----------------------------------------------------------------------------
-- 2. KLIENCI — brakujące kolumny z eksportu
-- ----------------------------------------------------------------------------
alter table public.clients
  add column if not exists external_code text,
  add column if not exists gender text,
  add column if not exists referral_source text,
  add column if not exists consent_notifications_sms boolean not null default true,
  add column if not exists consent_notifications_email boolean not null default true,
  add column if not exists consent_marketing_sms boolean not null default true,
  add column if not exists consent_marketing_email boolean not null default true,
  add column if not exists discount_services smallint not null default 0,
  add column if not exists discount_products smallint not null default 0,
  add column if not exists important_info text,
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists last_visit_at timestamptz,
  add column if not exists last_visit_staff_id uuid references public.staff_members(id) on delete set null,
  add column if not exists referred_by text,
  add column if not exists next_visit_at timestamptz;

create index if not exists clients_salon_phone_idx
  on public.clients (salon_id, phone);
create index if not exists clients_salon_last_visit_idx
  on public.clients (salon_id, last_visit_at);

create unique index if not exists clients_salon_external_code_key
  on public.clients (salon_id, external_code);

-- ----------------------------------------------------------------------------
-- 3. FORMS — usunięcie driftu: kod używa is_public, brak w migracjach
-- ----------------------------------------------------------------------------
alter table public.forms
  add column if not exists is_public boolean not null default false;

-- ----------------------------------------------------------------------------
-- 4. DOSTĘP PRACOWNIKÓW (RLS)
-- Bez tego zalogowany pracownik widzi puste listy, bo polityki są owner-only.
-- Funkcja SECURITY DEFINER przerywa rekurencję polityk salons <-> staff_members.
-- ----------------------------------------------------------------------------
create or replace function public.is_salon_staff(target_salon uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.salon_id = target_salon
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

revoke all on function public.is_salon_staff(uuid) from public;
grant execute on function public.is_salon_staff(uuid) to authenticated;

-- salons: pracownik widzi swój salon
drop policy if exists "Staff can view own salon" on public.salons;
create policy "Staff can view own salon"
  on public.salons for select
  using (public.is_salon_staff(id));

-- clients: pracownik widzi i dodaje klientów swojego gabinetu
drop policy if exists "Staff can view salon clients" on public.clients;
create policy "Staff can view salon clients"
  on public.clients for select
  using (public.is_salon_staff(salon_id));

drop policy if exists "Staff can insert salon clients" on public.clients;
create policy "Staff can insert salon clients"
  on public.clients for insert
  with check (public.is_salon_staff(salon_id));

-- treatments
drop policy if exists "Staff can view salon treatments" on public.treatments;
create policy "Staff can view salon treatments"
  on public.treatments for select
  using (public.is_salon_staff(salon_id));

-- appointments: odczyt, tworzenie, edycja przez pracownika
drop policy if exists "Staff can view salon appointments" on public.appointments;
create policy "Staff can view salon appointments"
  on public.appointments for select
  using (public.is_salon_staff(salon_id));

drop policy if exists "Staff can insert salon appointments" on public.appointments;
create policy "Staff can insert salon appointments"
  on public.appointments for insert
  with check (public.is_salon_staff(salon_id));

drop policy if exists "Staff can update salon appointments" on public.appointments;
create policy "Staff can update salon appointments"
  on public.appointments for update
  using (public.is_salon_staff(salon_id));

-- time_blocks: podgląd blokad
drop policy if exists "Staff can view salon time blocks" on public.time_blocks;
create policy "Staff can view salon time blocks"
  on public.time_blocks for select
  using (public.is_salon_staff(salon_id));

-- submissions: podgląd wypełnionych formularzy
drop policy if exists "Staff can view salon submissions" on public.submissions;
create policy "Staff can view salon submissions"
  on public.submissions for select
  using (public.is_salon_staff(salon_id));

-- client_forms: podgląd przypisań formularzy
drop policy if exists "Staff can view salon client forms" on public.client_forms;
create policy "Staff can view salon client forms"
  on public.client_forms for select
  using (public.is_salon_staff(salon_id));

-- staff_members: pracownik widzi listę kadry swojego gabinetu (kalendarz!)
drop policy if exists "Staff can view salon staff" on public.staff_members;
create policy "Staff can view salon staff"
  on public.staff_members for select
  using (public.is_salon_staff(salon_id));

-- beauty_plans / produkty: pełny dostęp dla pracowników gabinetu
drop policy if exists "Staff can manage salon beauty plans" on public.beauty_plans;
create policy "Staff can manage salon beauty plans"
  on public.beauty_plans for all
  using (public.is_salon_staff(salon_id))
  with check (public.is_salon_staff(salon_id));

drop policy if exists "Staff can manage salon beauty plan products" on public.beauty_plan_products;
create policy "Staff can manage salon beauty plan products"
  on public.beauty_plan_products for all
  using (
    exists (
      select 1 from public.beauty_plans bp
      where bp.id = beauty_plan_products.plan_id
        and public.is_salon_staff(bp.salon_id)
    )
  )
  with check (
    exists (
      select 1 from public.beauty_plans bp
      where bp.id = beauty_plan_products.plan_id
        and public.is_salon_staff(bp.salon_id)
    )
  );

-- ----------------------------------------------------------------------------
-- 5. WERYFIKACJA (opcjonalnie — odkomentuj, aby sprawdzić)
-- ----------------------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_name in ('clients','treatments')
-- order by table_name, ordinal_position;

-- ============================================================================
-- KONIEC
-- ============================================================================

-- ============================================================
-- 20261006_add_client_location.sql
-- ============================================================
-- ============================================================================
-- 20261006_add_client_location.sql
-- Dodaje pole "location" (miejscowość) do klientów + indeks do wyszukiwania.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.clients
  add column if not exists location text;

create index if not exists clients_salon_location_idx
  on public.clients (salon_id, location);

-- ============================================================================
-- KONIEC
-- ============================================================================

-- ============================================================
-- 20261007_add_salon_contact_fields.sql
-- ============================================================
-- ============================================================================
-- 20261007_add_salon_contact_fields.sql
-- Dodaje dane kontaktowe gabinetu wykorzystywane w formularzach (np. RODO).
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.salons
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists social_media text;

-- Publiczny widok danych kontaktowych gabinetu (bez pin_code i user_id).
-- Używany przez publiczne formularze (np. RODO) do automatycznego
-- uzupełniania znaczników. Widok działa z uprawnieniami właściciela,
-- dzięki czemu anonimowy klient nie potrzebuje polityki RLS na `salons`.
create or replace view public.salon_public as
select
  id,
  name,
  address,
  phone,
  email,
  website,
  social_media
from public.salons;

grant select on public.salon_public to anon, authenticated;

-- ============================================================================
-- KONIEC
-- ============================================================================

-- ============================================================
-- 20261008_add_salon_city.sql
-- ============================================================
-- ============================================================================
-- 20261008_add_salon_city.sql
-- Miasto gabinetu — używane m.in. w stopce podpisu na dokumencie/PDF
-- oraz jako znacznik [MIASTO] w formularzach.
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.salons
  add column if not exists city text;

-- Widok publiczny: dokładamy miasto na końcu listy kolumn.
create or replace view public.salon_public as
select
  id,
  name,
  address,
  phone,
  email,
  website,
  social_media,
  city
from public.salons;

grant select on public.salon_public to anon, authenticated;

-- ============================================================================
-- KONIEC
-- ============================================================================

-- ============================================================
-- 20261009_time_blocks_staff.sql
-- ============================================================
-- ============================================================================
-- 20261009_time_blocks_staff.sql
-- Blokady czasu mogą dotyczyć całego salonu (staff_id = NULL) albo jednego
-- pracownika (staff_id wskazuje osobę).
--
-- Idempotentna — można uruchomić wielokrotnie.
-- Wklej całość w Supabase → SQL Editor → Run.
-- ============================================================================

alter table public.time_blocks
  add column if not exists staff_id uuid references public.staff_members(id) on delete cascade;

create index if not exists time_blocks_salon_staff_idx
  on public.time_blocks (salon_id, staff_id);

-- ============================================================================
-- KONIEC
-- ============================================================================

-- ============================================================
-- 20261010_security_rls_hardening.sql
-- ============================================================
-- ============================================================================
-- 20261010_security_rls_hardening.sql
--
-- Zamyka krytyczne luki RLS: publiczne polityki `USING (true)` pozwalały
-- z kluczem anon na listowanie tokenów formularzy, forge'owanie submissions,
-- enumerację planów pielęgnacyjnych i odczyt schematów formularzy.
--
-- Aplikacja po tej zmianie czyta/zapisuje powyższe dane wyłącznie przez
-- server functions z klientem service-role po walidacji capability URL-a.
--
-- Uruchom w Supabase → SQL Editor (lub `supabase db push`). Idempotentna.
-- ============================================================================

-- 1. client_forms: usuń publiczny odczyt/zapis po tokenie
drop policy if exists "Anyone can view client_forms by token" on public.client_forms;
drop policy if exists "Anyone can update client_forms by token" on public.client_forms;

-- 2. submissions: usuń anonimowy INSERT (submissions tworzy wyłącznie serwer)
drop policy if exists "Anyone can submit with valid token" on public.submissions;

-- 3. forms: schematy formularzy nie są publiczne (tokenowy odczyt szedł przez RLS)
drop policy if exists "Anyone can view forms" on public.forms;

-- 4. treatments / treatment_forms: koniec publicznego listowania katalogu
drop policy if exists "Clients can view treatments" on public.treatments;
drop policy if exists "everyone can view treatment_forms" on public.treatment_forms;

-- 5. beauty_plans: publiczny link działa przez server function po UUID,
--    nie przez politykę RLS (wcześniej można było listować wszystkie plany)
drop policy if exists "Anyone can view a beauty plan if they have the ID" on public.beauty_plans;
drop policy if exists "Anyone can view beauty plan products if they have the plan ID" on public.beauty_plan_products;

-- 6. scraped_products_cache: tylko service role (server function scrapeProductFn)
drop policy if exists "Anyone can read scraped products cache" on public.scraped_products_cache;
drop policy if exists "Authenticated users can insert scraped products" on public.scraped_products_cache;
drop policy if exists "Authenticated users can update scraped products" on public.scraped_products_cache;

-- 7. Storage: visit-photos scope'owane po salonie (folder [1] = salon_id)
drop policy if exists "Salon owners can upload visit photos" on storage.objects;
drop policy if exists "Salon owners can view visit photos" on storage.objects;
drop policy if exists "Salon owners can update visit photos" on storage.objects;

drop policy if exists "visit_photos_owner_manage" on storage.objects;
create policy "visit_photos_owner_manage" on storage.objects
  for all
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = (
      select id::text from public.salons where user_id = auth.uid()
    )
  );

-- 8. Limity rozmiaru i typów MIME dla bucketów prywatnych
update storage.buckets
set file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('visit-photos', 'staff-avatars');

-- ============================================================================
-- KONIEC
-- ============================================================================
