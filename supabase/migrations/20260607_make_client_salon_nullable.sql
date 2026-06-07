-- Allow clients to register without being assigned to a salon
ALTER TABLE clients ALTER COLUMN salon_id DROP NOT NULL;

-- Policy for unassigned clients to manage their own data
CREATE POLICY "Clients can manage their own profile" ON clients
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
