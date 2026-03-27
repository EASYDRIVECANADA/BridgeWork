const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Write an entry to the audit_log table.
 * @param {string} adminId - UUID of the admin performing the action
 * @param {string} action - e.g. 'approve_pro', 'reject_pro', 'resolve_dispute', 'update_permissions'
 * @param {string} targetType - e.g. 'pro_profile', 'booking', 'profile', 'service'
 * @param {string} targetId - UUID or identifier of the affected record
 * @param {object} [details] - Optional JSON details (reason, old/new values, etc.)
 */
async function writeAuditLog(adminId, action, targetType, targetId, details = {}) {
    try {
        const { error } = await supabaseAdmin
            .from('audit_log')
            .insert({
                admin_id: adminId,
                action,
                target_type: targetType,
                target_id: String(targetId),
                details,
            });

        if (error) {
            logger.error('Failed to write audit log', { error: error.message, action, targetType, targetId });
        }
    } catch (err) {
        // Audit logging should never break the main flow
        logger.error('Audit log exception', { error: err.message, action, targetType, targetId });
    }
}

module.exports = { writeAuditLog };
