const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token required'
            });
        }

        const token = authHeader.substring(7);

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            logger.warn('Authentication failed', { error: error?.message });
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            logger.error('Profile not found', { userId: user.id, error: profileError });
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        if (!profile.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account was deactivated'
            });
        }

        req.user = user;
        req.profile = profile;
        next();
    } catch (error) {
        logger.error('Authentication middleware error', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.profile) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.profile.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.profile) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (req.profile.role !== 'admin' || !req.profile.is_superadmin) {
        return res.status(403).json({
            success: false,
            message: 'SuperAdmin access required'
        });
    }

    next();
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data: { user } } = await supabase.auth.getUser(token);

            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.is_active) {
                    req.user = user;
                    req.profile = profile;
                }
            }
        }

        next();
    } catch (error) {
        logger.error('Optional auth error', { error: error.message });
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    requireSuperAdmin,
    optionalAuth
};
