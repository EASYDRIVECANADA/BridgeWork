/*
  Invoice table SQL migration for Supabase:

  CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    subject VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_address TEXT,
    notes TEXT,
    tax_rate NUMERIC(5,4) DEFAULT 0.13,
    subtotal NUMERIC(12,2),
    tax NUMERIC(12,2),
    total NUMERIC(12,2),
    items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
  CREATE UNIQUE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

  -- Enable RLS
  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

  -- Policy: Service role (backend) can do everything
  CREATE POLICY "Service role has full access"
    ON invoices
    USING (true)
    WITH CHECK (true);

  -- Policy: Pros can create invoices for their assigned bookings (client-side)
  CREATE POLICY "Pros can create invoices for their bookings"
    ON invoices FOR INSERT
    WITH CHECK (
      auth.role() = 'service_role' OR
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = booking_id AND b.pro_id = auth.uid()
      )
    );

  -- Policy: Users and pros can view invoices for their bookings (client-side)
  CREATE POLICY "Users and pros can view their invoices"
    ON invoices FOR SELECT
    USING (
      auth.role() = 'service_role' OR
      EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = booking_id AND (b.user_id = auth.uid() OR b.pro_id = auth.uid())
      )
    );
*/

// This file is kept for documentation purposes.
// The actual invoice operations use supabaseAdmin in the controller.
