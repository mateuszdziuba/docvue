-- Make phone required, email optional, and add birth_date to clients table

-- 1. Add birth_date column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Modify email to be NULLABLE
ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;

-- 3. Modify phone to be NOT NULL (We assume all current clients have phone or we might need to handle this)
-- First, ensure all rows have data if they don't (optional safety, or just fail if data is bad)
-- UPDATE clients SET phone = '' WHERE phone IS NULL; 
ALTER TABLE clients ALTER COLUMN phone SET NOT NULL;
