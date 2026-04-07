const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { writeAuditLog } = require('../services/auditService');

exports.listAdmins = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, phone, is_superadmin, admin_permissions, is_active, created_at, last_login_at')
            .eq('role', 'admin')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return res.json({ success: true, data: { admins: data } });
    } catch (error) {
        logger.error('listAdmins error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch admins' });
    }
};

exports.updateAdminPermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_permissions } = req.body;

        // Validate admin_permissions structure
        const VALID_PERMISSION_KEYS = [
            'revenue', 'services', 'categories', 'pro_applications',
            'profile_updates', 'invitations', 'payouts', 'quotations',
            'quote_assignments', 'quote_requests', 'proofs', 'support_chat', 'disputes'
        ];

        if (admin_permissions !== null && admin_permissions !== undefined) {
            if (typeof admin_permissions !== 'object' || Array.isArray(admin_permissions)) {
                return res.status(400).json({ success: false, message: 'admin_permissions must be a JSON object' });
            }
            const invalidKeys = Object.keys(admin_permissions).filter(k => !VALID_PERMISSION_KEYS.includes(k));
            if (invalidKeys.length > 0) {
                return res.status(400).json({ success: false, message: `Invalid permission keys: ${invalidKeys.join(', ')}` });
            }
            for (const [key, value] of Object.entries(admin_permissions)) {
                if (typeof value !== 'boolean') {
                    return res.status(400).json({ success: false, message: `Permission "${key}" must be a boolean` });
                }
            }
        }

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('is_superadmin, email, role')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (target.role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Target user is not an admin' });
        }

        if (target.is_superadmin) {
            return res.status(403).json({ success: false, message: 'Cannot modify SuperAdmin permissions' });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ admin_permissions, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, email, full_name, is_superadmin, admin_permissions, is_active')
            .single();

        if (error) throw error;

        await writeAuditLog(req.profile.id, 'update_permissions', 'admin', id, { admin_permissions });

        logger.info('Admin permissions updated', { adminId: id, by: req.profile.id });
        return res.json({ success: true, message: 'Permissions updated successfully', data: { admin: data } });
    } catch (error) {
        logger.error('updateAdminPermissions error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to update permissions' });
    }
};

exports.toggleAdminActive = async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.profile.id) {
            return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
        }

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('is_superadmin, is_active, role')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (target.role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Target user is not an admin' });
        }

        if (target.is_superadmin) {
            return res.status(403).json({ success: false, message: 'Cannot deactivate SuperAdmin account' });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: !target.is_active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, email, full_name, is_superadmin, admin_permissions, is_active')
            .single();

        if (error) throw error;

        await writeAuditLog(req.profile.id, 'toggle_admin_active', 'admin', id, { is_active: data.is_active });

        logger.info('Admin account toggled', { adminId: id, isActive: data.is_active, by: req.profile.id });
        return res.json({
            success: true,
            message: `Admin account ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            data: { admin: data }
        });
    } catch (error) {
        logger.error('toggleAdminActive error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to update admin status' });
    }
};

exports.sendAdminPasswordReset = async (req, res) => {
    try {
        const { id } = req.params;

        // Cannot trigger reset for yourself via this endpoint — use normal forgot-password
        if (id === req.profile.id) {
            return res.status(400).json({ success: false, message: 'Use the forgot-password flow to reset your own password' });
        }

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (target.role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Target user is not an admin' });
        }

        const crypto = require('crypto');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        // Invalidate any existing unused tokens for this user
        await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('user_id', target.id)
            .is('used_at', null);

        const { error: insertError } = await supabaseAdmin
            .from('password_reset_tokens')
            .insert({ user_id: target.id, token_hash: tokenHash, expires_at: expiresAt });

        if (insertError) {
            logger.error('Failed to store admin password reset token', { error: insertError.message, targetId: target.id });
            return res.status(500).json({ success: false, message: 'Failed to generate reset token' });
        }

        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(target.email)}`;

        const { sendPasswordResetEmail } = require('../services/emailService');
        await sendPasswordResetEmail(target.email, target.full_name || 'Admin', resetLink);

        await writeAuditLog(req.profile.id, 'send_password_reset', 'admin', id, { email: target.email });
        logger.info('Admin password reset sent by SuperAdmin', { targetId: id, by: req.profile.id });

        return res.json({ success: true, message: `Password reset email sent to ${target.email}` });
    } catch (error) {
        logger.error('sendAdminPasswordReset error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to send password reset email' });
    }
};

// ── Send password reset to any user (pro, homeowner, admin) ─────────────────
exports.sendUserPasswordReset = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role, is_superadmin')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (target.is_superadmin) {
            return res.status(403).json({ success: false, message: 'Cannot reset SuperAdmin password through this endpoint' });
        }

        const crypto = require('crypto');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('user_id', target.id)
            .is('used_at', null);

        const { error: insertError } = await supabaseAdmin
            .from('password_reset_tokens')
            .insert({ user_id: target.id, token_hash: tokenHash, expires_at: expiresAt });

        if (insertError) {
            logger.error('Failed to store user password reset token', { error: insertError.message, targetId: target.id });
            return res.status(500).json({ success: false, message: 'Failed to generate reset token' });
        }

        const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(target.email)}`;

        const { sendPasswordResetEmail } = require('../services/emailService');
        await sendPasswordResetEmail(target.email, target.full_name || 'User', resetLink);

        await writeAuditLog(req.profile.id, 'send_password_reset', target.role, id, { email: target.email });
        logger.info('Password reset sent by admin', { targetId: id, role: target.role, by: req.profile.id });

        return res.json({ success: true, message: `Password reset email sent to ${target.email}` });
    } catch (error) {
        logger.error('sendUserPasswordReset error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to send password reset email' });
    }
};

// ── Update any user's email ─────────────────────────────────────────────────
exports.updateUserEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'A valid email address is required' });
        }

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role, is_superadmin')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (target.is_superadmin && id !== req.profile.id) {
            return res.status(403).json({ success: false, message: 'Cannot change SuperAdmin email' });
        }

        // Check if email is already in use
        const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .neq('id', id)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ success: false, message: 'Email address is already in use' });
        }

        // Update Supabase Auth user email
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
            email: email.toLowerCase(),
            email_confirm: true,
        });

        if (authError) {
            logger.error('Failed to update auth email', { error: authError.message, userId: id });
            return res.status(500).json({ success: false, message: 'Failed to update authentication email' });
        }

        // Update profiles table
        const { data: updated, error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ email: email.toLowerCase(), updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, email, full_name, role')
            .single();

        if (profileError) {
            logger.error('Failed to update profile email', { error: profileError.message, userId: id });
            return res.status(500).json({ success: false, message: 'Auth email updated but profile update failed' });
        }

        await writeAuditLog(req.profile.id, 'update_email', target.role, id, { old_email: target.email, new_email: email.toLowerCase() });
        logger.info('User email updated by admin', { userId: id, oldEmail: target.email, newEmail: email.toLowerCase(), by: req.profile.id });

        return res.json({ success: true, message: 'Email updated successfully', data: { user: updated } });
    } catch (error) {
        logger.error('updateUserEmail error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to update email' });
    }
};

// ── List all homeowners ─────────────────────────────────────────────────────
exports.listHomeowners = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, phone, city, is_active, created_at, last_login_at')
            .eq('role', 'user')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.json({ success: true, data: { homeowners: data } });
    } catch (error) {
        logger.error('listHomeowners error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to fetch homeowners' });
    }
};

// ── Toggle homeowner/pro active status ──────────────────────────────────────
exports.toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: target, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role, is_active, is_superadmin')
            .eq('id', id)
            .single();

        if (fetchError || !target) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (target.is_superadmin) {
            return res.status(403).json({ success: false, message: 'Cannot deactivate SuperAdmin' });
        }

        if (target.role === 'admin') {
            return res.status(400).json({ success: false, message: 'Use the admin toggle endpoint for admin accounts' });
        }

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: !target.is_active, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, email, full_name, role, is_active')
            .single();

        if (error) throw error;

        await writeAuditLog(req.profile.id, 'toggle_user_active', target.role, id, { is_active: data.is_active });
        logger.info('User account toggled', { userId: id, role: target.role, isActive: data.is_active, by: req.profile.id });

        return res.json({
            success: true,
            message: `Account ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            data: { user: data }
        });
    } catch (error) {
        logger.error('toggleUserActive error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
};
