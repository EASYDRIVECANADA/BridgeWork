const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// Onboarding steps:
// 0 = not started
// 1 = business info completed
// 2 = service agreement accepted
// 3 = professional requirements completed (services, insurance, references)
// 4 = stripe connect completed
// 5 = fully complete (pending admin approval)

const CURRENT_AGREEMENT_VERSION = '1.0';

/**
 * GET /api/onboarding/status
 * Get the current onboarding status for the logged-in pro
 */
exports.getOnboardingStatus = async (req, res) => {
    try {
        const { data: proProfile, error } = await supabaseAdmin
            .from('pro_profiles')
            .select('*, profiles!pro_profiles_user_id_fkey(full_name, email, phone, avatar_url)')
            .eq('user_id', req.user.id)
            .single();

        if (error) {
            logger.error('getOnboardingStatus query error', { error: error.message, userId: req.user.id });
        }

        if (error || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found. Please sign up as a pro first.'
            });
        }

        const steps = [
            {
                step: 1,
                title: 'Start with the basics',
                description: 'Fill in your business info',
                estimatedTime: '2 min',
                completed: proProfile.onboarding_step >= 1,
                required: true,
                fields: ['business_name', 'business_address', 'gst_number']
            },
            {
                step: 2,
                title: 'Digital Service Agreement',
                description: 'Review and accept the service agreement',
                estimatedTime: '5 min',
                completed: proProfile.onboarding_step >= 2,
                required: true,
                fields: ['service_agreement_accepted']
            },
            {
                step: 3,
                title: 'Professional requirements',
                description: 'Select services, insurance, and references',
                estimatedTime: '10 min',
                completed: proProfile.onboarding_step >= 3,
                required: true,
                fields: ['service_categories', 'insurance_policy_number', 'reference_1_name', 'reference_2_name']
            },
            {
                step: 4,
                title: 'Set up direct payment',
                description: 'Optional — connect Stripe to withdraw earnings',
                estimatedTime: '10 min',
                completed: proProfile.onboarding_step >= 4,
                required: false,
                fields: ['stripe_account_id']
            }
        ];

        // Progress is based on required steps only (1-3). Step 4 (Stripe) is optional.
        const requiredSteps = steps.filter(s => s.required);
        const completedRequired = requiredSteps.filter(s => s.completed).length;
        const progressPercent = Math.round((completedRequired / requiredSteps.length) * 100);

        res.json({
            success: true,
            data: {
                currentStep: proProfile.onboarding_step || 0,
                onboardingCompleted: proProfile.onboarding_completed || false,
                adminApproved: proProfile.admin_approved || false,
                adminRejectionReason: proProfile.admin_rejection_reason || null,
                progressPercent,
                steps,
                profile: {
                    id: proProfile.id,
                    user_id: proProfile.user_id,
                    full_name: proProfile.profiles?.full_name,
                    email: proProfile.profiles?.email,
                    phone: proProfile.profiles?.phone,
                    business_name: proProfile.business_name,
                    business_address: proProfile.business_address,
                    business_unit: proProfile.business_unit,
                    gst_number: proProfile.gst_number,
                    website: proProfile.website,
                    how_heard: proProfile.how_heard,
                    service_categories: proProfile.service_categories,
                    insurance_policy_number: proProfile.insurance_policy_number,
                    insurance_provider: proProfile.insurance_provider,
                    insurance_expiry: proProfile.insurance_expiry,
                    insurance_document_url: proProfile.insurance_document_url,
                    reference_1_name: proProfile.reference_1_name,
                    reference_1_phone: proProfile.reference_1_phone,
                    reference_1_email: proProfile.reference_1_email,
                    reference_1_relationship: proProfile.reference_1_relationship,
                    reference_2_name: proProfile.reference_2_name,
                    reference_2_phone: proProfile.reference_2_phone,
                    reference_2_email: proProfile.reference_2_email,
                    reference_2_relationship: proProfile.reference_2_relationship,
                    service_agreement_accepted: proProfile.service_agreement_accepted,
                    service_agreement_accepted_at: proProfile.service_agreement_accepted_at,
                    stripe_account_id: proProfile.stripe_account_id,
                    commission_rate: proProfile.commission_rate,
                    admin_approved: proProfile.admin_approved,
                }
            }
        });
    } catch (error) {
        logger.error('Get onboarding status error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get onboarding status' });
    }
};

/**
 * POST /api/onboarding/step/1
 * Submit business info (Step 1)
 */
exports.submitBusinessInfo = async (req, res) => {
    try {
        const {
            business_name,
            business_address,
            business_unit,
            gst_number,
            website,
            how_heard
        } = req.body;

        if (!business_name || !business_address) {
            return res.status(400).json({
                success: false,
                message: 'Business name and address are required'
            });
        }

        const updateData = {
            business_name,
            business_address,
            business_unit: business_unit || null,
            gst_number: gst_number || null,
            website: website || null,
            how_heard: how_heard || null,
            updated_at: new Date().toISOString()
        };

        // Only advance step if currently at step 0
        const { data: current } = await supabaseAdmin
            .from('pro_profiles')
            .select('onboarding_step')
            .eq('user_id', req.user.id)
            .single();

        if (current && (current.onboarding_step || 0) < 1) {
            updateData.onboarding_step = 1;
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            logger.error('Submit business info error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to save business info' });
        }

        logger.info('Business info submitted', { userId: req.user.id });
        res.json({
            success: true,
            message: 'Business info saved successfully',
            data: { onboarding_step: data.onboarding_step }
        });
    } catch (error) {
        logger.error('Submit business info controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to save business info' });
    }
};

/**
 * POST /api/onboarding/step/2
 * Accept digital service agreement (Step 2)
 */
exports.acceptServiceAgreement = async (req, res) => {
    try {
        const { accepted } = req.body;

        if (!accepted) {
            return res.status(400).json({
                success: false,
                message: 'You must accept the service agreement to continue'
            });
        }

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

        const updateData = {
            service_agreement_accepted: true,
            service_agreement_accepted_at: new Date().toISOString(),
            service_agreement_version: CURRENT_AGREEMENT_VERSION,
            service_agreement_ip: clientIp,
            updated_at: new Date().toISOString()
        };

        // Only advance step if currently at step 1
        const { data: current } = await supabaseAdmin
            .from('pro_profiles')
            .select('onboarding_step')
            .eq('user_id', req.user.id)
            .single();

        if (current && (current.onboarding_step || 0) < 2) {
            updateData.onboarding_step = 2;
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            logger.error('Accept service agreement error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to accept agreement' });
        }

        logger.info('Service agreement accepted', { userId: req.user.id, version: CURRENT_AGREEMENT_VERSION, ip: clientIp });
        res.json({
            success: true,
            message: 'Service agreement accepted',
            data: { onboarding_step: data.onboarding_step }
        });
    } catch (error) {
        logger.error('Accept service agreement controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to accept agreement' });
    }
};

/**
 * POST /api/onboarding/step/3
 * Submit professional requirements (Step 3) — services, insurance, references
 */
exports.submitRequirements = async (req, res) => {
    try {
        const {
            service_categories,
            insurance_policy_number,
            insurance_provider,
            insurance_expiry,
            insurance_document_url,
            reference_1_name,
            reference_1_phone,
            reference_1_email,
            reference_1_relationship,
            reference_2_name,
            reference_2_phone,
            reference_2_email,
            reference_2_relationship
        } = req.body;

        // Validate required fields
        if (!service_categories || !Array.isArray(service_categories) || service_categories.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one service category is required'
            });
        }

        if (!reference_1_name || !reference_1_phone) {
            return res.status(400).json({
                success: false,
                message: 'At least one professional reference with name and phone is required'
            });
        }

        const updateData = {
            service_categories,
            insurance_policy_number: insurance_policy_number || null,
            insurance_provider: insurance_provider || null,
            insurance_expiry: insurance_expiry || null,
            insurance_document_url: insurance_document_url || null,
            reference_1_name,
            reference_1_phone,
            reference_1_email: reference_1_email || null,
            reference_1_relationship: reference_1_relationship || null,
            reference_2_name: reference_2_name || null,
            reference_2_phone: reference_2_phone || null,
            reference_2_email: reference_2_email || null,
            reference_2_relationship: reference_2_relationship || null,
            updated_at: new Date().toISOString()
        };

        // Only advance step if currently at step 2
        const { data: current } = await supabaseAdmin
            .from('pro_profiles')
            .select('onboarding_step')
            .eq('user_id', req.user.id)
            .single();

        if (current && (current.onboarding_step || 0) < 3) {
            updateData.onboarding_step = 3;
        }

        // Mark onboarding as complete after Step 3.
        // Step 4 (Stripe Connect) is now optional — pros can set it up later
        // from their Pro Dashboard when they want to withdraw earnings.
        updateData.onboarding_completed = true;

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            logger.error('Submit requirements error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to save requirements' });
        }

        logger.info('Professional requirements submitted — onboarding complete, pending admin approval', { userId: req.user.id });
        res.json({
            success: true,
            message: 'Onboarding complete! Your application is now pending admin review.',
            data: { onboarding_step: data.onboarding_step, onboarding_completed: true }
        });
    } catch (error) {
        logger.error('Submit requirements controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to save requirements' });
    }
};

/**
 * POST /api/onboarding/step/4
 * Mark Stripe setup as complete (Step 4)
 * Called after the pro returns from Stripe Connect onboarding
 */
exports.completeStripeStep = async (req, res) => {
    try {
        // Check that they actually have a Stripe account
        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('stripe_account_id, onboarding_step')
            .eq('user_id', req.user.id)
            .single();

        if (!proProfile?.stripe_account_id) {
            return res.status(400).json({
                success: false,
                message: 'Stripe Connect setup is not complete. Please complete Stripe onboarding first.'
            });
        }

        // Verify with Stripe that the account is valid
        const stripe = require('../config/stripe');
        try {
            const account = await stripe.accounts.retrieve(proProfile.stripe_account_id);
            if (!account.details_submitted) {
                return res.status(400).json({
                    success: false,
                    message: 'Stripe onboarding is not yet complete. Please finish setting up your Stripe account.'
                });
            }
        } catch (stripeErr) {
            logger.error('Stripe account verification failed', { error: stripeErr.message });
            return res.status(400).json({
                success: false,
                message: 'Could not verify Stripe account. Please try again.'
            });
        }

        const updateData = {
            onboarding_completed: true,
            updated_at: new Date().toISOString()
        };

        if ((proProfile.onboarding_step || 0) < 4) {
            updateData.onboarding_step = 4;
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            logger.error('Complete Stripe step error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to complete Stripe step' });
        }

        logger.info('Onboarding completed - pending admin approval', { userId: req.user.id });
        res.json({
            success: true,
            message: 'Onboarding complete! Your application is now pending admin review.',
            data: { onboarding_step: data.onboarding_step, onboarding_completed: true }
        });
    } catch (error) {
        logger.error('Complete Stripe step controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to complete Stripe step' });
    }
};

/**
 * GET /api/onboarding/agreement
 * Get the digital service agreement content
 */
exports.getServiceAgreement = async (req, res) => {
    try {
        // Get the pro's commission rate (or platform default)
        let commissionRate = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.15');

        if (req.user) {
            const { data: proProfile } = await supabaseAdmin
                .from('pro_profiles')
                .select('commission_rate')
                .eq('user_id', req.user.id)
                .single();

            if (proProfile?.commission_rate !== null && proProfile?.commission_rate !== undefined) {
                commissionRate = parseFloat(proProfile.commission_rate);
            }
        }

        const commissionPercent = Math.round(commissionRate * 100);

        res.json({
            success: true,
            data: {
                version: CURRENT_AGREEMENT_VERSION,
                commissionRate,
                commissionPercent,
                agreement: {
                    title: 'BridgeWork Pro Digital Service Agreement',
                    effectiveDate: '2026-01-01',
                    sections: [
                        {
                            title: '1. Independent Contractor Relationship',
                            content: 'You acknowledge and agree that you are an independent contractor and not an employee, agent, or representative of BridgeWork Inc. ("BridgeWork"). Nothing in this Agreement creates an employment, partnership, joint venture, or agency relationship between you and BridgeWork. You are solely responsible for determining how and when you perform services, subject to the terms of this Agreement.'
                        },
                        {
                            title: '2. Platform Commission',
                            content: `BridgeWork charges a platform commission of ${commissionPercent}% on each completed service transaction. This commission covers platform access, customer acquisition, payment processing, dispute resolution, and customer support. The commission rate may be adjusted by BridgeWork with 30 days written notice. Your current commission rate is visible in your account settings and can only be modified by a BridgeWork administrator.`
                        },
                        {
                            title: '3. Payment Terms',
                            content: 'When a homeowner books and pays for a service, funds are held in escrow until the job is completed and confirmed. Upon job confirmation, your share (service amount minus platform commission) will be transferred to your connected Stripe account. Payouts are processed according to Stripe\'s standard payout schedule (typically 2-3 business days). BridgeWork does not withhold taxes — you are solely responsible for reporting and paying all applicable taxes.'
                        },
                        {
                            title: '4. Insurance and Liability',
                            content: 'By accepting this agreement, you represent and warrant that you hold all required or industry-standard insurance, including but not limited to: general liability insurance, workers\' compensation (if required in your jurisdiction), and workplace safety certifications. You agree to maintain adequate coverage to cover property damage, bodily injury, theft, and property loss in amounts sufficient for your liability under your contract with the homeowner. You agree to provide proof of insurance upon request.'
                        },
                        {
                            title: '5. Service Standards',
                            content: 'You agree to: (a) perform all services in a professional, timely, and workmanlike manner; (b) arrive at the scheduled time or communicate delays promptly; (c) comply with all applicable laws, regulations, and licensing requirements; (d) maintain any required professional licenses and certifications; (e) treat all homeowners and their property with respect and care.'
                        },
                        {
                            title: '6. Cancellation Policy',
                            content: 'You may cancel an accepted job within the grace period specified in the BridgeWork Guidelines without penalty. Excessive cancellations may result in reduced job visibility or account suspension. If you cancel a job after the grace period, a cancellation fee may apply as outlined in the Guidelines.'
                        },
                        {
                            title: '7. Dispute Resolution',
                            content: 'In the event of a dispute with a homeowner, BridgeWork will facilitate mediation. You agree to cooperate with BridgeWork\'s dispute resolution process. BridgeWork reserves the right to issue partial or full refunds to homeowners at its discretion, which may affect your payout for the disputed service.'
                        },
                        {
                            title: '8. Account Termination',
                            content: 'BridgeWork may suspend or terminate your account at any time for: (a) violation of this Agreement or BridgeWork\'s Terms and Conditions; (b) consistent low ratings or customer complaints; (c) failure to maintain required insurance or licenses; (d) fraudulent activity; (e) any other reason at BridgeWork\'s sole discretion with reasonable notice. You may terminate your account at any time by contacting BridgeWork, subject to completion of any outstanding jobs.'
                        },
                        {
                            title: '9. Confidentiality',
                            content: 'You agree to keep confidential any proprietary information about BridgeWork\'s business operations, customer data, pricing strategies, and technology. You shall not use customer contact information obtained through the platform to solicit business outside of BridgeWork.'
                        },
                        {
                            title: '10. Modifications',
                            content: 'BridgeWork reserves the right to modify this Agreement at any time. Material changes will be communicated via email and/or in-app notification at least 30 days before taking effect. Continued use of the platform after changes take effect constitutes acceptance of the modified Agreement.'
                        }
                    ]
                }
            }
        });
    } catch (error) {
        logger.error('Get service agreement error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get service agreement' });
    }
};

/**
 * GET /api/onboarding/admin/applications
 * Admin: Get all pro applications pending review
 */
exports.getApplications = async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        let query = supabaseAdmin
            .from('pro_profiles')
            .select('*, profiles!pro_profiles_user_id_fkey(full_name, email, phone, avatar_url, created_at)')
            .eq('onboarding_completed', true);

        if (status === 'pending') {
            query = query.eq('admin_approved', false).is('admin_rejection_reason', null);
        } else if (status === 'approved') {
            query = query.eq('admin_approved', true);
        } else if (status === 'rejected') {
            query = query.not('admin_rejection_reason', 'is', null);
        }

        query = query.order('updated_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            logger.error('Get applications error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to get applications' });
        }

        res.json({
            success: true,
            data: { applications: data || [] }
        });
    } catch (error) {
        logger.error('Get applications controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get applications' });
    }
};

/**
 * POST /api/onboarding/admin/approve/:proProfileId
 * Admin: Approve a pro application
 */
exports.approveApplication = async (req, res) => {
    try {
        const { proProfileId } = req.params;
        const { commission_rate } = req.body;

        const updateData = {
            admin_approved: true,
            admin_approved_by: req.user.id,
            admin_approved_at: new Date().toISOString(),
            admin_rejection_reason: null,
            is_verified: true,
            updated_at: new Date().toISOString()
        };

        if (commission_rate !== undefined && commission_rate !== null) {
            updateData.commission_rate = parseFloat(commission_rate);
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(updateData)
            .eq('id', proProfileId)
            .select('*, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .single();

        if (error) {
            logger.error('Approve application error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to approve application' });
        }

        // Notify the pro
        const { createNotification } = require('../services/notificationService');
        await createNotification(data.user_id, {
            type: 'system',
            title: 'Application Approved!',
            message: 'Congratulations! Your BridgeWork Pro application has been approved. You can now start accepting jobs.',
            link: '/pro-dashboard',
            data: { type: 'application_approved' }
        });

        logger.info('Pro application approved', { proProfileId, adminId: req.user.id });
        res.json({
            success: true,
            message: 'Application approved successfully',
            data: { application: data }
        });
    } catch (error) {
        logger.error('Approve application controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to approve application' });
    }
};

/**
 * POST /api/onboarding/admin/reject/:proProfileId
 * Admin: Reject a pro application
 */
exports.rejectApplication = async (req, res) => {
    try {
        const { proProfileId } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'A rejection reason is required (min 5 characters)'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update({
                admin_approved: false,
                admin_rejection_reason: reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', proProfileId)
            .select('*, profiles!pro_profiles_user_id_fkey(full_name, email)')
            .single();

        if (error) {
            logger.error('Reject application error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to reject application' });
        }

        // Notify the pro
        const { createNotification } = require('../services/notificationService');
        await createNotification(data.user_id, {
            type: 'system',
            title: 'Application Update',
            message: `Your BridgeWork Pro application needs attention: ${reason}`,
            link: '/pro-onboarding',
            data: { type: 'application_rejected', reason }
        });

        logger.info('Pro application rejected', { proProfileId, adminId: req.user.id, reason });
        res.json({
            success: true,
            message: 'Application rejected',
            data: { application: data }
        });
    } catch (error) {
        logger.error('Reject application controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to reject application' });
    }
};

/**
 * POST /api/onboarding/admin/create-pro
 * Admin: Create a new pro account (user + profile + pro_profile), fully onboarded & approved
 */
exports.adminCreatePro = async (req, res) => {
    try {
        const {
            email,
            password,
            full_name,
            phone,
            address,
            city,
            state,
            zip_code,
            // Pro profile fields
            business_name,
            business_address,
            business_unit,
            gst_number,
            website,
            service_categories,
            insurance_policy_number,
            insurance_provider,
            insurance_expiry,
            reference_1_name,
            reference_1_phone,
            reference_1_email,
            reference_1_relationship,
            reference_2_name,
            reference_2_phone,
            reference_2_email,
            reference_2_relationship,
            commission_rate,
            bio,
            hourly_rate,
            service_radius,
        } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, and full name are required'
            });
        }

        // 1. Create Supabase auth user (auto-confirmed, no email verification needed)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role: 'pro' }
        });

        if (authError) {
            logger.error('Admin create pro - auth error', { error: authError.message, email });
            return res.status(400).json({
                success: false,
                message: authError.message
            });
        }

        const userId = authData.user.id;

        // 2. Create profile row
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email,
                full_name,
                role: 'pro',
                phone: phone || null,
                address: address || null,
                city: city || null,
                state: state || null,
                zip_code: zip_code || null,
            })
            .select()
            .single();

        if (profileError) {
            logger.error('Admin create pro - profile error', { error: profileError.message, userId });
            // Clean up auth user
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user profile: ' + profileError.message
            });
        }

        // 3. Create pro_profile row — fully onboarded & admin-approved
        const proProfileData = {
            user_id: userId,
            business_name: business_name || full_name,
            business_address: business_address || address || null,
            business_unit: business_unit || null,
            gst_number: gst_number || null,
            website: website || null,
            service_categories: service_categories || [],
            insurance_policy_number: insurance_policy_number || null,
            insurance_provider: insurance_provider || null,
            insurance_expiry: insurance_expiry || null,
            reference_1_name: reference_1_name || null,
            reference_1_phone: reference_1_phone || null,
            reference_1_email: reference_1_email || null,
            reference_1_relationship: reference_1_relationship || null,
            reference_2_name: reference_2_name || null,
            reference_2_phone: reference_2_phone || null,
            reference_2_email: reference_2_email || null,
            reference_2_relationship: reference_2_relationship || null,
            commission_rate: commission_rate !== undefined ? parseFloat(commission_rate) : parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.15'),
            bio: bio || null,
            hourly_rate: hourly_rate || null,
            service_radius: service_radius || 25,
            is_available: true,
            is_verified: true,
            // Mark onboarding as fully complete
            onboarding_step: 3,
            onboarding_completed: true,
            service_agreement_accepted: true,
            service_agreement_version: CURRENT_AGREEMENT_VERSION,
            service_agreement_accepted_at: new Date().toISOString(),
            // Mark as admin-approved
            admin_approved: true,
            admin_approved_by: req.user.id,
            admin_approved_at: new Date().toISOString(),
        };

        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .insert(proProfileData)
            .select()
            .single();

        if (proError) {
            logger.error('Admin create pro - pro_profile error', { error: proError.message, userId });
            // Clean up
            await supabaseAdmin.from('profiles').delete().eq('id', userId);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return res.status(500).json({
                success: false,
                message: 'Failed to create pro profile: ' + proError.message
            });
        }

        logger.info('Admin created pro account', { userId, proProfileId: proProfile.id, adminId: req.user.id, email });

        res.status(201).json({
            success: true,
            message: `Pro account created for ${full_name} (${email}). They can log in immediately.`,
            data: { userId, proProfile }
        });
    } catch (error) {
        logger.error('Admin create pro controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to create pro account' });
    }
};
