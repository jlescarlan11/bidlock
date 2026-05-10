-- Create storage buckets for listing photos and payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('listing-photos', 'listing-photos', true),
  ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- listing-photos: public read, authenticated upload
CREATE POLICY "listing_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "listing_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-photos');

-- payment-proofs: owner upload/read, admin read
CREATE POLICY "proof_upload_owner" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "proof_read_owner" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "proof_read_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
