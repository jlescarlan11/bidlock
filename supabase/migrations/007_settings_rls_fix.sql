-- The settings_update_admin policy had no explicit WITH CHECK clause, causing
-- PostgreSQL to default WITH CHECK to the USING expression. In some PostgREST
-- versions this re-evaluation on the post-update row state fails unexpectedly.
-- Recreate with an explicit WITH CHECK (true) — the USING clause already
-- restricts who can initiate the update; the resulting row state is irrelevant.
--
-- Also add an INSERT policy so admins can create the settings row if it doesn't
-- exist, and switch the action to upsert for robustness.

DROP POLICY IF EXISTS "settings_update_admin" ON settings;

CREATE POLICY "settings_update_admin" ON settings
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (true);

CREATE POLICY "settings_insert_admin" ON settings
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
