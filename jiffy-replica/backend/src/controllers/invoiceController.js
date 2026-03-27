const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

async function createAutoInvoiceFromAcceptedQuote(bookingId) {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      user_id,
      service_name,
      address,
      city,
      state,
      zip_code,
      selected_quotation_id,
      base_price,
      tax,
      total_price,
      profiles:user_id (
        full_name
      )
    `)
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError || !booking || !booking.selected_quotation_id) {
    return null;
  }

  const { data: quotation, error: quotationError } = await supabaseAdmin
    .from('booking_quotations')
    .select('id, description, quoted_price')
    .eq('id', booking.selected_quotation_id)
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (quotationError || !quotation) {
    return null;
  }

  const subtotal = parseFloat(booking.base_price || quotation.quoted_price || 0) || 0;
  const tax = parseFloat(booking.tax || 0) || 0;
  const total = parseFloat(booking.total_price || subtotal + tax) || 0;
  const taxRate = subtotal > 0 ? tax / subtotal : 0;
  const issueDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const recipientName = booking.profiles?.full_name || 'Customer';
  const recipientAddress = [booking.address, booking.city, booking.state, booking.zip_code]
    .filter(Boolean)
    .join(', ');

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert({
      booking_id: bookingId,
      invoice_number: `INV-${Date.now()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      issue_date: issueDate,
      due_date: dueDate,
      subject: `${booking.service_name || 'Service'} Service Invoice`,
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      notes: 'Auto-generated from the accepted quote.',
      tax_rate: taxRate,
      subtotal,
      tax,
      total,
      items: [
        {
          service: booking.service_name || 'Service',
          description: quotation.description || `Accepted quote for ${booking.service_name || 'service'}`,
          qty: 1,
          unit_cost: subtotal,
          total: subtotal,
        }
      ]
    })
    .select('*')
    .single();

  if (invoiceError) {
    logger.error('Auto invoice backfill failed', { error: invoiceError.message, bookingId, quotationId: quotation.id });
    return null;
  }

  return invoice;
}

// POST /bookings/:bookingId/invoice
exports.createInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      invoice_number,
      issue_date,
      due_date,
      subject,
      recipient_name,
      recipient_address,
      notes,
      tax_rate,
      subtotal,
      tax,
      total,
      items
    } = req.body;

    // Check booking exists
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        booking_id: bookingId,
        invoice_number,
        issue_date,
        due_date,
        subject,
        recipient_name,
        recipient_address,
        notes,
        tax_rate,
        subtotal,
        tax,
        total,
        items
      })
      .select()
      .single();

    if (invoiceError) {
      logger.error('Failed to create invoice', { error: invoiceError.message });
      return res.status(500).json({ success: false, message: invoiceError.message });
    }

    res.json({ success: true, data: { invoice } });
  } catch (err) {
    logger.error('Invoice creation error', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /bookings/:bookingId/invoice
exports.getInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;

    let { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (!invoice && !error) {
      invoice = await createAutoInvoiceFromAcceptedQuote(bookingId);
    }

    if (error || !invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: { invoice } });
  } catch (err) {
    logger.error('Invoice fetch error', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};
