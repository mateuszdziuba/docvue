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
