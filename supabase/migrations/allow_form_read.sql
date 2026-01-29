-- Allow public read access to forms so they can be viewed via token link
-- (The logic being: Forms contain only schema/title, no sensitive data)

CREATE POLICY "Anyone can view forms" ON forms
  FOR SELECT USING (true);
