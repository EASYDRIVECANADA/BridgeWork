const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

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
