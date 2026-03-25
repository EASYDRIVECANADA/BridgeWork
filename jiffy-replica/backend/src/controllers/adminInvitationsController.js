const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Generate secure random token
const generateInvitationToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Create and send admin invitation
exports.createInvitation = async (req, res) => {
    try {
        const { email, full_name, phone, admin_permissions } = req.body;
        const invitedBy = req.profile.id;

        // Validate admin role
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can send invitations'
            });
        }

        // Check if email already exists as a user
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('email', email.toLowerCase())
            .single();

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: existingProfile.role === 'admin' 
                    ? 'This email is already registered as an admin'
                    : 'This email is already registered. Please use a different email.'
            });
        }

        // Check for pending invitation
        const { data: existingInvitation } = await supabaseAdmin
            .from('admin_invitations')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single();

        if (existingInvitation) {
            return res.status(400).json({
                success: false,
                message: 'An invitation has already been sent to this email'
            });
        }

        // Generate token and expiry (7 days)
        const token = generateInvitationToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Create invitation
        const { data: invitation, error } = await supabaseAdmin
            .from('admin_invitations')
            .insert({
                email: email.toLowerCase(),
                full_name,
                phone,
                invited_by: invitedBy,
                token,
                expires_at: expiresAt.toISOString(),
                status: 'pending',
                admin_permissions: admin_permissions || null
            })
            .select()
            .single();

        if (error) {
            logger.error('Create invitation error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create invitation'
            });
        }

        // Send invitation email
        const invitationUrl = `${process.env.FRONTEND_URL}/admin-signup?token=${token}`;
        
        try {
            await emailService.sendAdminInvitation({
                to: email,
                full_name,
                invitedBy: req.profile.full_name || 'BridgeWork Admin',
                invitationUrl,
                expiresAt
            });
        } catch (emailError) {
            logger.error('Failed to send invitation email', { error: emailError.message });
            // Don't fail the request if email fails, invitation is still created
        }

        logger.info('Admin invitation created', { 
            invitationId: invitation.id, 
            email,
            invitedBy 
        });

        res.status(201).json({
            success: true,
            message: 'Invitation sent successfully',
            data: { invitation }
        });
    } catch (error) {
        logger.error('Create invitation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create invitation'
        });
    }
};

// Get all invitations (admin only)
exports.getAllInvitations = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('admin_invitations')
            .select(`
                *,
                invited_by_profile:profiles!admin_invitations_invited_by_fkey(
                    id,
                    full_name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Get invitations error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch invitations'
            });
        }

        res.json({
            success: true,
            data: { invitations: data }
        });
    } catch (error) {
        logger.error('Get invitations controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invitations'
        });
    }
};

// Verify invitation token
exports.verifyToken = async (req, res) => {
    try {
        const { token } = req.params;

        const { data: invitation, error } = await supabaseAdmin
            .from('admin_invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (error || !invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invalid invitation token'
            });
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
            await supabaseAdmin
                .from('admin_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id);

            return res.status(400).json({
                success: false,
                message: 'This invitation has expired'
            });
        }

        // Check if already accepted
        if (invitation.status === 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'This invitation has already been used'
            });
        }

        // Check if cancelled
        if (invitation.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This invitation has been cancelled'
            });
        }

        res.json({
            success: true,
            data: {
                email: invitation.email,
                full_name: invitation.full_name,
                phone: invitation.phone
            }
        });
    } catch (error) {
        logger.error('Verify token error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to verify token'
        });
    }
};

// Accept invitation and create admin account
exports.acceptInvitation = async (req, res) => {
    try {
        const { token, password } = req.body;

        // Verify token first
        const { data: invitation, error: invError } = await supabaseAdmin
            .from('admin_invitations')
            .select('*')
            .eq('token', token)
            .single();

        if (invError || !invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invalid invitation token'
            });
        }

        // Check expiry and status
        if (new Date(invitation.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'This invitation has expired'
            });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'This invitation is no longer valid'
            });
        }

        // Create admin user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: invitation.full_name,
                phone: invitation.phone,
                role: 'admin'
            }
        });

        if (authError) {
            logger.error('Create admin user error', { error: authError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create admin account'
            });
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: invitation.email,
                full_name: invitation.full_name,
                phone: invitation.phone,
                role: 'admin',
                admin_permissions: invitation.admin_permissions || null
            });

        if (profileError) {
            logger.error('Create admin profile error', { error: profileError.message });
            // Rollback: delete auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create admin profile'
            });
        }

        // Mark invitation as accepted
        await supabaseAdmin
            .from('admin_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invitation.id);

        logger.info('Admin invitation accepted', {
            invitationId: invitation.id,
            email: invitation.email,
            userId: authData.user.id
        });

        res.json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                user: {
                    id: authData.user.id,
                    email: authData.user.email
                }
            }
        });
    } catch (error) {
        logger.error('Accept invitation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to accept invitation'
        });
    }
};

// Cancel invitation
exports.cancelInvitation = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { error } = await supabaseAdmin
            .from('admin_invitations')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) {
            logger.error('Cancel invitation error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel invitation'
            });
        }

        logger.info('Admin invitation cancelled', { invitationId: id });

        res.json({
            success: true,
            message: 'Invitation cancelled successfully'
        });
    } catch (error) {
        logger.error('Cancel invitation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to cancel invitation'
        });
    }
};

// Directly create admin account (bypass email invitation)
exports.directCreateAdmin = async (req, res) => {
    try {
        const { email, full_name, phone, password, admin_permissions } = req.body;

        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create admin accounts'
            });
        }

        if (!email || !full_name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, full name, and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Check if email already exists
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('email', email.toLowerCase())
            .single();

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: existingProfile.role === 'admin'
                    ? 'This email is already registered as an admin'
                    : 'This email is already registered. Please use a different email.'
            });
        }

        // Create admin user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                phone: phone || null,
                role: 'admin'
            }
        });

        if (authError) {
            logger.error('Direct create admin user error', { error: authError.message });
            return res.status(500).json({
                success: false,
                message: authError.message || 'Failed to create admin account'
            });
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email.toLowerCase(),
                full_name,
                phone: phone || null,
                role: 'admin',
                admin_permissions: admin_permissions || null
            });

        if (profileError) {
            logger.error('Direct create admin profile error', { error: profileError.message });
            // Rollback: delete auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create admin profile'
            });
        }

        logger.info('Admin account created directly', {
            email: email.toLowerCase(),
            userId: authData.user.id,
            createdBy: req.profile.id
        });

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                user: {
                    id: authData.user.id,
                    email: authData.user.email,
                    full_name
                }
            }
        });
    } catch (error) {
        logger.error('Direct create admin controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create admin account'
        });
    }
};

// Resend invitation email
exports.resendInvitation = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { data: invitation, error } = await supabaseAdmin
            .from('admin_invitations')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only resend pending invitations'
            });
        }

        // Check if expired, extend if needed
        const now = new Date();
        const expiresAt = new Date(invitation.expires_at);
        
        if (expiresAt < now) {
            // Extend expiry by 7 days from now
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + 7);
            
            await supabaseAdmin
                .from('admin_invitations')
                .update({ expires_at: newExpiresAt.toISOString() })
                .eq('id', id);
        }

        // Resend email
        const invitationUrl = `${process.env.FRONTEND_URL}/admin-signup?token=${invitation.token}`;
        
        try {
            await emailService.sendAdminInvitation({
                to: invitation.email,
                full_name: invitation.full_name,
                invitedBy: req.profile.full_name || 'BridgeWork Admin',
                invitationUrl,
                expiresAt: new Date(invitation.expires_at)
            });
        } catch (emailError) {
            logger.error('Failed to resend invitation email', { error: emailError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to send email'
            });
        }

        logger.info('Admin invitation resent', { invitationId: id });

        res.json({
            success: true,
            message: 'Invitation resent successfully'
        });
    } catch (error) {
        logger.error('Resend invitation controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to resend invitation'
        });
    }
};
