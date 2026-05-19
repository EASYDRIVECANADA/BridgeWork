const logger = require('../utils/logger');

const DEFAULT_ADMIN_NOTIFICATION_EMAIL = 'dave@bridgeworkservices.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
        .split(',')
        .map(email => email.trim())
        .filter(Boolean);
}

function normalizeNotificationEmails(...emailGroups) {
    const byLowercase = new Map();

    for (const group of emailGroups) {
        for (const rawEmail of parseEmailList(group)) {
            const email = String(rawEmail || '').trim().toLowerCase();
            if (EMAIL_PATTERN.test(email) && !byLowercase.has(email)) {
                byLowercase.set(email, email);
            }
        }
    }

    return Array.from(byLowercase.values());
}

function getDefaultSupabaseClient() {
    return require('../config/supabase').supabaseAdmin;
}

async function getAdminNotificationRecipients({ supabaseClient } = {}) {
    const client = supabaseClient || getDefaultSupabaseClient();
    let adminEmails = [];
    let settingEmails = [];

    try {
        const { data, error } = await client
            .from('profiles')
            .select('email')
            .eq('role', 'admin')
            .eq('is_active', true);

        if (error) {
            logger.warn('Failed to fetch admin notification emails', { error: error.message });
        } else {
            adminEmails = (data || []).map(admin => admin.email);
        }
    } catch (error) {
        logger.warn('Admin notification email query failed', { error: error.message });
    }

    try {
        const { data, error } = await client
            .from('platform_settings')
            .select('value')
            .eq('key', 'notification_emails')
            .eq('category', 'notifications')
            .maybeSingle();

        if (error) {
            logger.warn('Failed to fetch configured notification emails', { error: error.message });
        } else if (data?.value) {
            try {
                settingEmails = JSON.parse(data.value);
            } catch (parseError) {
                logger.warn('Configured notification emails are not valid JSON', { error: parseError.message });
            }
        }
    } catch (error) {
        logger.warn('Configured notification email query failed', { error: error.message });
    }

    return normalizeNotificationEmails(
        adminEmails,
        settingEmails,
        process.env.ADMIN_NOTIFICATION_EMAILS,
        DEFAULT_ADMIN_NOTIFICATION_EMAIL
    );
}

module.exports = {
    DEFAULT_ADMIN_NOTIFICATION_EMAIL,
    getAdminNotificationRecipients,
    normalizeNotificationEmails,
    parseEmailList,
};
