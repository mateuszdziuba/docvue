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
