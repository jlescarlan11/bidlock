-- Add unique username to profiles
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- Normalise on write: lowercase, trim whitespace
CREATE OR REPLACE FUNCTION normalise_username()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.username := lower(trim(NEW.username));
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_normalise_username
  BEFORE INSERT OR UPDATE OF username ON profiles
  FOR EACH ROW
  WHEN (NEW.username IS NOT NULL)
  EXECUTE FUNCTION normalise_username();
