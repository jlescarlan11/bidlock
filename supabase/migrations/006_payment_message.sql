-- Add payment_message column to listings table
-- Stores the reconciliation string (display_name or email prefix) shown to user at payment time
-- Prevents mismatch if display_name changes between payment and admin review
ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_message text;
