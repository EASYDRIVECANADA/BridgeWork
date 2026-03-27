const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { sendHomeownerProAcceptedEmail } = require('../services/emailService');

exports.getNearbyPros = async (req, res) => {
    try {
        const { lat, lon, radius = 25, service_category } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        // Validate lat/lon are valid numbers to prevent injection
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        const parsedRadius = parseFloat(radius);

        if (isNaN(parsedLat) || isNaN(parsedLon) || isNaN(parsedRadius)) {
            return res.status(400).json({
                success: false,
                message: 'Latitude, longitude, and radius must be valid numbers'
            });
        }

        if (parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
            return res.status(400).json({
                success: false,
                message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
            });
        }

        const radiusMeters = parsedRadius * 1609.34;

        // Use parameterized RPC function to prevent SQL injection (fixes BUG-001)
        const { data, error } = await supabaseAdmin.rpc('find_nearby_pros', {
            p_lon: parsedLon,
            p_lat: parsedLat,
            p_radius_meters: radiusMeters,
            p_service_category: service_category || null
        });

        if (error) {
            logger.error('Get nearby pros error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to find nearby pros'
            });
        }

        res.json({
            success: true,
            data: { pros: data || [] }
        });
    } catch (error) {
        logger.error('Get nearby pros controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to find nearby pros'
        });
    }
};

exports.getProById = async (req, res) => {
    try {
        const { id } = req.params;

        const selectQuery = `
                *,
                profiles!pro_profiles_user_id_fkey (
                    id,
                    full_name,
                    email,
                    phone,
                    avatar_url,
                    city,
                    state
                ),
                reviews (
                    id,
                    rating,
                    comment,
                    created_at,
                    profiles (
                        full_name,
                        avatar_url
                    )
                )
            `;

        // Try lookup by pro_profiles.id first
        let { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .select(selectQuery)
            .eq('id', id)
            .single();

        // If not found, try lookup by user_id (for when pro dashboard passes user's profile ID)
        if (error || !data) {
            const result = await supabaseAdmin
                .from('pro_profiles')
                .select(selectQuery)
                .eq('user_id', id)
                .single();
            data = result.data;
            error = result.error;
        }

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Pro not found'
            });
        }

        res.json({
            success: true,
            data: { pro: data }
        });
    } catch (error) {
        logger.error('Get pro by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pro'
        });
    }
};

exports.applyToBePro = async (req, res) => {
    try {
        const {
            business_name,
            business_license,
            insurance_info,
            certifications,
            experience_years,
            service_areas,
            service_categories,
            documents
        } = req.body;

        const { data: existingApp } = await supabaseAdmin
            .from('pro_applications')
            .select('id, status')
            .eq('user_id', req.user.id)
            .single();

        if (existingApp) {
            if (existingApp.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'You already have a pending application'
                });
            } else if (existingApp.status === 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'You are already a pro'
                });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('pro_applications')
            .insert({
                user_id: req.user.id,
                business_name,
                business_license,
                insurance_info,
                certifications,
                experience_years,
                service_areas,
                service_categories,
                documents,
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            logger.error('Apply to be pro error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to submit application'
            });
        }

        logger.info('Pro application submitted', { userId: req.user.id });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: { application: data }
        });
    } catch (error) {
        logger.error('Apply to be pro controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to submit application'
        });
    }
};

exports.getProJobs = async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, service_categories')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        let query;

        if (status === 'pending') {
            // Job alerts: unassigned pending bookings (pro_id is null)
            // With escrow, these bookings already have payment held
            query = supabaseAdmin
                .from('bookings')
                .select(`
                    *,
                    services (id, name, category_id, image_url),
                    profiles:user_id (
                        full_name,
                        phone,
                        email,
                        avatar_url
                    ),
                    transactions (id, status, amount)
                `, { count: 'exact' })
                .is('pro_id', null)
                .eq('status', 'pending')
                .order('scheduled_datetime', { ascending: true })
                .range(offset, offset + parseInt(limit) - 1);
        } else {
            // Pro's own assigned jobs (accepted, in_progress, completed, etc.)
            query = supabaseAdmin
                .from('bookings')
                .select(`
                    *,
                    services (id, name, category_id, image_url),
                    profiles:user_id (
                        full_name,
                        phone,
                        email,
                        avatar_url
                    ),
                    transactions (id, status, amount)
                `, { count: 'exact' })
                .eq('pro_id', proProfile.id);

            if (status) {
                query = query.eq('status', status);
            }

            query = query
                .order('scheduled_datetime', { ascending: true })
                .range(offset, offset + parseInt(limit) - 1);
        }

        const { data, error, count } = await query;

        if (error) {
            logger.error('Get pro jobs error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch jobs'
            });
        }

        res.json({
            success: true,
            data: {
                jobs: data || [],
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: count || 0
                }
            }
        });
    } catch (error) {
        logger.error('Get pro jobs controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs'
        });
    }
};

exports.getProJobHistory = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        const { data, error, count } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                services (id, name, category_id, image_url),
                profiles:user_id (
                    full_name,
                    phone,
                    email,
                    avatar_url
                ),
                reviews (
                    id,
                    rating,
                    comment,
                    created_at,
                    response,
                    response_date
                ),
                transactions (id, status, amount)
            `, { count: 'exact' })
            .eq('pro_id', proProfile.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

        if (error) {
            logger.error('Get pro job history error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch job history'
            });
        }

        res.json({
            success: true,
            data: {
                jobs: data || [],
                pagination: {
                    limit: parseInt(limit, 10),
                    offset: parseInt(offset, 10),
                    total: count || 0
                }
            }
        });
    } catch (error) {
        logger.error('Get pro job history controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch job history'
        });
    }
};

exports.acceptJob = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or already assigned'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .update({
                pro_id: proProfile.id,
                status: 'accepted'
            })
            .eq('id', id)
            .select(`
                *,
                services (id, name, category_id, image_url),
                profiles:user_id (
                    full_name,
                    phone,
                    email,
                    avatar_url
                )
            `)
            .single();

        if (error) {
            logger.error('Accept job error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to accept job'
            });
        }

        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'booking',
                title: 'Pro Accepted Your Booking',
                message: `Your booking ${booking.booking_number} has been accepted`,
                link: `/bookings/${booking.id}`,
                data: { booking_id: booking.id }
            });

        // Email the homeowner that a pro accepted their booking
        try {
            const homeownerProfile = data.profiles;
            if (homeownerProfile?.email) {
                // Get pro business name
                const { data: proInfo } = await supabaseAdmin
                    .from('pro_profiles')
                    .select('business_name')
                    .eq('id', proProfile.id)
                    .single();
                await sendHomeownerProAcceptedEmail(
                    homeownerProfile.email,
                    homeownerProfile.full_name || 'Homeowner',
                    booking,
                    proInfo?.business_name || 'Your assigned pro'
                );
            }
        } catch (emailErr) {
            logger.error('Failed to send homeowner pro-accepted email', { error: emailErr.message, bookingId: id });
        }

        logger.info('Job accepted', { bookingId: id, proId: proProfile.id });

        res.json({
            success: true,
            message: 'Job accepted successfully',
            data: { booking: data }
        });
    } catch (error) {
        logger.error('Accept job controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to accept job'
        });
    }
};

exports.declineJob = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Check if this is a quote assignment (free quote booking)
        const { data: assignment } = await supabaseAdmin
            .from('quote_assignments')
            .select('id, status')
            .eq('booking_id', id)
            .eq('pro_id', proProfile.id)
            .single();

        if (assignment) {
            // Quote assignment — update status to declined
            const { error: declineError } = await supabaseAdmin
                .from('quote_assignments')
                .update({
                    status: 'declined',
                    declined_reason: reason || null,
                    declined_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', assignment.id);

            if (declineError) {
                logger.error('Failed to decline quote assignment', { error: declineError.message, bookingId: id, proId: proProfile.id });
                return res.status(500).json({ success: false, message: 'Failed to decline quote assignment' });
            }
        } else {
            // Rate-based booking — clear pro_id and reset to pending so another pro can accept
            const { data: booking } = await supabaseAdmin
                .from('bookings')
                .select('pro_id, status')
                .eq('id', id)
                .single();

            if (booking && String(booking.pro_id) === String(proProfile.id) && booking.status === 'pending') {
                const { error: updateError } = await supabaseAdmin
                    .from('bookings')
                    .update({
                        pro_id: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (updateError) {
                    logger.error('Failed to unassign pro from booking', { error: updateError.message, bookingId: id });
                    return res.status(500).json({ success: false, message: 'Failed to decline job' });
                }
            }
        }

        logger.info('Job declined', { bookingId: id, proId: proProfile.id, reason });

        res.json({
            success: true,
            message: 'Job declined successfully'
        });
    } catch (error) {
        logger.error('Decline job controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to decline job'
        });
    }
};

// Submit proof of work — pro uploads photos + notes after completing the job
// NEW FLOW: Customer pays AFTER reviewing proof (no payment required before proof submission)
// ADDITIONAL INVOICE: Pro can optionally add extra charges (labor hours + materials)
exports.submitJobProof = async (req, res) => {
    try {
        const { id } = req.params;
        const { photos, notes, additional_invoice } = req.body;

        if (!photos || !Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one proof photo is required.'
            });
        }

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, business_name, user_id, hourly_rate')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Only allow proof submission for accepted jobs assigned to this pro
        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', id)
            .eq('pro_id', proProfile.id)
            .in('status', ['accepted', 'in_progress'])
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found or not in a state where proof can be submitted.'
            });
        }

        // Insert proof record
        const { data: proof, error: proofError } = await supabaseAdmin
            .from('job_proof')
            .insert({
                booking_id: id,
                pro_id: proProfile.id,
                photos,
                notes: notes || null,
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (proofError) {
            logger.error('Submit job proof error', { error: proofError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to submit proof'
            });
        }

        // Handle additional invoice if provided
        let additionalInvoiceData = null;
        let finalTotalPrice = parseFloat(booking.total_price) || 0;
        const originalAmount = finalTotalPrice;

        if (additional_invoice && additional_invoice.has_additional_charges) {
            const additionalHours = parseFloat(additional_invoice.additional_hours) || 0;
            const hourlyRate = parseFloat(additional_invoice.hourly_rate) || parseFloat(proProfile.hourly_rate) || 0;
            const laborTotal = additionalHours * hourlyRate;

            // Calculate materials total
            const materials = additional_invoice.materials || [];
            let materialsTotal = 0;
            const processedMaterials = materials.map(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const total = quantity * unitPrice;
                materialsTotal += total;
                return {
                    name: item.name || '',
                    quantity,
                    unit_price: unitPrice,
                    total
                };
            }).filter(item => item.name && item.quantity > 0);

            const subtotal = laborTotal + materialsTotal;
            const taxRate = 0.13; // 13% tax
            const tax = subtotal * taxRate;
            const grandTotal = originalAmount + subtotal + tax;

            // Insert additional invoice record
            const { data: invoice, error: invoiceError } = await supabaseAdmin
                .from('additional_invoices')
                .insert({
                    booking_id: id,
                    pro_id: proProfile.id,
                    original_amount: originalAmount,
                    additional_hours: additionalHours,
                    hourly_rate: hourlyRate,
                    labor_total: laborTotal,
                    materials: processedMaterials,
                    materials_total: materialsTotal,
                    subtotal,
                    tax,
                    tax_rate: taxRate,
                    grand_total: grandTotal,
                    notes: additional_invoice.notes || null,
                    status: 'pending'
                })
                .select()
                .single();

            if (invoiceError) {
                logger.error('Create additional invoice error', { error: invoiceError.message });
                // Continue without additional invoice - don't fail the whole submission
            } else {
                additionalInvoiceData = invoice;
                finalTotalPrice = grandTotal;

                // Update booking with additional invoice flag and new total
                await supabaseAdmin
                    .from('bookings')
                    .update({
                        has_additional_invoice: true,
                        updated_total_price: grandTotal
                    })
                    .eq('id', id);
            }
        }

        // Update booking to mark proof submitted - customer will now review and pay
        await supabaseAdmin
            .from('bookings')
            .update({
                proof_submitted_at: new Date().toISOString(),
                status: 'proof_submitted'  // New status: waiting for customer review & payment
            })
            .eq('id', id);

        // Notify the customer to review proof and pay
        const priceMessage = additionalInvoiceData 
            ? `Review and pay $${finalTotalPrice.toFixed(2)} (includes additional charges) to complete.`
            : `Review and pay $${finalTotalPrice.toFixed(2)} to complete.`;

        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: booking.user_id,
                type: 'booking',
                title: additionalInvoiceData ? 'Job Complete - Review Invoice & Pay 📸' : 'Job Complete - Review & Pay 📸',
                message: `${proProfile.business_name || 'The pro'} has completed your ${booking.service_name} and submitted proof of work. ${priceMessage}`,
                link: `/my-jobs`,
                data: { 
                    booking_id: id, 
                    proof_id: proof.id,
                    has_additional_invoice: !!additionalInvoiceData,
                    additional_invoice_id: additionalInvoiceData?.id
                }
            });

        // Notify admins with a copy of the proof
        const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

        for (const admin of (admins || [])) {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: admin.id,
                    type: 'system',
                    title: additionalInvoiceData ? 'Proof + Additional Invoice Submitted' : 'Proof of Work Submitted',
                    message: `${proProfile.business_name || 'A pro'} submitted proof for ${booking.service_name} (${booking.booking_number}).${additionalInvoiceData ? ` Additional charges: $${(finalTotalPrice - originalAmount).toFixed(2)}` : ''} Awaiting customer review.`,
                    link: `/admin/proofs`,
                    data: { 
                        booking_id: id, 
                        proof_id: proof.id,
                        additional_invoice_id: additionalInvoiceData?.id
                    }
                });
        }

        logger.info('Job proof submitted', { 
            bookingId: id, 
            proId: proProfile.id, 
            photoCount: photos.length,
            hasAdditionalInvoice: !!additionalInvoiceData,
            originalAmount,
            finalTotal: finalTotalPrice
        });

        res.json({
            success: true,
            message: additionalInvoiceData 
                ? 'Proof and additional invoice submitted! The customer will review and pay to complete the job.'
                : 'Proof submitted! The customer will review and pay to complete the job.',
            data: { 
                proof,
                additional_invoice: additionalInvoiceData
            }
        });
    } catch (error) {
        logger.error('Submit job proof controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to submit proof'
        });
    }
};

// Upload proof files (images/PDFs) to Supabase Storage, return URLs
exports.uploadProofFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const { id } = req.params; // booking id
        const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
        const urls = [];

        // Ensure bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'proof-uploads');
        if (!bucketExists) {
            await supabaseAdmin.storage.createBucket('proof-uploads', {
                public: true,
                fileSizeLimit: 10 * 1024 * 1024, // 10MB
                allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf']
            });
            logger.info('Created "proof-uploads" storage bucket');
        }

        for (const file of req.files) {
            const fileExt = file.originalname.split('.').pop().toLowerCase();
            if (!allowedExts.includes(fileExt)) {
                return res.status(400).json({
                    success: false,
                    message: `File type .${fileExt} not allowed. Use JPG, PNG, or PDF.`
                });
            }

            const fileName = `${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from('proof-uploads')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                logger.error('Proof file upload error', { error: uploadError.message });
                return res.status(500).json({ success: false, message: 'Failed to upload file' });
            }

            const { data: urlData } = supabaseAdmin.storage
                .from('proof-uploads')
                .getPublicUrl(fileName);

            urls.push(urlData.publicUrl);
        }

        logger.info('Proof files uploaded', { bookingId: id, count: urls.length });

        res.status(201).json({
            success: true,
            data: { urls }
        });
    } catch (error) {
        logger.error('Upload proof files error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to upload proof files' });
    }
};

// Get proof for a booking (also returns additional invoice if exists)
exports.getJobProof = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: proof, error } = await supabaseAdmin
            .from('job_proof')
            .select('*')
            .eq('booking_id', id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !proof) {
            return res.status(404).json({
                success: false,
                message: 'No proof found for this booking.'
            });
        }

        // Also fetch additional invoice if it exists
        const { data: additionalInvoice } = await supabaseAdmin
            .from('additional_invoices')
            .select('*')
            .eq('booking_id', id)
            .single();

        res.json({
            success: true,
            data: { 
                proof,
                additional_invoice: additionalInvoice || null
            }
        });
    } catch (error) {
        logger.error('Get job proof error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch proof'
        });
    }
};

exports.updateProProfile = async (req, res) => {
    try {
        const {
            business_name,
            bio,
            service_categories,
            service_radius,
            hourly_rate,
            is_available,
            certifications,
            portfolio_images
        } = req.body;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        const updates = {};
        if (business_name !== undefined) updates.business_name = business_name;
        if (bio !== undefined) updates.bio = bio;
        if (service_categories !== undefined) updates.service_categories = service_categories;
        if (service_radius !== undefined) updates.service_radius = service_radius;
        if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate;
        if (is_available !== undefined) updates.is_available = is_available;
        if (certifications !== undefined) updates.certifications = certifications;
        if (portfolio_images !== undefined) updates.portfolio_images = portfolio_images;

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updates)
            .eq('id', proProfile.id)
            .select()
            .single();

        if (error) {
            logger.error('Update pro profile error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        logger.info('Pro profile updated', { proId: proProfile.id });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { profile: data }
        });
    } catch (error) {
        logger.error('Update pro profile controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            logger.error('Avatar upload error', { error: uploadError.message });
            return res.status(500).json({ success: false, message: 'Failed to upload photo' });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update the profile with the new avatar URL
        await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', req.user.id);

        logger.info('Avatar uploaded', { userId: req.user.id, url: publicUrl });

        res.json({
            success: true,
            message: 'Photo uploaded successfully',
            data: { avatar_url: publicUrl }
        });
    } catch (error) {
        logger.error('Avatar upload controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
};

exports.getMyProProfile = async (req, res) => {
    try {
        const { data: proProfile, error } = await supabaseAdmin
            .from('pro_profiles')
            .select('*, profiles!pro_profiles_user_id_fkey (full_name, email, phone, avatar_url, city)')
            .eq('user_id', req.user.id)
            .single();

        if (error || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        res.json({
            success: true,
            data: { proProfile }
        });
    } catch (error) {
        logger.error('Get my pro profile error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pro profile'
        });
    }
};

exports.getProStatistics = async (req, res) => {
    try {
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('id, rating, total_reviews, total_jobs, completed_jobs, acceptance_rate')
            .eq('user_id', req.user.id)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Get earnings from completed bookings this month
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: monthlyBookings } = await supabaseAdmin
            .from('bookings')
            .select('total_price, completed_at')
            .eq('pro_id', proProfile.id)
            .eq('status', 'completed')
            .gte('completed_at', firstOfMonth);

        const monthlyEarnings = (monthlyBookings || []).reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
        const monthlyCompleted = (monthlyBookings || []).length;

        // Get all-time earnings
        const { data: allBookings } = await supabaseAdmin
            .from('bookings')
            .select('total_price')
            .eq('pro_id', proProfile.id)
            .eq('status', 'completed');

        const totalEarnings = (allBookings || []).reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

        // Get pending job count
        const { count: pendingCount } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('pro_id', proProfile.id)
            .eq('status', 'pending');

        // Get active job count
        const { count: activeCount } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('pro_id', proProfile.id)
            .in('status', ['accepted', 'in_progress']);

        res.json({
            success: true,
            data: {
                statistics: {
                    rating: parseFloat(proProfile.rating) || 0,
                    total_reviews: proProfile.total_reviews || 0,
                    total_jobs: proProfile.total_jobs || 0,
                    completed_jobs: proProfile.completed_jobs || 0,
                    acceptance_rate: parseFloat(proProfile.acceptance_rate) || 0,
                    total_earnings: totalEarnings,
                    monthly_earnings: monthlyEarnings,
                    monthly_completed: monthlyCompleted,
                    pending_jobs: pendingCount || 0,
                    active_jobs: activeCount || 0,
                }
            }
        });
    } catch (error) {
        logger.error('Get pro statistics controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
};

/**
 * Admin: Set commission rate for a specific pro.
 * PATCH /api/pros/:id/commission
 */
exports.setProCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const { commission_rate } = req.body;

        // Validate rate: null to reset to default, or 0.00-1.00
        if (commission_rate !== null && commission_rate !== undefined) {
            const rate = parseFloat(commission_rate);
            if (isNaN(rate) || rate < 0 || rate > 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Commission rate must be between 0 and 1 (e.g., 0.15 for 15%), or null to reset to platform default.'
                });
            }
        }

        const updateValue = commission_rate === null || commission_rate === undefined
            ? null
            : parseFloat(commission_rate);

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update({ commission_rate: updateValue })
            .eq('id', id)
            .select('id, business_name, commission_rate')
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        logger.info('Pro commission rate updated', {
            proId: id,
            businessName: data.business_name,
            newRate: updateValue,
            isCustom: updateValue !== null,
        });

        res.json({
            success: true,
            message: updateValue !== null
                ? `Commission rate set to ${(updateValue * 100).toFixed(0)}% for ${data.business_name}`
                : `Commission rate reset to platform default for ${data.business_name}`,
            data: {
                pro_id: data.id,
                business_name: data.business_name,
                commission_rate: data.commission_rate,
                is_custom_rate: data.commission_rate !== null,
            }
        });
    } catch (error) {
        logger.error('Set pro commission error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update commission rate'
        });
    }
};

/**
 * Admin: Get all pros with their commission rates.
 * GET /api/pros/admin/list
 */
exports.getProsList = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .select(`
                id,
                business_name,
                commission_rate,
                rating,
                total_reviews,
                completed_jobs,
                is_available,
                is_verified,
                created_at,
                profiles!pro_profiles_user_id_fkey (
                    full_name,
                    email,
                    phone,
                    city,
                    state
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Get pros list error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch pros' });
        }

        res.json({
            success: true,
            data: {
                pros: data || [],
                total: (data || []).length,
            }
        });
    } catch (error) {
        logger.error('Get pros list controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch pros list' });
    }
};

exports.getMyAvailability = async (req, res) => {
    try {
        const proProfileId = req.profile?.pro_profile_id;
        if (!proProfileId) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        const { data, error } = await supabaseAdmin
            .from('pro_availability')
            .select('day_of_week, start_time, end_time, is_available')
            .eq('pro_id', proProfileId)
            .order('day_of_week', { ascending: true });

        if (error) {
            logger.error('Get availability error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to fetch availability' });
        }

        res.json({ success: true, data: { schedule: data || [] } });
    } catch (error) {
        logger.error('Get availability controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
};

exports.updateMyAvailability = async (req, res) => {
    try {
        const proProfileId = req.profile?.pro_profile_id;
        if (!proProfileId) {
            return res.status(404).json({ success: false, message: 'Pro profile not found' });
        }

        const { schedule } = req.body;
        if (!Array.isArray(schedule)) {
            return res.status(400).json({ success: false, message: 'schedule must be an array' });
        }

        // Delete existing schedule for this pro
        const { error: deleteError } = await supabaseAdmin
            .from('pro_availability')
            .delete()
            .eq('pro_id', proProfileId);

        if (deleteError) {
            logger.error('Delete availability error', { error: deleteError.message });
            return res.status(500).json({ success: false, message: 'Failed to update availability' });
        }

        // Insert new schedule rows (only days that have valid times)
        const rows = schedule
            .filter(d => Number.isInteger(d.day_of_week) && d.day_of_week >= 0 && d.day_of_week <= 6)
            .map(d => ({
                pro_id: proProfileId,
                day_of_week: d.day_of_week,
                start_time: d.start_time || '08:00',
                end_time: d.end_time || '17:00',
                is_available: d.is_available !== false,
            }));

        if (rows.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('pro_availability')
                .insert(rows);

            if (insertError) {
                logger.error('Insert availability error', { error: insertError.message });
                return res.status(500).json({ success: false, message: 'Failed to save availability' });
            }
        }

        res.json({ success: true, message: 'Availability updated successfully' });
    } catch (error) {
        logger.error('Update availability controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to update availability' });
    }
};
