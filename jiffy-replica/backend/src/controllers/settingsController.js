const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const { writeAuditLog } = require('../services/auditService');

/**
 * Get all tax settings
 * GET /api/settings/tax
 */
exports.getTaxSettings = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('*')
      .eq('category', 'tax');

    if (error) {
      logger.error('Get tax settings error', { error: error.message });
      // Return defaults if table doesn't exist
      return res.json({
        success: true,
        data: {
          settings: [
            { key: 'tax_rate', service_type: 'rate', value: 13, category: 'tax' },
            { key: 'tax_rate', service_type: 'quote', value: 13, category: 'tax' },
            { key: 'tax_rate', service_type: 'emergency', value: 13, category: 'tax' }
          ]
        }
      });
    }

    // If no settings exist, return defaults
    if (!data || data.length === 0) {
      return res.json({
        success: true,
        data: {
          settings: [
            { key: 'tax_rate', service_type: 'rate', value: 13, category: 'tax' },
            { key: 'tax_rate', service_type: 'quote', value: 13, category: 'tax' },
            { key: 'tax_rate', service_type: 'emergency', value: 13, category: 'tax' }
          ]
        }
      });
    }

    res.json({
      success: true,
      data: { settings: data }
    });
  } catch (error) {
    logger.error('Get tax settings controller error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax settings'
    });
  }
};

/**
 * Update tax setting for a specific service type
 * PUT /api/settings/tax/:serviceType
 */
exports.updateTaxSetting = async (req, res) => {
  try {
    const { serviceType } = req.params;
    const { value } = req.body;

    // Validate service type
    const validTypes = ['rate', 'quote', 'emergency'];
    if (!validTypes.includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service type. Must be: rate, quote, or emergency'
      });
    }

    // Validate value
    const taxValue = parseFloat(value);
    if (isNaN(taxValue) || taxValue < 0 || taxValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate must be between 0 and 100'
      });
    }

    // Try to upsert the setting
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .upsert({
        key: 'tax_rate',
        service_type: serviceType,
        value: taxValue,
        category: 'tax',
        updated_at: new Date().toISOString(),
        updated_by: req.user?.id || null
      }, {
        onConflict: 'key,service_type'
      })
      .select()
      .single();

    if (error) {
      logger.error('Update tax setting error', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to update tax setting'
      });
    }

    logger.info('Tax setting updated', { serviceType, value: taxValue, adminId: req.user?.id });

    await writeAuditLog(req.user?.id, 'update_tax_setting', 'platform_setting', serviceType, { value: taxValue });

    res.json({
      success: true,
      message: `Tax rate for ${serviceType} services updated to ${taxValue}%`,
      data: { setting: data }
    });
  } catch (error) {
    logger.error('Update tax setting controller error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update tax setting'
    });
  }
};

/**
 * Get tax rate for a specific service type (public endpoint for checkout)
 * GET /api/settings/tax/:serviceType
 */
exports.getTaxRate = async (req, res) => {
  try {
    const { serviceType } = req.params;
    
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'tax_rate')
      .eq('service_type', serviceType)
      .single();

    if (error || !data) {
      // Return default 13% if not found
      return res.json({
        success: true,
        data: { tax_rate: 13 }
      });
    }

    res.json({
      success: true,
      data: { tax_rate: data.value }
    });
  } catch (error) {
    logger.error('Get tax rate error', { error: error.message });
    // Return default on error
    res.json({
      success: true,
      data: { tax_rate: 13 }
    });
  }
};
