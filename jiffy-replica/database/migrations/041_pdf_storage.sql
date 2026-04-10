-- Migration 041: PDF Document Storage
-- Adds quote_pdf_url to guest_quote_requests for stored PDF references
-- Creates a 'documents' storage bucket for all generated PDFs

-- Add PDF URL column to guest_quote_requests
ALTER TABLE guest_quote_requests
ADD COLUMN IF NOT EXISTS quote_pdf_url TEXT;

-- Create the documents storage bucket (for all generated PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,  -- 10 MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow public read access
CREATE POLICY "Public read access for documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Storage policy: allow service role to insert/update/delete
CREATE POLICY "Service role full access for documents"
ON storage.objects FOR ALL
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
