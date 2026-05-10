-- Allow users to insert their own profile row.
-- Needed for users who signed up before the handle_new_user trigger existed,
-- and for the upsertProfile server action which uses .upsert().
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
