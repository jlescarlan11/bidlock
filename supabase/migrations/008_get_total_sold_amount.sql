CREATE OR REPLACE FUNCTION get_total_sold_amount()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(current_bid), 0)
  FROM listings
  WHERE status = 'ended'
    AND winner_id IS NOT NULL;
$$;
