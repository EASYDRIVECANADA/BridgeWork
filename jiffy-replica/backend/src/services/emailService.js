const { Resend } = require('resend');
const logger = require('../utils/logger');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BridgeWork <onboarding@resend.dev>';

if (!resend) {
    logger.warn('RESEND_API_KEY not configured - email functionality will be disabled');
}

// ─── Branded HTML wrapper ───────────────────────────────────────────────────
function wrapInLayout(content) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BridgeWork</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#0E7480 0%,#1a5fb4 100%);padding:32px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">BridgeWork</h1>
                            <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:400;">Home Services You Can Trust</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                                &copy; ${new Date().getFullYear()} BridgeWork. All rights reserved.<br>
                                This email was sent by BridgeWork. If you didn't request this, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// ─── Welcome Email Template ─────────────────────────────────────────────────
function welcomeEmailHTML(fullName) {
    const firstName = fullName ? fullName.split(' ')[0] : 'there';
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Welcome to BridgeWork, ${firstName}!</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Your account has been created successfully. You're now part of a community that connects homeowners with verified, trusted professionals.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
                <td style="background-color:#f0f7ff;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#1e40af;font-size:14px;font-weight:600;">Here's what you can do next:</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:4px 0;color:#374151;font-size:14px;">&#10003;&nbsp; Browse 26+ home services</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#374151;font-size:14px;">&#10003;&nbsp; Book a service in minutes</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#374151;font-size:14px;">&#10003;&nbsp; Pay securely with escrow protection</td>
                        </tr>
                        <tr>
                            <td style="padding:4px 0;color:#374151;font-size:14px;">&#10003;&nbsp; Message your pro in real-time</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/services" 
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Browse Services
                    </a>
                </td>
            </tr>
        </table>
        <p style="margin:0;color:#6b7280;font-size:13px;">
            If you have any questions, visit our <a href="${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/help" style="color:#0E7480;text-decoration:none;">Help Center</a>.
        </p>`;
    return wrapInLayout(content);
}

// ─── Password Reset Email Template ──────────────────────────────────────────
function passwordResetEmailHTML(fullName, resetLink) {
    const firstName = fullName ? fullName.split(' ')[0] : 'there';
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Reset Your Password</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${firstName}, we received a request to reset the password for your BridgeWork account. Click the button below to set a new password.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;" width="100%">
            <tr>
                <td align="center">
                    <a href="${resetLink}" 
                       style="display:inline-block;padding:14px 40px;background-color:#0E7480;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                        Reset Password
                    </a>
                </td>
            </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
                <td style="background-color:#fef3c7;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                        <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                </td>
            </tr>
        </table>
        <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color:#0E7480;word-break:break-all;font-size:12px;">${resetLink}</a>
        </p>`;
    return wrapInLayout(content);
}

// ─── Send Welcome Email ─────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, fullName) {
    if (!resend) {
        logger.warn('Email service not configured - skipping welcome email', { to: toEmail });
        return { success: false, error: 'Email service not configured' };
    }
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: 'Welcome to BridgeWork! 🏠',
            html: welcomeEmailHTML(fullName),
        });

        if (error) {
            logger.error('Failed to send welcome email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }

        logger.info('Welcome email sent', { to: toEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Welcome email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// ─── Send Password Reset Email ──────────────────────────────────────────────
async function sendPasswordResetEmail(toEmail, fullName, resetLink) {
    if (!resend) {
        logger.warn('Email service not configured - skipping password reset email', { to: toEmail });
        return { success: false, error: 'Email service not configured' };
    }
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: 'Reset Your BridgeWork Password',
            html: passwordResetEmailHTML(fullName, resetLink),
        });

        if (error) {
            logger.error('Failed to send password reset email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }

        logger.info('Password reset email sent', { to: toEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Password reset email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// ─── Contact Form Email Template ─────────────────────────────────────────────
function contactFormEmailHTML(name, email, phone, subject, message) {
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">New Contact Form Inquiry</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:12px 16px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Name</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Email</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">
                                <a href="mailto:${email}" style="color:#0E7480;text-decoration:none;">${email}</a>
                            </td>
                        </tr>
                        ${phone ? `<tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Phone</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${phone}</td>
                        </tr>` : ''}
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Subject</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${subject}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <div style="margin:20px 0;padding:16px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;">Message</p>
            <p style="margin:0;color:#111827;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
        </div>`;
    return wrapInLayout(content);
}

// ─── Send Contact Form Email ─────────────────────────────────────────────────
async function sendContactFormEmail(name, email, phone, subject, message) {
    if (!resend) {
        logger.warn('Email service not configured - skipping contact form email', { from: email });
        return { success: false, error: 'Email service not configured' };
    }
    
    const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com';
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [CONTACT_EMAIL],
            reply_to: email,
            subject: `[BridgeWork Contact] ${subject}`,
            html: contactFormEmailHTML(name, email, phone, subject, message),
        });

        if (error) {
            logger.error('Failed to send contact form email', { error: error.message });
            return { success: false, error: error.message };
        }

        logger.info('Contact form email sent', { to: CONTACT_EMAIL, from: email, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Contact form email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Admin Invitation Email HTML ────────────────────────────────────────────
function adminInvitationEmailHTML(fullName, invitedBy, invitationUrl, expiresAt) {
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:24px;font-weight:700;">You've Been Invited to Join BridgeWork as an Admin</h2>
        <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Hi ${fullName},
        </p>
        <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
            <strong>${invitedBy}</strong> has invited you to join the BridgeWork admin team. As an admin, you'll have full access to manage the platform, including services, categories, pro applications, and more.
        </p>
        <div style="margin:0 0 24px;text-align:center;">
            <a href="${invitationUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#0E7480 0%,#1a5fb4 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;box-shadow:0 2px 8px rgba(14,116,128,0.25);">
                Accept Invitation & Create Account
            </a>
        </div>
        <div style="margin:0 0 24px;padding:16px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                <strong>⏰ This invitation expires on ${expiryDate}</strong><br>
                Please complete your registration before this date.
            </p>
        </div>
        <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
            If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="margin:0 0 24px;color:#0E7480;font-size:13px;word-break:break-all;">
            ${invitationUrl}
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
            If you didn't expect this invitation or have any questions, please contact the BridgeWork team.
        </p>`;
    return wrapInLayout(content);
}

// ─── Send Admin Invitation Email ────────────────────────────────────────────
async function sendAdminInvitation({ to, full_name, invitedBy, invitationUrl, expiresAt }) {
    if (!resend) {
        logger.warn('Email service not configured - skipping admin invitation email', { to });
        return { success: false, error: 'Email service not configured' };
    }
    
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [to],
            subject: 'You\'re Invited to Join BridgeWork as an Admin',
            html: adminInvitationEmailHTML(full_name, invitedBy, invitationUrl, expiresAt),
        });

        if (error) {
            logger.error('Failed to send admin invitation email', { error: error.message });
            return { success: false, error: error.message };
        }

        logger.info('Admin invitation email sent', { to, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Admin invitation email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendContactFormEmail,
    sendAdminInvitation,
};
