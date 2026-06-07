-- Add staff_id to appointments
-- Allows assigning appointments to specific staff members

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON appointments(staff_id);
