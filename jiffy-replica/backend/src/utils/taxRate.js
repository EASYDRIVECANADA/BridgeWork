const { supabaseAdmin } = require('../config/supabase');
const logger = require('./logger');

/**
 * Fetch the tax rate from platform_settings for a given service type.
 * Returns a decimal (e.g. 0.13 for 13%).
 * @param {string} serviceType - 'rate', 'quote', or 'emergency'
 * @returns {Promise<number>}
 */
const getTaxRate = async (serviceType = 'quote') => {
    try {
        const { data, error } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'tax_rate')
            .eq('service_type', serviceType)
            .single();

        if (error || !data) {
            return 0.13;
        }
        return data.value / 100; // DB stores percentage (13), convert to decimal (0.13)
    } catch (err) {
        logger.error('Error fetching tax rate', { error: err.message, serviceType });
        return 0.13;
    }
};

module.exports = { getTaxRate };
