-- place_bid: atomic bid placement with race protection
CREATE OR REPLACE FUNCTION place_bid(
  p_listing_id uuid,
  p_bidder_id  uuid,
  p_amount     numeric
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing  listings%ROWTYPE;
  v_min_bid  numeric;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_not_found';
  END IF;
  IF v_listing.status != 'live' THEN
    RAISE EXCEPTION 'auction_not_live';
  END IF;
  IF now() >= v_listing.ends_at THEN
    RAISE EXCEPTION 'auction_ended';
  END IF;
  IF p_bidder_id = v_listing.auctioneer_id THEN
    RAISE EXCEPTION 'bidder_is_auctioneer';
  END IF;

  v_min_bid := v_listing.current_bid + GREATEST(v_listing.current_bid * 0.05, 10);
  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'bid_too_low';
  END IF;

  INSERT INTO bids (listing_id, bidder_id, amount)
  VALUES (p_listing_id, p_bidder_id, p_amount);

  UPDATE listings
  SET current_bid = p_amount, current_bidder_id = p_bidder_id
  WHERE id = p_listing_id;

  IF (v_listing.ends_at - now()) < interval '2 minutes' THEN
    UPDATE listings SET ends_at = now() + interval '2 minutes' WHERE id = p_listing_id;
  END IF;

  RETURN json_build_object('success', true, 'amount', p_amount);
END;
$$;

-- finalize_auctions: called by cron to end expired live listings
CREATE OR REPLACE FUNCTION finalize_auctions()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing  listings%ROWTYPE;
  v_count    int := 0;
BEGIN
  FOR v_listing IN
    SELECT * FROM listings
    WHERE status = 'live' AND ends_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE listings
    SET status = 'ended', winner_id = current_bidder_id
    WHERE id = v_listing.id;

    INSERT INTO notifications (user_id, listing_id, type)
    VALUES (v_listing.auctioneer_id, v_listing.id, 'auction_ended');

    IF v_listing.current_bidder_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, listing_id, type)
      VALUES (v_listing.current_bidder_id, v_listing.id, 'auction_won');
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
