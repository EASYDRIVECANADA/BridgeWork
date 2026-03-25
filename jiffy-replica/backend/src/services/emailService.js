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

// ─── New Booking Admin Notification Email HTML ─────────────────────────────
function newBookingAdminEmailHTML(booking, customerName, customerEmail, customerPhone) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    const price = booking.is_free_quote
        ? '<span style="color:#f59e0b;font-weight:600;">Free Quote Request</span>'
        : `<span style="font-weight:600;">$${parseFloat(booking.total_price).toFixed(2)} CAD</span>`;

    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">New Booking Request 📋</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            A new service request has been submitted on BridgeWork. Here are the details:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">Booking #</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.booking_number}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Price</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${price}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Scheduled</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${scheduledDate} at ${booking.scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Location</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.address}, ${booking.city}, ${booking.state} ${booking.zip_code}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Customer</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${customerName}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Email</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;"><a href="mailto:${customerEmail}" style="color:#0E7480;text-decoration:none;">${customerEmail}</a></td>
                        </tr>
                        ${customerPhone ? `<tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Phone</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${customerPhone}</td>
                        </tr>` : ''}
                        ${booking.special_instructions ? `<tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Notes</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.special_instructions}</td>
                        </tr>` : ''}
                    </table>
                </td>
            </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/admin/revenue"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        View in Dashboard
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

// ─── Send New Booking Admin Notification ────────────────────────────────────
async function sendNewBookingAdminEmail(adminEmails, booking, customerName, customerEmail, customerPhone) {
    if (!resend) {
        logger.warn('Email service not configured - skipping new booking admin notification');
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const typeLabel = booking.is_free_quote ? 'Quote Request' : 'Booking';
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmails,
            subject: `[BridgeWork] New ${typeLabel}: ${booking.service_name} — ${booking.booking_number}`,
            html: newBookingAdminEmailHTML(booking, customerName, customerEmail, customerPhone),
        });

        if (error) {
            logger.error('Failed to send new booking admin email', { error: error.message });
            return { success: false, error: error.message };
        }

        logger.info('New booking admin notification email sent', { to: adminEmails, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('New booking admin email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Pro: New Job Alert Email (Rate-Based) ──────────────────────────────────
function proJobAlertEmailHTML(proName, booking) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">New Job Available! 💼</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${proName}, a new job matching your services is available near you.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Price</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">$${parseFloat(booking.total_price).toFixed(2)} CAD</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Scheduled</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${scheduledDate} at ${booking.scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Location</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.city}, ${booking.state}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/pro-dashboard"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        View & Accept Job
                    </a>
                </td>
            </tr>
        </table>
        <p style="margin:0;color:#6b7280;font-size:13px;">Accept quickly — another pro may take this job first.</p>`;
    return wrapInLayout(content);
}

async function sendProJobAlertEmail(proEmail, proName, booking) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: `[BridgeWork] New Job: ${booking.service_name} in ${booking.city} — $${parseFloat(booking.total_price).toFixed(2)}`,
            html: proJobAlertEmailHTML(proName, booking),
        });
        if (error) { logger.error('Failed to send pro job alert email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Pro job alert email sent', { to: proEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Pro job alert email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Pro: Quote Request Assignment Email (Free Quote) ───────────────────────
function proQuoteAssignmentEmailHTML(proName, booking) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">You've Been Assigned a Quote Request 📋</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${proName}, a BridgeWork admin has assigned you to a quote request. Review the details and submit your quote.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.service_name || booking.services?.name || 'Service'}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Type</td>
                            <td style="padding:8px 0;color:#f59e0b;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">Free Quote Request</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Scheduled</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${scheduledDate} at ${booking.scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Location</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.city}, ${booking.state}</td>
                        </tr>
                        ${booking.special_instructions ? `<tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Notes</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.special_instructions}</td>
                        </tr>` : ''}
                    </table>
                </td>
            </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/pro-dashboard/quote-requests/${booking.id}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Review & Submit Quote
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendProQuoteAssignmentEmail(proEmail, proName, booking) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: `[BridgeWork] Quote Request: ${booking.service_name || booking.services?.name} in ${booking.city}`,
            html: proQuoteAssignmentEmailHTML(proName, booking),
        });
        if (error) { logger.error('Failed to send pro quote assignment email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Pro quote assignment email sent', { to: proEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Pro quote assignment email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Homeowner: Pro Accepted Your Booking (Rate-Based) ──────────────────────
function homeownerProAcceptedEmailHTML(homeownerName, booking, proBusinessName) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">A Pro Has Accepted Your Booking! ✅</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${homeownerName}, great news! <strong>${proBusinessName}</strong> has accepted your service request and is ready to work.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Booking #</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.booking_number}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Pro</td>
                            <td style="padding:8px 0;color:#0E7480;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${proBusinessName}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Scheduled</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${scheduledDate} at ${booking.scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Total</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">$${parseFloat(booking.total_price).toFixed(2)} CAD</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            You can now message your pro directly to discuss details or ask questions.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/messages/${booking.id}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Chat with Your Pro
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendHomeownerProAcceptedEmail(homeownerEmail, homeownerName, booking, proBusinessName) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [homeownerEmail],
            subject: `[BridgeWork] ${proBusinessName} accepted your ${booking.service_name} booking!`,
            html: homeownerProAcceptedEmailHTML(homeownerName, booking, proBusinessName),
        });
        if (error) { logger.error('Failed to send homeowner pro accepted email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Homeowner pro-accepted email sent', { to: homeownerEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Homeowner pro-accepted email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Homeowner: New Quote Received (Free Quote) ─────────────────────────────
function homeownerQuoteReceivedEmailHTML(homeownerName, booking, proBusinessName, quotedPrice, finalPrice) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">You've Received a Quote! 📋</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${homeownerName}, <strong>${proBusinessName}</strong> has submitted a quote for your ${booking.service_name} request.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Pro</td>
                            <td style="padding:8px 0;color:#0E7480;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${proBusinessName}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Quoted Price</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">$${parseFloat(quotedPrice).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Total (incl. tax)</td>
                            <td style="padding:8px 0;color:#111827;font-size:16px;font-weight:700;border-top:1px solid #e5e7eb;">$${parseFloat(finalPrice).toFixed(2)} CAD</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            Review the quote and accept it to get started. You can also wait for other pros to submit quotes before deciding.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/my-jobs"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Review Quote
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendHomeownerQuoteReceivedEmail(homeownerEmail, homeownerName, booking, proBusinessName, quotedPrice, finalPrice) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [homeownerEmail],
            subject: `[BridgeWork] New quote from ${proBusinessName} for your ${booking.service_name}`,
            html: homeownerQuoteReceivedEmailHTML(homeownerName, booking, proBusinessName, quotedPrice, finalPrice),
        });
        if (error) { logger.error('Failed to send homeowner quote received email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Homeowner quote-received email sent', { to: homeownerEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Homeowner quote-received email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Pro: Your Quote Was Accepted (Free Quote) ─────────────────────────────
function proQuoteAcceptedEmailHTML(proName, booking, quotedPrice) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const scheduledDate = new Date(booking.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Your Quote Has Been Accepted! 🎉</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${proName}, the homeowner has accepted your quote. You can now start working on this job!
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Booking #</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.booking_number}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Your Price</td>
                            <td style="padding:8px 0;color:#16a34a;font-size:16px;font-weight:700;border-top:1px solid #e5e7eb;">$${parseFloat(quotedPrice).toFixed(2)} CAD</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Scheduled</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${scheduledDate} at ${booking.scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Location</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.address}, ${booking.city}, ${booking.state}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            Complete the job and submit your proof of work. Payment will be released after the homeowner confirms completion.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/pro-dashboard"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Go to Dashboard
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendProQuoteAcceptedEmail(proEmail, proName, booking, quotedPrice) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: `[BridgeWork] Your quote for ${booking.service_name} was accepted! 🎉`,
            html: proQuoteAcceptedEmailHTML(proName, booking, quotedPrice),
        });
        if (error) { logger.error('Failed to send pro quote accepted email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Pro quote-accepted email sent', { to: proEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Pro quote-accepted email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Homeowner: Quote Accepted Confirmation (Free Quote) ────────────────────
function homeownerQuoteAcceptedConfirmationEmailHTML(homeownerName, booking, proBusinessName, finalPrice) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Quote Accepted — Job Started! ✅</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${homeownerName}, you've accepted <strong>${proBusinessName}</strong>'s quote for your ${booking.service_name} request. The pro has been notified and will begin working.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:120px;">Booking #</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${booking.booking_number}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Service</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;border-top:1px solid #e5e7eb;">${booking.service_name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Pro</td>
                            <td style="padding:8px 0;color:#0E7480;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${proBusinessName}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #e5e7eb;">Total</td>
                            <td style="padding:8px 0;color:#111827;font-size:16px;font-weight:700;border-top:1px solid #e5e7eb;">$${parseFloat(finalPrice).toFixed(2)} CAD</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            You'll pay after the pro completes the work and submits proof. You can message your pro anytime.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/messages/${booking.id}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Chat with Your Pro
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendHomeownerQuoteAcceptedConfirmationEmail(homeownerEmail, homeownerName, booking, proBusinessName, finalPrice) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [homeownerEmail],
            subject: `[BridgeWork] You accepted ${proBusinessName}'s quote for ${booking.service_name}`,
            html: homeownerQuoteAcceptedConfirmationEmailHTML(homeownerName, booking, proBusinessName, finalPrice),
        });
        if (error) { logger.error('Failed to send homeowner quote accepted confirmation', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Homeowner quote-accepted confirmation email sent', { to: homeownerEmail, bookingId: booking.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Homeowner quote-accepted confirmation email exception', { error: err.message });
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

// ─── Pro: Profile Update Rejected ────────────────────────────────────────────
function proProfileUpdateRejectedEmailHTML(proName, changedFields, rejectionReason) {
    const fieldLabels = {
        business_name: 'Business Name',
        business_address: 'Business Address',
        business_unit: 'Unit / Suite',
        gst_number: 'GST/HST Number',
        website: 'Website',
        insurance_provider: 'Insurance Provider',
        insurance_policy_number: 'Policy Number',
        insurance_expiry: 'Insurance Expiry',
        insurance_document_url: 'Insurance Document',
    };
    const fieldsList = changedFields.map(f => fieldLabels[f] || f).join(', ');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Profile Update Request Not Approved</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${proName}, your recent request to update your profile information has been reviewed and was not approved at this time.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
            <tr>
                <td style="padding:16px;background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;width:140px;">Fields Requested</td>
                            <td style="padding:8px 0;color:#111827;font-size:14px;">${fieldsList}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;border-top:1px solid #fecaca;vertical-align:top;">Reason</td>
                            <td style="padding:8px 0;color:#dc2626;font-size:14px;font-weight:600;border-top:1px solid #fecaca;line-height:1.6;">${rejectionReason}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:20px 0;color:#4b5563;font-size:14px;line-height:1.7;">
            If you believe this was a mistake or need further clarification, please contact our support team or resubmit your request with the correct information.
        </p>`;
    return wrapInLayout(content);
}

async function sendProProfileUpdateRejectedEmail(proEmail, proName, changedFields, rejectionReason) {
    if (!resend) {
        logger.warn('Email service not configured - skipping profile update rejected email', { to: proEmail });
        return { success: false, error: 'Email service not configured' };
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: 'BridgeWork: Your Profile Update Request Was Not Approved',
            html: proProfileUpdateRejectedEmailHTML(proName, changedFields, rejectionReason),
        });
        if (error) {
            logger.error('Failed to send profile update rejected email', { error: error.message, to: proEmail });
            return { success: false, error: error.message };
        }
        logger.info('Profile update rejected email sent', { to: proEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Profile update rejected email exception', { error: err.message, to: proEmail });
        return { success: false, error: err.message };
    }
}

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendContactFormEmail,
    sendAdminInvitation,
    sendNewBookingAdminEmail,
    sendProJobAlertEmail,
    sendProQuoteAssignmentEmail,
    sendHomeownerProAcceptedEmail,
    sendHomeownerQuoteReceivedEmail,
    sendProQuoteAcceptedEmail,
    sendHomeownerQuoteAcceptedConfirmationEmail,
    sendProProfileUpdateRejectedEmail,
};
