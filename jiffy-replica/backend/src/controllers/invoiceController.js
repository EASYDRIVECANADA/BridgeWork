const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

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

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error || !invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: { invoice } });
  } catch (err) {
    logger.error('Invoice fetch error', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};
