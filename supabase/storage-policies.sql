-- Run in Supabase SQL editor after creating the storage buckets:
-- 1. listing-photos (public bucket)
-- 2. payment-proofs (private bucket)

-- payment-proofs: owner can upload/read, admins can read
CREATE POLICY "proof_upload_owner" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_read_owner" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "proof_read_admin" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
