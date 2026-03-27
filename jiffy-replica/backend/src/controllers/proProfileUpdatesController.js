const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const { writeAuditLog } = require('../services/auditService');

// Fields that require admin approval when changed
const APPROVAL_REQUIRED_FIELDS = [
    'business_name',
    'business_address',
    'business_unit',
    'gst_number',
    'website',
    'insurance_provider',
    'insurance_policy_number',
    'insurance_expiry',
    'insurance_document_url'
];

// Pro submits profile changes (sensitive fields go to approval queue)
exports.submitProfileUpdate = async (req, res) => {
    try {
        const userId = req.user.id;
        const changes = req.body;

        // Get pro profile
        const { data: proProfile, error: proError } = await supabaseAdmin
            .from('pro_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (proError || !proProfile) {
            return res.status(404).json({
                success: false,
                message: 'Pro profile not found'
            });
        }

        // Check if there's already a pending request
        const { data: existingPending } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select('id')
            .eq('pro_profile_id', proProfile.id)
            .eq('status', 'pending')
            .single();

        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending update request. Please wait for admin review before submitting new changes.'
            });
        }

        // Separate fields into approval-required and instant-update
        const approvalChanges = {};
        const previousValues = {};

        for (const [key, value] of Object.entries(changes)) {
            if (APPROVAL_REQUIRED_FIELDS.includes(key)) {
                approvalChanges[key] = value;
                previousValues[key] = proProfile[key] || null;
            }
        }

        if (Object.keys(approvalChanges).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields requiring approval were provided'
            });
        }

        // Create the update request
        const { data: request, error: insertError } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .insert({
                pro_profile_id: proProfile.id,
                user_id: userId,
                status: 'pending',
                requested_changes: approvalChanges,
                previous_values: previousValues
            })
            .select()
            .single();

        if (insertError) {
            logger.error('Create profile update request error', { error: insertError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to submit update request'
            });
        }

        logger.info('Pro profile update request created', {
            requestId: request.id,
            proProfileId: proProfile.id,
            userId,
            fields: Object.keys(approvalChanges)
        });

        res.status(201).json({
            success: true,
            message: 'Your changes have been submitted for admin review.',
            data: { request }
        });
    } catch (error) {
        logger.error('Submit profile update controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to submit update request'
        });
    }
};

// Pro gets their pending update request (if any)
exports.getMyPendingRequest = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!proProfile) {
            return res.json({ success: true, data: { request: null } });
        }

        const { data: request } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select('*')
            .eq('pro_profile_id', proProfile.id)
            .eq('status', 'pending')
            .single();

        res.json({
            success: true,
            data: { request: request || null }
        });
    } catch (error) {
        logger.error('Get pending request error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending request'
        });
    }
};

// Pro gets their update request history
exports.getMyRequestHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: proProfile } = await supabaseAdmin
            .from('pro_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!proProfile) {
            return res.json({ success: true, data: { requests: [] } });
        }

        const { data: requests } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select('*')
            .eq('pro_profile_id', proProfile.id)
            .order('created_at', { ascending: false })
            .limit(20);

        res.json({
            success: true,
            data: { requests: requests || [] }
        });
    } catch (error) {
        logger.error('Get request history error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch request history'
        });
    }
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// Admin: get all pending update requests
exports.adminGetUpdateRequests = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const status = req.query.status || 'pending';

        const { data: requests, error } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select(`
                *,
                pro_profile:pro_profiles!pro_profile_update_requests_pro_profile_id_fkey (
                    id,
                    business_name,
                    business_address,
                    business_unit,
                    gst_number,
                    website,
                    insurance_provider,
                    insurance_policy_number,
                    insurance_expiry,
                    insurance_document_url,
                    profiles:profiles!pro_profiles_user_id_fkey (
                        id,
                        full_name,
                        email,
                        phone,
                        avatar_url
                    )
                ),
                reviewer:profiles!pro_profile_update_requests_reviewed_by_fkey (
                    id,
                    full_name
                )
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Admin get update requests error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch update requests'
            });
        }

        res.json({
            success: true,
            data: { requests: requests || [] }
        });
    } catch (error) {
        logger.error('Admin get update requests controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch update requests'
        });
    }
};

// Admin: get count of pending update requests (for badge)
exports.adminGetPendingCount = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { count, error } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (error) {
            logger.error('Admin get pending count error', { error: error.message });
            return res.status(500).json({ success: false, message: 'Failed to get count' });
        }

        res.json({
            success: true,
            data: { count: count || 0 }
        });
    } catch (error) {
        logger.error('Admin get pending count controller error', { error: error.message });
        res.status(500).json({ success: false, message: 'Failed to get count' });
    }
};

// Admin: approve update request
exports.adminApproveRequest = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id } = req.params;

        // Get the request
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select('*')
            .eq('id', id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !request) {
            return res.status(404).json({
                success: false,
                message: 'Pending update request not found'
            });
        }

        // Apply the changes to pro_profiles
        const { error: updateError } = await supabaseAdmin
            .from('pro_profiles')
            .update(request.requested_changes)
            .eq('id', request.pro_profile_id);

        if (updateError) {
            logger.error('Apply profile update error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to apply changes'
            });
        }

        // Mark request as approved
        const { error: statusError } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .update({
                status: 'approved',
                reviewed_by: req.profile.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (statusError) {
            logger.error('Mark request approved error', { error: statusError.message });
        }

        logger.info('Pro profile update approved', {
            requestId: id,
            proProfileId: request.pro_profile_id,
            approvedBy: req.profile.id,
            fields: Object.keys(request.requested_changes)
        });

        await writeAuditLog(req.profile.id, 'approve_profile_update', 'pro_profile', request.pro_profile_id, { requestId: id, fields: Object.keys(request.requested_changes) });

        res.json({
            success: true,
            message: 'Profile update approved and applied successfully'
        });
    } catch (error) {
        logger.error('Admin approve request controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to approve update request'
        });
    }
};

// Admin: reject update request
exports.adminRejectRequest = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { id } = req.params;
        const { reason } = req.body;

        // Get the request with pro contact info
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .select(`
                id,
                requested_changes,
                pro_profile:pro_profiles!pro_profile_update_requests_pro_profile_id_fkey (
                    user_id,
                    profiles:profiles!pro_profiles_user_id_fkey (
                        full_name,
                        email
                    )
                )
            `)
            .eq('id', id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !request) {
            return res.status(404).json({
                success: false,
                message: 'Pending update request not found'
            });
        }

        // Mark request as rejected
        const { error: statusError } = await supabaseAdmin
            .from('pro_profile_update_requests')
            .update({
                status: 'rejected',
                reviewed_by: req.profile.id,
                reviewed_at: new Date().toISOString(),
                rejection_reason: reason || 'No reason provided'
            })
            .eq('id', id);

        if (statusError) {
            logger.error('Mark request rejected error', { error: statusError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to reject update request'
            });
        }

        // Send rejection email and in-app notification to the pro
        const proEmail = request.pro_profile?.profiles?.email;
        const proName = request.pro_profile?.profiles?.full_name || 'Pro';
        const proUserId = request.pro_profile?.user_id;
        const changedFields = Object.keys(request.requested_changes || {});
        const rejectionReason = reason || 'No reason provided';

        if (proEmail) {
            emailService.sendProProfileUpdateRejectedEmail(proEmail, proName, changedFields, rejectionReason)
                .catch(err => logger.error('Failed to send profile update rejection email', { error: err.message }));
        }

        if (proUserId) {
            notificationService.createNotification(proUserId, {
                type: 'profile_update_rejected',
                title: 'Profile Update Not Approved',
                message: `Your profile update request was not approved. Reason: ${rejectionReason}`,
                link: '/pro-dashboard',
                data: { changedFields, reason: rejectionReason }
            }).catch(err => logger.error('Failed to create rejection notification', { error: err.message }));
        }

        logger.info('Pro profile update rejected', {
            requestId: id,
            rejectedBy: req.profile.id,
            reason
        });

        await writeAuditLog(req.profile.id, 'reject_profile_update', 'pro_profile', id, { reason });

        res.json({
            success: true,
            message: 'Profile update request rejected'
        });
    } catch (error) {
        logger.error('Admin reject request controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to reject update request'
        });
    }
};

// Admin: directly update a pro's profile (no approval needed)
exports.adminUpdateProProfile = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { proProfileId } = req.params;
        const updates = req.body;

        // Filter to only allowed fields
        const allowedFields = [
            'business_name', 'business_address', 'business_unit', 'gst_number', 'website',
            'insurance_provider', 'insurance_policy_number', 'insurance_expiry', 'insurance_document_url',
            'bio', 'hourly_rate', 'service_radius', 'service_categories', 'services_offered', 'is_verified',
            'is_available', 'certifications', 'portfolio_images', 'commission_rate'
        ];

        const filteredUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = value;
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('pro_profiles')
            .update(filteredUpdates)
            .eq('id', proProfileId)
            .select()
            .single();

        if (error) {
            logger.error('Admin update pro profile error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update pro profile'
            });
        }

        logger.info('Admin updated pro profile', {
            proProfileId,
            updatedBy: req.profile.id,
            fields: Object.keys(filteredUpdates)
        });

        await writeAuditLog(req.profile.id, 'admin_update_pro_profile', 'pro_profile', proProfileId, { fields: Object.keys(filteredUpdates) });

        res.json({
            success: true,
            message: 'Pro profile updated successfully',
            data: { profile: data }
        });
    } catch (error) {
        logger.error('Admin update pro profile controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update pro profile'
        });
    }
};
