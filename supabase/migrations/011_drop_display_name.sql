-- Copy display_name → username for rows that have no username yet
UPDATE profiles
SET username = LEFT(
  TRIM('_' FROM REGEXP_REPLACE(LOWER(TRIM(display_name)), '[^a-z0-9]+', '_', 'g')),
  20
)
WHERE username IS NULL AND display_name IS NOT NULL;

-- Resolve uniqueness conflicts by appending _2, _3, etc.
DO $$
DECLARE
  rec RECORD;
  n   INT;
  base TEXT;
BEGIN
  FOR rec IN
    SELECT id, username FROM profiles WHERE username IS NOT NULL ORDER BY created_at
  LOOP
    n    := 2;
    base := rec.username;
    WHILE EXISTS (
      SELECT 1 FROM profiles WHERE username = rec.username AND id != rec.id
    ) LOOP
      rec.username := LEFT(base, 17) || '_' || n;
      n := n + 1;
    END LOOP;
    UPDATE profiles SET username = rec.username WHERE id = rec.id;
  END LOOP;
END $$;

-- Drop display_name
ALTER TABLE profiles DROP COLUMN display_name;
