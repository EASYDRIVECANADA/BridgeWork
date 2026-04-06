const logger = require('./logger');

const raw = process.env.PLATFORM_COMMISSION_RATE;
if (!raw) {
    logger.warn('PLATFORM_COMMISSION_RATE env var is not set — defaulting to 0.13 (13%)');
}

const PLATFORM_COMMISSION_RATE = parseFloat(raw || '0.13');

module.exports = { PLATFORM_COMMISSION_RATE };
