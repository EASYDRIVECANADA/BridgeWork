const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const crypto = require('crypto');

exports.signup = async (req, res) => {
    try {
        const { email, password, full_name, role = 'user', phone, address, city, state, zip_code } = req.body;

        // Use supabase.auth.signUp() which triggers Supabase's built-in confirmation email
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    role
                }
            }
        });

        if (authError) {
            logger.error('Signup error', { error: authError.message });
            return res.status(400).json({
                success: false,
                message: authError.message
            });
        }

        // Supabase returns a fake user (with empty identities) when the email already exists
        // This is their email enumeration protection — the user object looks real but has no actual auth.users row
        if (!authData.user || !authData.user.identities || authData.user.identities.length === 0) {
            logger.warn('Signup attempted with existing email (fake user returned)', { email });
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists. Please log in or use a different email.'
            });
        }

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email,
                full_name,
                role,
                phone,
                address,
                city,
                state,
                zip_code
            })
            .select()
            .single();

        if (profileError) {
            logger.error('Profile creation error', { 
                error: profileError.message, 
                code: profileError.code,
                details: profileError.details,
                hint: profileError.hint,
                userId: authData.user?.id,
                email 
            });
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user profile',
                debug: profileError.message,
                debugCode: profileError.code
            });
        }

        // Auto-create pro_profiles row for pro accounts
        if (role === 'pro') {
            const { error: proProfileError } = await supabaseAdmin
                .from('pro_profiles')
                .insert({
                    user_id: authData.user.id,
                    business_name: full_name,
                    is_available: true,
                })
                .select()
                .single();

            if (proProfileError) {
                logger.error('Pro profile creation error (non-fatal)', { error: proProfileError.message, userId: authData.user.id });
            } else {
                logger.info('Pro profile auto-created', { userId: authData.user.id });
            }
        }

        logger.info('User signed up successfully — confirmation email sent by Supabase', { userId: authData.user.id });

        res.status(201).json({
            success: true,
            message: 'Account created! Please check your email to confirm your account.',
            data: {
                user: authData.user,
                profile,
                requiresConfirmation: true
            }
        });
    } catch (error) {
        logger.error('Signup controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create account'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const clientIp = req.ip;

        // FR-1.6: Check for account lockout (5 failed attempts in 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentFailures } = await supabaseAdmin
            .from('login_attempts')
            .select('id')
            .eq('email', email.toLowerCase())
            .eq('success', false)
            .gte('attempted_at', fifteenMinutesAgo);

        if (recentFailures && recentFailures.length >= 5) {
            logger.warn('Account locked due to too many failed attempts', { email });
            return res.status(429).json({
                success: false,
                message: 'Too many failed login attempts. Please try again in 15 minutes.'
            });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Record the failed attempt
            await supabaseAdmin
                .from('login_attempts')
                .insert({ email: email.toLowerCase(), ip_address: clientIp, success: false });

            logger.warn('Login failed', { email, error: error.message });
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Record the successful attempt (clears lockout context)
        await supabaseAdmin
            .from('login_attempts')
            .insert({ email: email.toLowerCase(), ip_address: clientIp, success: true });

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            logger.error('Profile fetch error during login', { 
                userId: data.user.id, 
                error: profileError.message,
                code: profileError.code 
            });
        }

        logger.info('Profile fetched during login', { userId: data.user.id, profile });

        // Block deactivated accounts before issuing a session
        if (profile && !profile.is_active) {
            logger.warn('Login attempt by deactivated account', { userId: data.user.id });
            await supabase.auth.signOut();
            return res.status(403).json({
                success: false,
                message: 'Your account was deactivated'
            });
        }

        await supabaseAdmin
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);

        logger.info('User logged in', { userId: data.user.id });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: data.user,
                profile,
                session: data.session
            }
        });
    } catch (error) {
        logger.error('Login controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

exports.logout = async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            logger.error('Logout error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Logout controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token
        });

        if (error) {
            logger.error('Token refresh error', { error: error.message });
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        res.json({
            success: true,
            message: 'Token refreshed',
            data: {
                session: data.session
            }
        });
    } catch (error) {
        logger.error('Refresh token controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) {
            logger.error('Get current user error', { error: error.message });
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: req.user,
                profile
            }
        });
    } catch (error) {
        logger.error('Get current user controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get user data'
        });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { full_name, phone, address, city, state, zip_code, avatar_url } = req.body;

        const updates = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;
        if (city !== undefined) updates.city = city;
        if (state !== undefined) updates.state = state;
        if (zip_code !== undefined) updates.zip_code = zip_code;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) {
            logger.error('Update profile error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        logger.info('Profile updated', { userId: req.user.id });

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { profile: data }
        });
    } catch (error) {
        logger.error('Update profile controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password is required'
            });
        }

        // Verify current password by attempting sign-in (BUG-004 fix)
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: req.user.email,
            password: current_password
        });

        if (verifyError) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
            password: new_password
        });

        if (error) {
            logger.error('Change password error', { error: error.message });
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        logger.info('Password changed', { userId: req.user.id });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error('Change password controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Use Supabase's built-in resetPasswordForEmail
        // This sends a branded email (template configured in Supabase dashboard)
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
        const redirectTo = `${frontendUrl}/reset-password`;

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo
        });

        if (resetError) {
            logger.error('Failed to send reset email', { error: resetError.message, email });
            // Still return success to prevent email enumeration
        }

        logger.info('Password reset email requested', { email });

        // Always return success to prevent email enumeration attacks
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error) {
        logger.error('Forgot password controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to send reset email'
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        const passwordComplexityRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
        if (!passwordComplexityRegex.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one number, and one special character'
            });
        }

        // Hash the incoming token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the token in the database
        const { data: resetToken, error: tokenError } = await supabaseAdmin
            .from('password_reset_tokens')
            .select('*')
            .eq('token_hash', tokenHash)
            .is('used_at', null)
            .single();

        if (tokenError || !resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset link. Please request a new one.'
            });
        }

        // Check if token has expired
        if (new Date(resetToken.expires_at) < new Date()) {
            // Mark as used so it can't be retried
            await supabaseAdmin
                .from('password_reset_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('id', resetToken.id);

            return res.status(400).json({
                success: false,
                message: 'This reset link has expired. Please request a new one.'
            });
        }

        // Update the user's password via Supabase Admin
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            resetToken.user_id,
            { password: new_password }
        );

        if (updateError) {
            logger.error('Reset password update error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update password. Please try again.'
            });
        }

        // Mark the token as used
        await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', resetToken.id);

        logger.info('Password reset successfully', { userId: resetToken.user_id });

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        logger.error('Reset password controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { q, role } = req.query;

        if (!q || q.length < 2) {
            return res.json({ success: true, data: { users: [] } });
        }

        let query = supabaseAdmin
            .from('profiles')
            .select('id, full_name, email, avatar_url, role')
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
            .eq('is_active', true)
            .limit(10);

        if (role) {
            query = query.eq('role', role);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('Search users error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to search users'
            });
        }

        res.json({
            success: true,
            data: { users: data || [] }
        });
    } catch (error) {
        logger.error('Search users controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
};
