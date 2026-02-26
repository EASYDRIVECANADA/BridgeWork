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
            logger.error('Profile creation error', { error: profileError.message });
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user profile'
            });
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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            logger.warn('Login failed', { email, error: error.message });
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

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

        const { error } = await supabase.auth.updateUser({
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
