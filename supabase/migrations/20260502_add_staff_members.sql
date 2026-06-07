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
