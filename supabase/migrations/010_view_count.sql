-- Add view counter to listings
ALTER TABLE listings ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- Atomic increment RPC (avoids read-modify-write race)
CREATE OR REPLACE FUNCTION increment_listing_view(p_listing_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE listings SET view_count = view_count + 1 WHERE id = p_listing_id;
$$;
