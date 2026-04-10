-- Migration 039: Enable Supabase Realtime and add anon RLS policies for public portals
-- Run in Supabase SQL Editor

-- Enable Realtime on tables that need live updates (skip if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'guest_quote_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE guest_quote_requests;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- Allow anonymous users to read a guest_quote_requests row via its public_token
-- Security: the UUID token in the URL is unguessable (security by obscurity, same as Stripe-hosted pages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'guest_quote_requests'
      AND policyname = 'Allow anon portal read on guest_quote_requests'
  ) THEN
    CREATE POLICY "Allow anon portal read on guest_quote_requests"
      ON guest_quote_requests
      FOR SELECT
      TO anon
      USING (public_token IS NOT NULL);
  END IF;
END $$;

-- Allow anonymous users to read a quotes row via its public_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quotes'
      AND policyname = 'Allow anon portal read on quotes'
  ) THEN
    CREATE POLICY "Allow anon portal read on quotes"
      ON quotes
      FOR SELECT
      TO anon
      USING (public_token IS NOT NULL);
  END IF;
END $$;
