INSERT INTO settings (id, listing_fee, gcash_qr_url, gcash_number, gcash_name)
VALUES (1, 50, '', '', '')
ON CONFLICT (id) DO NOTHING;
