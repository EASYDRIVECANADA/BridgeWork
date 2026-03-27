const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { createNotification } = require('../services/notificationService');

// Helper to get tax rate from platform_settings (same as bookingsController)
const getDefaultTaxRate = async () => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'tax_rate')
            .eq('service_type', 'quote')
            .single();
        if (error || !data) return 0.13;
        return data.value / 100;
    } catch (err) {
        logger.error('Error fetching tax rate for quotes', { error: err.message });
        return 0.13;
    }
};

const crypto = require('crypto');

// Generate quote number
const generateQuoteNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    return `BW-Q-${year}${month}${day}-${random}`;
};

// Generate invoice number
const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    return `BW-INV-${year}${month}${day}-${random}`;
};

// Calculate quote totals from items (uses integer cents internally to avoid float drift)
const calculateTotals = (items, taxRate = 0.13, discountAmount = 0) => {
    const subtotalCents = items.reduce((sum, item) => {
        return sum + Math.round(parseFloat(item.quantity) * parseFloat(item.unit_price) * 100);
    }, 0);
    const discountCents = Math.round(parseFloat(discountAmount) * 100);
    const taxableCents = subtotalCents - discountCents;
    const taxAmountCents = Math.round(taxableCents * taxRate);
    const totalCents = taxableCents + taxAmountCents;
    return {
        subtotal: subtotalCents / 100,
        taxAmount: taxAmountCents / 100,
        total: totalCents / 100
    };
};

// ==================== QUOTES ====================

// Create a new quote (Pro only)
exports.createQuote = async (req, res) => {
    try {
        const {
            customer_id,
            booking_id,
            title,
            description,
            items,
            tax_rate,
            discount_amount,
            valid_until,
            notes
        } = req.body;

        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, user_id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only service professionals can create quotes'
            });
        }

        // Validate customer exists
        if (customer_id) {
            const { data: customer } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', customer_id)
                .single();

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found'
                });
            }
        }

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one line item is required'
            });
        }

        const defaultRate = await getDefaultTaxRate();
        const actualTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : defaultRate;
        const actualDiscount = discount_amount ? parseFloat(discount_amount) : 0;
        const { subtotal, taxAmount, total } = calculateTotals(items, actualTaxRate, actualDiscount);

        // Default valid_until to 30 days from now
        const defaultValidUntil = new Date();
        defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);

        // Create quote
        const { data: quote, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .insert({
                quote_number: generateQuoteNumber(),
                pro_id: proProfile.id,
                customer_id: customer_id || null,
                booking_id: booking_id || null,
                title,
                description: description || null,
                status: 'draft',
                subtotal,
                tax_rate: actualTaxRate,
                tax_amount: taxAmount,
                discount_amount: actualDiscount,
                total,
                currency: 'CAD',
                valid_until: valid_until || defaultValidUntil.toISOString().split('T')[0],
                notes: notes || null
            })
            .select()
            .single();

        if (quoteError) {
            logger.error('Create quote error', { error: quoteError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create quote'
            });
        }

        // Insert line items
        const itemsToInsert = items.map((item, index) => ({
            quote_id: quote.id,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price),
            unit: item.unit || 'each',
            amount: parseFloat((parseFloat(item.quantity || 1) * parseFloat(item.unit_price)).toFixed(2)),
            sort_order: item.sort_order !== undefined ? item.sort_order : index
        }));

        const { data: quoteItems, error: itemsError } = await supabaseAdmin
            .from('quote_items')
            .insert(itemsToInsert)
            .select();

        if (itemsError) {
            logger.error('Create quote items error', { error: itemsError.message });
            // Clean up the quote if items fail
            await supabaseAdmin.from('quotes').delete().eq('id', quote.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create quote items'
            });
        }

        logger.info('Quote created', { quoteId: quote.id, proId: proProfile.id });

        res.status(201).json({
            success: true,
            message: 'Quote created successfully',
            data: { quote: { ...quote, items: quoteItems } }
        });
    } catch (error) {
        logger.error('Create quote controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create quote'
        });
    }
};

// Get quotes list (filtered by role)
exports.getQuotes = async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        const role = req.profile.role;

        let query = supabaseAdmin
            .from('quotes')
            .select(`
                *,
                quote_items (*),
                pro_profiles (
                    id,
                    business_name,
                    profiles!pro_profiles_user_id_fkey (
                        full_name,
                        avatar_url,
                        email
                    )
                ),
                customer:profiles!quotes_customer_id_fkey (
                    id,
                    full_name,
                    email,
                    avatar_url
                ),
                bookings (
                    id,
                    booking_number,
                    service_name
                )
            `, { count: 'exact' });

        // Filter by role
        if (role === 'pro') {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (proProfile) {
                query = query.eq('pro_id', proProfile.id);
            }
        } else if (role === 'user') {
            query = query.eq('customer_id', req.user.id);
        }
        // Admin sees all

        if (status) {
            query = query.eq('status', status);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            logger.error('Get quotes error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch quotes'
            });
        }

        res.json({
            success: true,
            data: {
                quotes: data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get quotes controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quotes'
        });
    }
};

// Get single quote by ID
exports.getQuoteById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: quote, error } = await supabaseAdmin
            .from('quotes')
            .select(`
                *,
                quote_items (*),
                pro_profiles (
                    id,
                    business_name,
                    rating,
                    profiles!pro_profiles_user_id_fkey (
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url
                    )
                ),
                customer:profiles!quotes_customer_id_fkey (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url,
                    address,
                    city,
                    state,
                    zip_code
                ),
                bookings (
                    id,
                    booking_number,
                    service_name,
                    address,
                    city,
                    state
                )
            `)
            .eq('id', id)
            .single();

        if (error || !quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        // Check access
        const isAdmin = req.profile.role === 'admin';
        const isCustomer = quote.customer_id === req.user.id;
        let isPro = false;

        if (!isAdmin && !isCustomer) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            isPro = proProfile && proProfile.id === quote.pro_id;

            if (!isPro) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        // Mark as viewed if customer is viewing for the first time
        if (isCustomer && quote.status === 'sent' && !quote.viewed_at) {
            await supabaseAdmin
                .from('quotes')
                .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
                .eq('id', id);
            quote.viewed_at = new Date().toISOString();
            quote.status = 'viewed';
        }

        // Sort items by sort_order
        if (quote.quote_items) {
            quote.quote_items.sort((a, b) => a.sort_order - b.sort_order);
        }

        res.json({
            success: true,
            data: { quote }
        });
    } catch (error) {
        logger.error('Get quote by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote'
        });
    }
};

// Update a quote (Pro only, draft/sent status only)
exports.updateQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            customer_id,
            booking_id,
            items,
            tax_rate,
            discount_amount,
            valid_until,
            notes
        } = req.body;

        // Get pro profile
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only the quote creator can update it'
            });
        }

        // Fetch existing quote
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('quotes')
            .select('*')
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        if (!['draft', 'sent', 'viewed'].includes(existing.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot edit a quote with status "${existing.status}"`
            });
        }

        // Build update
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (customer_id !== undefined) updates.customer_id = customer_id;
        if (booking_id !== undefined) updates.booking_id = booking_id;
        if (valid_until !== undefined) updates.valid_until = valid_until;
        if (notes !== undefined) updates.notes = notes;

        // Recalculate totals if items changed
        if (items && Array.isArray(items) && items.length > 0) {
            const actualTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : parseFloat(existing.tax_rate);
            const actualDiscount = discount_amount !== undefined ? parseFloat(discount_amount) : parseFloat(existing.discount_amount);
            const { subtotal, taxAmount, total } = calculateTotals(items, actualTaxRate, actualDiscount);

            updates.subtotal = subtotal;
            updates.tax_rate = actualTaxRate;
            updates.tax_amount = taxAmount;
            updates.discount_amount = actualDiscount;
            updates.total = total;

            // Delete old items and insert new
            await supabaseAdmin.from('quote_items').delete().eq('quote_id', id);

            const itemsToInsert = items.map((item, index) => ({
                quote_id: id,
                description: item.description,
                quantity: parseFloat(item.quantity) || 1,
                unit_price: parseFloat(item.unit_price),
                unit: item.unit || 'each',
                amount: parseFloat((parseFloat(item.quantity || 1) * parseFloat(item.unit_price)).toFixed(2)),
                sort_order: item.sort_order !== undefined ? item.sort_order : index
            }));

            await supabaseAdmin.from('quote_items').insert(itemsToInsert);
        } else if (tax_rate !== undefined || discount_amount !== undefined) {
            // Recalculate with existing items
            const { data: existingItems } = await supabaseAdmin
                .from('quote_items')
                .select('*')
                .eq('quote_id', id);

            if (existingItems && existingItems.length > 0) {
                const actualTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : parseFloat(existing.tax_rate);
                const actualDiscount = discount_amount !== undefined ? parseFloat(discount_amount) : parseFloat(existing.discount_amount);
                const { subtotal, taxAmount, total } = calculateTotals(existingItems, actualTaxRate, actualDiscount);
                updates.subtotal = subtotal;
                updates.tax_rate = actualTaxRate;
                updates.tax_amount = taxAmount;
                updates.discount_amount = actualDiscount;
                updates.total = total;
            }
        }

        // If going back to draft after being sent
        if (existing.status === 'sent' || existing.status === 'viewed') {
            updates.status = 'draft';
            updates.sent_at = null;
            updates.viewed_at = null;
        }

        const { data: quote, error: updateError } = await supabaseAdmin
            .from('quotes')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                quote_items (*)
            `)
            .single();

        if (updateError) {
            logger.error('Update quote error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update quote'
            });
        }

        logger.info('Quote updated', { quoteId: id });

        res.json({
            success: true,
            message: 'Quote updated successfully',
            data: { quote }
        });
    } catch (error) {
        logger.error('Update quote controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update quote'
        });
    }
};

// Send quote to customer
exports.sendQuote = async (req, res) => {
    try {
        const { id } = req.params;

        // Get pro profile
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only the quote creator can send it'
            });
        }

        const { data: quote, error: fetchError } = await supabaseAdmin
            .from('quotes')
            .select('*')
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (fetchError || !quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        if (!quote.customer_id) {
            return res.status(400).json({
                success: false,
                message: 'Quote must have a customer before sending'
            });
        }

        if (!['draft', 'viewed'].includes(quote.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot send a quote with status "${quote.status}"`
            });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('quotes')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Send quote error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to send quote'
            });
        }

        // Notify customer
        await createNotification(quote.customer_id, {
            type: 'system',
            title: 'New Quote Received',
            message: `${proProfile.business_name || 'A service professional'} sent you a quote: "${quote.title}" for $${quote.total}`,
            link: `/dashboard/quotes/${quote.id}`,
            data: { quote_id: quote.id }
        });

        logger.info('Quote sent', { quoteId: id, customerId: quote.customer_id });

        res.json({
            success: true,
            message: 'Quote sent to customer',
            data: { quote: updated }
        });
    } catch (error) {
        logger.error('Send quote controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to send quote'
        });
    }
};

// Customer responds to quote (accept/decline)
exports.respondToQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, decline_reason, customer_notes } = req.body;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "accept" or "decline"'
            });
        }

        const { data: quote, error: fetchError } = await supabaseAdmin
            .from('quotes')
            .select('*, pro_profiles (id, user_id, business_name)')
            .eq('id', id)
            .eq('customer_id', req.user.id)
            .single();

        if (fetchError || !quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        if (!['sent', 'viewed'].includes(quote.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot respond to a quote with status "${quote.status}"`
            });
        }

        // Check if expired
        if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
            await supabaseAdmin
                .from('quotes')
                .update({ status: 'expired' })
                .eq('id', id);

            return res.status(400).json({
                success: false,
                message: 'This quote has expired'
            });
        }

        const updates = {
            customer_notes: customer_notes || null
        };

        if (action === 'accept') {
            updates.status = 'accepted';
            updates.accepted_at = new Date().toISOString();
        } else {
            updates.status = 'declined';
            updates.declined_at = new Date().toISOString();
            updates.decline_reason = decline_reason || null;
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('quotes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Respond to quote error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to respond to quote'
            });
        }

        // Notify pro
        if (quote.pro_profiles?.user_id) {
            const statusText = action === 'accept' ? 'accepted' : 'declined';
            await createNotification(quote.pro_profiles.user_id, {
                type: 'system',
                title: `Quote ${statusText}`,
                message: `Your quote "${quote.title}" has been ${statusText} by the customer`,
                link: `/pro-dashboard/quotes/${quote.id}`,
                data: { quote_id: quote.id }
            });
        }

        logger.info(`Quote ${action}ed`, { quoteId: id, customerId: req.user.id });

        res.json({
            success: true,
            message: `Quote ${action}ed successfully`,
            data: { quote: updated }
        });
    } catch (error) {
        logger.error('Respond to quote controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to respond to quote'
        });
    }
};

// Delete a quote (Pro only, draft status only)
exports.deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile && req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const query = supabaseAdmin
            .from('quotes')
            .select('*')
            .eq('id', id);

        if (req.profile.role !== 'admin') {
            query.eq('pro_id', proProfile.id);
        }

        const { data: quote, error: fetchError } = await query.single();

        if (fetchError || !quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        if (quote.status !== 'draft' && req.profile.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Can only delete draft quotes'
            });
        }

        // Delete items first (cascade should handle, but be explicit)
        await supabaseAdmin.from('quote_items').delete().eq('quote_id', id);
        await supabaseAdmin.from('quotes').delete().eq('id', id);

        logger.info('Quote deleted', { quoteId: id });

        res.json({
            success: true,
            message: 'Quote deleted successfully'
        });
    } catch (error) {
        logger.error('Delete quote controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to delete quote'
        });
    }
};

// ==================== INVOICES ====================

// Convert accepted quote to invoice
exports.convertQuoteToInvoice = async (req, res) => {
    try {
        const { id } = req.params; // quote ID
        const { due_date, notes } = req.body;

        // Get pro profile
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only the quote creator can convert it to an invoice'
            });
        }

        // Fetch quote with items
        const { data: quote, error: fetchError } = await supabaseAdmin
            .from('quotes')
            .select('*, quote_items (*)')
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (fetchError || !quote) {
            return res.status(404).json({
                success: false,
                message: 'Quote not found'
            });
        }

        if (quote.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Only accepted quotes can be converted to invoices'
            });
        }

        // Default due date: 30 days from now
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);

        // Create invoice
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
                invoice_number: generateInvoiceNumber(),
                quote_id: quote.id,
                booking_id: quote.booking_id,
                pro_id: proProfile.id,
                customer_id: quote.customer_id,
                title: quote.title,
                description: quote.description,
                status: 'draft',
                subtotal: quote.subtotal,
                tax_rate: quote.tax_rate,
                tax_amount: quote.tax_amount,
                discount_amount: quote.discount_amount,
                total: quote.total,
                amount_due: quote.total,
                currency: quote.currency,
                issue_date: new Date().toISOString().split('T')[0],
                due_date: due_date || defaultDue.toISOString().split('T')[0],
                notes: notes || null
            })
            .select()
            .single();

        if (invoiceError) {
            logger.error('Create invoice from quote error', { error: invoiceError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create invoice'
            });
        }

        // Copy quote items to invoice items
        if (quote.quote_items && quote.quote_items.length > 0) {
            const invoiceItems = quote.quote_items.map((item) => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                unit: item.unit,
                amount: item.amount,
                sort_order: item.sort_order
            }));

            await supabaseAdmin.from('invoice_items').insert(invoiceItems);
        }

        // Mark quote as converted
        await supabaseAdmin
            .from('quotes')
            .update({ status: 'converted' })
            .eq('id', id);

        logger.info('Quote converted to invoice', { quoteId: id, invoiceId: invoice.id });

        res.status(201).json({
            success: true,
            message: 'Invoice created from quote',
            data: { invoice }
        });
    } catch (error) {
        logger.error('Convert quote to invoice error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to convert quote to invoice'
        });
    }
};

// Create a standalone invoice (Pro only)
exports.createInvoice = async (req, res) => {
    try {
        const {
            customer_id,
            booking_id,
            title,
            description,
            items,
            tax_rate,
            discount_amount,
            due_date,
            notes
        } = req.body;

        // Get pro profile
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only service professionals can create invoices'
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one line item is required'
            });
        }

        const defaultRate = await getDefaultTaxRate();
        const actualTaxRate = tax_rate !== undefined ? parseFloat(tax_rate) : defaultRate;
        const actualDiscount = discount_amount ? parseFloat(discount_amount) : 0;
        const { subtotal, taxAmount, total } = calculateTotals(items, actualTaxRate, actualDiscount);

        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 30);

        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
                invoice_number: generateInvoiceNumber(),
                pro_id: proProfile.id,
                customer_id: customer_id || null,
                booking_id: booking_id || null,
                title,
                description: description || null,
                status: 'draft',
                subtotal,
                tax_rate: actualTaxRate,
                tax_amount: taxAmount,
                discount_amount: actualDiscount,
                total,
                amount_due: total,
                currency: 'CAD',
                issue_date: new Date().toISOString().split('T')[0],
                due_date: due_date || defaultDue.toISOString().split('T')[0],
                notes: notes || null
            })
            .select()
            .single();

        if (invoiceError) {
            logger.error('Create invoice error', { error: invoiceError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create invoice'
            });
        }

        const itemsToInsert = items.map((item, index) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price),
            unit: item.unit || 'each',
            amount: parseFloat((parseFloat(item.quantity || 1) * parseFloat(item.unit_price)).toFixed(2)),
            sort_order: item.sort_order !== undefined ? item.sort_order : index
        }));

        const { data: invoiceItems, error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .insert(itemsToInsert)
            .select();

        if (itemsError) {
            logger.error('Create invoice items error', { error: itemsError.message });
            await supabaseAdmin.from('invoices').delete().eq('id', invoice.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create invoice items'
            });
        }

        logger.info('Invoice created', { invoiceId: invoice.id, proId: proProfile.id });

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: { invoice: { ...invoice, items: invoiceItems } }
        });
    } catch (error) {
        logger.error('Create invoice controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice'
        });
    }
};

// Get invoices list
exports.getInvoices = async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        const role = req.profile.role;

        let query = supabaseAdmin
            .from('invoices')
            .select(`
                *,
                invoice_items (*),
                pro_profiles (
                    id,
                    business_name,
                    profiles!pro_profiles_user_id_fkey (
                        full_name,
                        avatar_url,
                        email
                    )
                ),
                customer:profiles!invoices_customer_id_fkey (
                    id,
                    full_name,
                    email,
                    avatar_url
                ),
                quotes (
                    id,
                    quote_number
                ),
                bookings (
                    id,
                    booking_number,
                    service_name
                )
            `, { count: 'exact' });

        if (role === 'pro') {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (proProfile) {
                query = query.eq('pro_id', proProfile.id);
            }
        } else if (role === 'user') {
            query = query.eq('customer_id', req.user.id);
        }

        if (status) {
            query = query.eq('status', status);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await query;

        if (error) {
            logger.error('Get invoices error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch invoices'
            });
        }

        res.json({
            success: true,
            data: {
                invoices: data,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get invoices controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};

// Get single invoice by ID
exports.getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: invoice, error } = await supabaseAdmin
            .from('invoices')
            .select(`
                *,
                invoice_items (*),
                pro_profiles (
                    id,
                    business_name,
                    rating,
                    profiles!pro_profiles_user_id_fkey (
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url
                    )
                ),
                customer:profiles!invoices_customer_id_fkey (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url,
                    address,
                    city,
                    state,
                    zip_code
                ),
                quotes (
                    id,
                    quote_number,
                    title
                ),
                bookings (
                    id,
                    booking_number,
                    service_name,
                    address,
                    city,
                    state
                )
            `)
            .eq('id', id)
            .single();

        if (error || !invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        // Check access
        const isAdmin = req.profile.role === 'admin';
        const isCustomer = invoice.customer_id === req.user.id;

        if (!isAdmin && !isCustomer) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();

            if (!proProfile || proProfile.id !== invoice.pro_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }
        }

        // Sort items
        if (invoice.invoice_items) {
            invoice.invoice_items.sort((a, b) => a.sort_order - b.sort_order);
        }

        res.json({
            success: true,
            data: { invoice }
        });
    } catch (error) {
        logger.error('Get invoice by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoice'
        });
    }
};

// Send invoice to customer
exports.sendInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, business_name')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(403).json({
                success: false,
                message: 'Only the invoice creator can send it'
            });
        }

        const { data: invoice, error: fetchError } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (fetchError || !invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        if (!invoice.customer_id) {
            return res.status(400).json({
                success: false,
                message: 'Invoice must have a customer before sending'
            });
        }

        if (invoice.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: `Cannot send an invoice with status "${invoice.status}"`
            });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Send invoice error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to send invoice'
            });
        }

        // Notify customer
        await createNotification(invoice.customer_id, {
            type: 'payment',
            title: 'New Invoice Received',
            message: `${proProfile.business_name || 'A service professional'} sent you an invoice for $${invoice.total} — due ${invoice.due_date}`,
            link: `/dashboard/invoices/${invoice.id}`,
            data: { invoice_id: invoice.id }
        });

        logger.info('Invoice sent', { invoiceId: id, customerId: invoice.customer_id });

        res.json({
            success: true,
            message: 'Invoice sent to customer',
            data: { invoice: updated }
        });
    } catch (error) {
        logger.error('Send invoice controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to send invoice'
        });
    }
};

// Update invoice status (for payment recording)
exports.updateInvoiceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, amount_paid, payment_method } = req.body;

        // Admin or pro can update
        let proId = null;
        if (req.profile.role === 'pro') {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            proId = proProfile?.id;
        }

        const query = supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('id', id);

        if (req.profile.role !== 'admin' && proId) {
            query.eq('pro_id', proId);
        }

        const { data: invoice, error: fetchError } = await query.single();

        if (fetchError || !invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const updates = {};

        if (status) updates.status = status;
        if (payment_method) updates.payment_method = payment_method;

        if (amount_paid !== undefined) {
            const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount_paid);
            updates.amount_paid = newAmountPaid;
            updates.amount_due = parseFloat(invoice.total) - newAmountPaid;

            if (newAmountPaid >= parseFloat(invoice.total)) {
                updates.status = 'paid';
                updates.paid_at = new Date().toISOString();
                updates.amount_due = 0;
            } else if (newAmountPaid > 0) {
                updates.status = 'partially_paid';
            }
        }

        if (status === 'cancelled') {
            updates.status = 'cancelled';
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('invoices')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logger.error('Update invoice status error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update invoice'
            });
        }

        logger.info('Invoice updated', { invoiceId: id, status: updated.status });

        res.json({
            success: true,
            message: 'Invoice updated successfully',
            data: { invoice: updated }
        });
    } catch (error) {
        logger.error('Update invoice status error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice'
        });
    }
};

// Get quote/invoice stats for dashboard
exports.getStats = async (req, res) => {
    try {
        let proId = null;

        if (req.profile.role === 'pro') {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .single();
            proId = proProfile?.id;
        }

        // Quote stats
        let quoteQuery = supabaseAdmin
            .from('quotes')
            .select('status, total', { count: 'exact' });

        if (proId) quoteQuery = quoteQuery.eq('pro_id', proId);
        else if (req.profile.role === 'user') quoteQuery = quoteQuery.eq('customer_id', req.user.id);

        const { data: quotes } = await quoteQuery;

        const quoteStats = {
            total: quotes?.length || 0,
            draft: quotes?.filter(q => q.status === 'draft').length || 0,
            sent: quotes?.filter(q => q.status === 'sent').length || 0,
            accepted: quotes?.filter(q => q.status === 'accepted').length || 0,
            declined: quotes?.filter(q => q.status === 'declined').length || 0,
            total_value: quotes?.reduce((sum, q) => sum + parseFloat(q.total), 0) || 0,
            accepted_value: quotes?.filter(q => q.status === 'accepted').reduce((sum, q) => sum + parseFloat(q.total), 0) || 0
        };

        // Invoice stats
        let invoiceQuery = supabaseAdmin
            .from('invoices')
            .select('status, total, amount_paid, amount_due');

        if (proId) invoiceQuery = invoiceQuery.eq('pro_id', proId);
        else if (req.profile.role === 'user') invoiceQuery = invoiceQuery.eq('customer_id', req.user.id);

        const { data: invoices } = await invoiceQuery;

        const invoiceStats = {
            total: invoices?.length || 0,
            draft: invoices?.filter(i => i.status === 'draft').length || 0,
            sent: invoices?.filter(i => i.status === 'sent').length || 0,
            paid: invoices?.filter(i => i.status === 'paid').length || 0,
            overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
            total_value: invoices?.reduce((sum, i) => sum + parseFloat(i.total), 0) || 0,
            total_paid: invoices?.reduce((sum, i) => sum + parseFloat(i.amount_paid), 0) || 0,
            total_outstanding: invoices?.reduce((sum, i) => sum + parseFloat(i.amount_due), 0) || 0
        };

        res.json({
            success: true,
            data: { quotes: quoteStats, invoices: invoiceStats }
        });
    } catch (error) {
        logger.error('Get stats error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats'
        });
    }
};

// ==================== QUOTE BOOKINGS AS INVOICES (Admin) ====================

/**
 * Get all quote-based bookings formatted as invoices for admin view
 * GET /api/quotes/admin/quote-invoices
 */
exports.getQuoteBookingsAsInvoices = async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        // Get all booking IDs that went through the admin assignment flow
        const { data: assignedRows } = await supabaseAdmin
            .from('quote_assignments')
            .select('booking_id');
        const assignedIds = [...new Set((assignedRows || []).map(r => r.booking_id).filter(Boolean))];

        // Get bookings that have quotations (free quote flow)
        // Include: (a) bookings directly assigned via quote_assignments, (b) bookings where customer selected a quotation
        let query = supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, category_id, image_url),
                profiles!bookings_user_id_fkey (id, full_name, email, phone, avatar_url),
                pro_profiles (
                    id,
                    business_name,
                    profiles!pro_profiles_user_id_fkey (
                        full_name,
                        email,
                        phone
                    )
                ),
                transactions (
                    id,
                    amount,
                    status,
                    created_at
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (assignedIds.length > 0) {
            query = query.or(`id.in.(${assignedIds.join(',')}),selected_quotation_id.not.is.null`);
        } else {
            query = query.not('selected_quotation_id', 'is', null);
        }

        // Filter by status if provided
        if (status === 'pending') {
            query = query.in('status', ['accepted', 'in_progress']);
        } else if (status === 'paid') {
            query = query.eq('status', 'completed');
        }

        query = query.range(offset, parseInt(offset) + parseInt(limit) - 1);

        const { data: bookings, error, count } = await query;

        if (error) {
            logger.error('Get quote bookings as invoices error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch quote invoices'
            });
        }

        // Fetch quotations separately to avoid relationship ambiguity
        let quotationsMap = {};
        if (bookings && bookings.length > 0) {
            const selectedQuotationIds = bookings.map(b => b.selected_quotation_id).filter(Boolean);
            if (selectedQuotationIds.length > 0) {
                const { data: quotations } = await supabaseAdmin
                    .from('booking_quotations')
                    .select('id, booking_id, pro_id, quoted_price, description, estimated_duration, materials_included, warranty_info, notes, status, created_at, selected_at')
                    .in('id', selectedQuotationIds);
                
                (quotations || []).forEach(q => {
                    quotationsMap[q.id] = q;
                });
            }
        }

        // Transform bookings to invoice-like format
        const quoteInvoices = (bookings || []).map(booking => {
            // Get quotation from the map using selected_quotation_id (may be null for direct-assigned jobs)
            const quotation = quotationsMap[booking.selected_quotation_id] || {};
            const isDirect = !booking.selected_quotation_id;
            const transaction = booking.transactions?.find(t => t.status === 'succeeded' || t.status === 'held');
            
            // Parse extended data from notes (materials_list, your_price, etc.)
            let extendedData = {};
            if (quotation.notes) {
                try {
                    const parsed = JSON.parse(quotation.notes);
                    if (parsed && typeof parsed === 'object' && 'original_notes' in parsed) {
                        extendedData = parsed;
                    }
                } catch {
                    // Notes is plain text
                }
            }

            // Calculate totals — for direct assignments use booking's total_price if no quotation
            const workPrice = extendedData.your_price || quotation.quoted_price || booking.total_price || 0;
            const materialsList = extendedData.materials_list || [];
            const materialsTotal = materialsList.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
            const subtotal = parseFloat(workPrice) + materialsTotal;
            const taxRate = 0.13; // 13% tax
            const taxAmount = subtotal * taxRate;
            const total = subtotal + taxAmount;

            // Determine invoice status
            let invoiceStatus = isDirect ? 'direct_assigned' : 'pending';
            if (booking.status === 'completed') {
                invoiceStatus = 'paid';
            } else if (transaction?.status === 'held') {
                invoiceStatus = 'held';
            } else if (booking.proof_submitted_at) {
                invoiceStatus = 'awaiting_approval';
            } else if (booking.status === 'accepted' || booking.status === 'in_progress') {
                invoiceStatus = isDirect ? 'direct_assigned' : 'pending';
            }

            return {
                id: booking.id,
                invoice_number: `BW-QT-${booking.booking_number || booking.id.slice(0, 8).toUpperCase()}`,
                type: 'quote_booking',
                booking_id: booking.id,
                booking_number: booking.booking_number,
                service_name: booking.service_name || booking.services?.name,
                service: booking.services,
                
                // Customer info
                customer_id: booking.user_id,
                customer: booking.profiles,
                
                // Pro info
                pro_id: booking.pro_id,
                pro: booking.pro_profiles,
                
                // Job details
                address: booking.address,
                city: booking.city,
                state: booking.state,
                postal_code: booking.postal_code,
                scheduled_date: booking.scheduled_date,
                scheduled_time: booking.scheduled_time,
                special_instructions: booking.special_instructions,
                
                // Quotation details
                quotation: {
                    id: quotation.id,
                    work_price: parseFloat(workPrice),
                    materials_included: quotation.materials_included,
                    materials_list: materialsList,
                    materials_total: materialsTotal,
                    description: quotation.description,
                    estimated_duration: quotation.estimated_duration,
                    duration_unit: extendedData.duration_unit || 'minutes',
                    warranty_info: quotation.warranty_info,
                    notes: extendedData.original_notes || (typeof quotation.notes === 'string' && !quotation.notes.startsWith('{') ? quotation.notes : ''),
                    created_at: quotation.created_at,
                    selected_at: quotation.selected_at
                },
                
                // Totals
                subtotal: parseFloat(subtotal.toFixed(2)),
                tax_rate: taxRate,
                tax_amount: parseFloat(taxAmount.toFixed(2)),
                total: parseFloat(total.toFixed(2)),
                
                // Status
                status: invoiceStatus,
                booking_status: booking.status,
                proof_submitted_at: booking.proof_submitted_at,
                
                // Payment
                transaction: transaction || null,
                paid_at: booking.status === 'completed' ? booking.updated_at : null,
                
                // Dates
                created_at: booking.created_at,
                updated_at: booking.updated_at
            };
        });

        res.json({
            success: true,
            data: {
                invoices: quoteInvoices,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get quote bookings as invoices error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quote invoices'
        });
    }
};
