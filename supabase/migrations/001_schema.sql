-- Enums
CREATE TYPE listing_status AS ENUM (
  'pending_payment', 'awaiting_review', 'rejected',
  'live', 'ended', 'cancelled'
);
CREATE TYPE dispute_status AS ENUM ('open', 'dismissed', 'upheld');
CREATE TYPE rating_verdict AS ENUM ('up', 'down');

-- Profiles (auto-created via trigger on auth.users insert)
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name  text,
  phone_number  text,
  gcash_name    text,
  is_admin      boolean NOT NULL DEFAULT false,
  strike_count  int NOT NULL DEFAULT 0,
  banned_until  timestamptz,
  permabanned   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Settings (single row)
CREATE TABLE settings (
  id            int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  listing_fee   numeric NOT NULL DEFAULT 50,
  gcash_qr_url  text NOT NULL DEFAULT '',
  gcash_number  text NOT NULL DEFAULT '',
  gcash_name    text NOT NULL DEFAULT ''
);

-- Listings
CREATE TABLE listings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auctioneer_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title               text NOT NULL,
  description         text NOT NULL,
  starting_bid        numeric NOT NULL CHECK (starting_bid > 0),
  current_bid         numeric NOT NULL CHECK (current_bid > 0),
  current_bidder_id   uuid REFERENCES profiles,
  duration_days       int NOT NULL CHECK (duration_days IN (1, 3, 7)),
  status              listing_status NOT NULL DEFAULT 'pending_payment',
  rejection_reason    text,
  payment_proof_url   text,
  payment_reference   text,
  listing_fee         numeric NOT NULL,
  starts_at           timestamptz,
  ends_at             timestamptz,
  winner_id           uuid REFERENCES profiles,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX listings_status_idx ON listings (status);
CREATE INDEX listings_ends_at_idx ON listings (ends_at) WHERE status = 'live';

-- Listing photos
CREATE TABLE listing_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  storage_path  text NOT NULL,
  display_order int NOT NULL,
  CONSTRAINT display_order_range CHECK (display_order BETWEEN 0 AND 4),
  UNIQUE (listing_id, display_order)
);

-- Bids
CREATE TABLE bids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  bidder_id   uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount      numeric NOT NULL CHECK (amount > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bids_listing_id_idx ON bids (listing_id, created_at DESC);

-- Ratings
CREATE TABLE ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  rater_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  ratee_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  verdict     rating_verdict NOT NULL,
  comment     text,
  UNIQUE (listing_id, rater_id)
);

-- Disputes
CREATE TABLE disputes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  reporter_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  reported_user_id  uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  reason            text NOT NULL,
  status            dispute_status NOT NULL DEFAULT 'open',
  admin_note        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz
);

-- Messages
CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

CREATE INDEX messages_listing_id_idx ON messages (listing_id, created_at ASC);

-- Notifications
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  listing_id  uuid REFERENCES listings ON DELETE CASCADE,
  type        text NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_read_public" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Settings
CREATE POLICY "settings_read_authenticated" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Listings
CREATE POLICY "listings_read_public" ON listings FOR SELECT USING (
  status IN ('live', 'ended')
);
CREATE POLICY "listings_read_own" ON listings FOR SELECT USING (
  auth.uid() = auctioneer_id
);
CREATE POLICY "listings_read_admin" ON listings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "listings_insert_authenticated" ON listings FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND phone_number IS NOT NULL
    AND gcash_name IS NOT NULL
    AND permabanned = false
    AND (banned_until IS NULL OR banned_until < now())
  )
);
CREATE POLICY "listings_update_owner_pending" ON listings FOR UPDATE USING (
  auth.uid() = auctioneer_id AND status IN ('pending_payment', 'awaiting_review')
);
CREATE POLICY "listings_update_admin" ON listings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Listing photos
CREATE POLICY "photos_read_public" ON listing_photos FOR SELECT USING (true);
CREATE POLICY "photos_insert_owner" ON listing_photos FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id
      AND auctioneer_id = auth.uid()
      AND status IN ('pending_payment', 'awaiting_review')
  )
);
CREATE POLICY "photos_delete_owner" ON listing_photos FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id
      AND auctioneer_id = auth.uid()
      AND status IN ('pending_payment', 'awaiting_review')
  )
);

-- Bids
CREATE POLICY "bids_read_public" ON bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status IN ('live', 'ended'))
);
CREATE POLICY "bids_read_participant" ON bids FOR SELECT USING (
  auth.uid() = bidder_id OR
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND auctioneer_id = auth.uid())
);
CREATE POLICY "bids_read_admin" ON bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Ratings
CREATE POLICY "ratings_read_all" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_participant" ON ratings FOR INSERT WITH CHECK (
  auth.uid() = rater_id AND
  EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id
    AND status = 'ended'
    AND (auctioneer_id = auth.uid() OR winner_id = auth.uid())
  )
);

-- Disputes
CREATE POLICY "disputes_insert_authenticated" ON disputes FOR INSERT WITH CHECK (
  auth.uid() = reporter_id AND auth.uid() IS NOT NULL
);
CREATE POLICY "disputes_read_own" ON disputes FOR SELECT USING (
  auth.uid() = reporter_id OR auth.uid() = reported_user_id
);
CREATE POLICY "disputes_read_admin" ON disputes FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "disputes_update_admin" ON disputes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Messages
CREATE POLICY "messages_read_participant" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

-- Notifications
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (
  auth.uid() = user_id
);
