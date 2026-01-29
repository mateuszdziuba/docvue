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
CREATE POLICY "Salon owners can manage treatments" ON treatments
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view treatments" ON treatments
  FOR SELECT USING (true); -- Publicly visible or restricted to salon clients? Public is easier for now.

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
CREATE POLICY "Salon owners can manage appointments" ON appointments
  USING (salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view their own appointments" ON appointments
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_treatments_salon_id ON treatments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
