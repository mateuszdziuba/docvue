-- Create junction table for Treatment <-> Forms
CREATE TABLE IF NOT EXISTS treatment_forms (
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (treatment_id, form_id)
);

-- Enable RLS
ALTER TABLE treatment_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salon owners can manage treatment_forms" ON treatment_forms
  USING (treatment_id IN (SELECT id FROM treatments WHERE salon_id IN (SELECT id FROM salons WHERE user_id = auth.uid())));

CREATE POLICY "everyone can view treatment_forms" ON treatment_forms
  FOR SELECT USING (true);


-- Migrate existing data (if any)
INSERT INTO treatment_forms (treatment_id, form_id)
SELECT id, required_form_id FROM treatments WHERE required_form_id IS NOT NULL;

-- Remove old column
ALTER TABLE treatments DROP COLUMN required_form_id;
