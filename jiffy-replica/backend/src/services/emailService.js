const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BridgeWork <onboarding@resend.dev>';

// ─── GHL / SMTP transport (used for password reset emails) ──────────────────
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || FROM_EMAIL;

function createSmtpTransport() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        logger.warn('SMTP credentials not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
}

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

// ─── Send Password Reset Email (via GHL SMTP) ──────────────────────────────
async function sendPasswordResetEmail(toEmail, fullName, resetLink) {
    const transport = createSmtpTransport();

    if (!transport) {
        logger.warn('SMTP not configured - skipping password reset email', { to: toEmail });
        return { success: false, error: 'SMTP not configured' };
    }

    try {
        const info = await transport.sendMail({
            from: SMTP_FROM_EMAIL,
            to: toEmail,
            subject: 'Reset Your BridgeWork Password',
            html: passwordResetEmailHTML(fullName, resetLink),
        });

        logger.info('Password reset email sent via SMTP', { to: toEmail, messageId: info.messageId });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        logger.error('Password reset email SMTP exception', { error: err.message, to: toEmail });
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

// ─── Pro Payout Notification Email ───────────────────────────────────────────
function proPayoutNotificationEmailHTML(proName, amount, etransferEmail, securityQuestion, securityAnswer) {
    const firstName = proName ? proName.split(' ')[0] : 'there';
    const content = `
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#142841;">
            Your Payout Has Been Sent!
        </h2>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            Hi ${firstName}, great news — BridgeWork has sent your earnings via Interac e-Transfer.
            Check your inbox at the address below and use the security details to accept the transfer.
        </p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.05em;">Payout Amount</p>
            <p style="margin:0;font-size:28px;font-weight:800;color:#15803d;">$${parseFloat(amount).toFixed(2)} CAD</p>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#142841;text-transform:uppercase;letter-spacing:0.05em;">Transfer Details</p>

            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#6b7280;width:45%;">Sent To</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#111827;">${etransferEmail}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px;color:#6b7280;">Security Question</td>
                    <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#111827;">${securityQuestion}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">Security Answer</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:700;color:#0E7480;font-size:15px;">${securityAnswer}</td>
                </tr>
            </table>
        </div>

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                <strong>How to accept:</strong> Open the Interac e-Transfer notification email from your bank,
                click "Accept Transfer", enter the security answer exactly as shown above, and choose your deposit account.
            </p>
        </div>

        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            If you have any issues accepting the transfer, reply to this email or use the Help chat on BridgeWork.
            Keep this email safe until the transfer is deposited.
        </p>
    `;
    return wrapInLayout(content);
}

async function sendProPayoutNotificationEmail(proEmail, proName, amount, etransferEmail, securityQuestion, securityAnswer) {
    if (!resend) {
        logger.warn('Email service not configured — skipping payout notification email');
        return { success: false, error: 'Email service not configured' };
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: `BridgeWork: Your $${parseFloat(amount).toFixed(2)} payout has been sent`,
            html: proPayoutNotificationEmailHTML(proName, amount, etransferEmail, securityQuestion, securityAnswer),
        });
        if (error) {
            logger.error('Failed to send payout notification email', { error: error.message, to: proEmail });
            return { success: false, error: error.message };
        }
        logger.info('Payout notification email sent', { to: proEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Payout notification email exception', { error: err.message, to: proEmail });
        return { success: false, error: err.message };
    }
}

// ─── Booking Cancellation Email Template ────────────────────────────────────
function bookingCancellationEmailHTML(recipientName, booking, cancelledBy) {
    const firstName = recipientName ? recipientName.split(' ')[0] : 'there';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Booking Cancelled</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${firstName}, your booking <strong>${booking.booking_number || ''}</strong> has been cancelled${cancelledBy ? ` by the ${cancelledBy}` : ''}.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
                <td style="background-color:#fef2f2;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:600;">Cancellation Details</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Booking:</strong> ${booking.booking_number || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Service:</strong> ${booking.service_name || 'N/A'}</td></tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            If any payment was held, it will be refunded automatically.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/services" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        Browse Services
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendBookingCancellationEmail(toEmail, recipientName, booking, cancelledBy) {
    if (!resend) {
        logger.warn('Email service not configured — skipping cancellation email');
        return { success: false, error: 'Email service not configured' };
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `BridgeWork: Booking ${booking.booking_number || ''} Cancelled`,
            html: bookingCancellationEmailHTML(recipientName, booking, cancelledBy),
        });
        if (error) {
            logger.error('Failed to send cancellation email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        logger.info('Cancellation email sent', { to: toEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Cancellation email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// ─── Dispute Opened Email Template ──────────────────────────────────────────
function disputeOpenedEmailHTML(recipientName, booking, reason) {
    const firstName = recipientName ? recipientName.split(' ')[0] : 'there';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Dispute Opened</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${firstName}, a dispute has been opened for booking <strong>${booking.booking_number || ''}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
                <td style="background-color:#fffbeb;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;">Dispute Details</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Booking:</strong> ${booking.booking_number || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Service:</strong> ${booking.service_name || 'N/A'}</td></tr>
                        ${reason ? `<tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Reason:</strong> ${reason}</td></tr>` : ''}
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            Our team will review the dispute and reach out within 24–48 hours. You can communicate with the admin through the dispute chat on your dashboard.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/my-jobs" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        View My Jobs
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendDisputeOpenedEmail(toEmail, recipientName, booking, reason) {
    if (!resend) {
        logger.warn('Email service not configured — skipping dispute opened email');
        return { success: false, error: 'Email service not configured' };
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `BridgeWork: Dispute Opened for Booking ${booking.booking_number || ''}`,
            html: disputeOpenedEmailHTML(recipientName, booking, reason),
        });
        if (error) {
            logger.error('Failed to send dispute opened email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        logger.info('Dispute opened email sent', { to: toEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Dispute opened email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// ─── Dispute Resolved Email Template ────────────────────────────────────────
function disputeResolvedEmailHTML(recipientName, booking, resolution) {
    const firstName = recipientName ? recipientName.split(' ')[0] : 'there';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const content = `
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Dispute Resolved</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
            Hi ${firstName}, the dispute for booking <strong>${booking.booking_number || ''}</strong> has been resolved.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
                <td style="background-color:#f0fdf4;border-radius:8px;padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:600;">Resolution</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Booking:</strong> ${booking.booking_number || 'N/A'}</td></tr>
                        <tr><td style="padding:4px 0;color:#374151;font-size:14px;"><strong>Outcome:</strong> ${resolution || 'Resolved by admin'}</td></tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:1.7;">
            If you have any further questions, please contact our support team.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
                <td style="background-color:#0E7480;border-radius:8px;">
                    <a href="${frontendUrl}/my-jobs" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                        View My Jobs
                    </a>
                </td>
            </tr>
        </table>`;
    return wrapInLayout(content);
}

async function sendDisputeResolvedEmail(toEmail, recipientName, booking, resolution) {
    if (!resend) {
        logger.warn('Email service not configured — skipping dispute resolved email');
        return { success: false, error: 'Email service not configured' };
    }
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `BridgeWork: Dispute Resolved for Booking ${booking.booking_number || ''}`,
            html: disputeResolvedEmailHTML(recipientName, booking, resolution),
        });
        if (error) {
            logger.error('Failed to send dispute resolved email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        logger.info('Dispute resolved email sent', { to: toEmail, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Dispute resolved email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// ─── Guest Quote Request Emails ─────────────────────────────────────────────

// Confirmation sent to guest after submitting a quote request
async function sendGuestQuoteConfirmationEmail(toEmail, guestName, request) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Thank you, ${guestName}!</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                We've received your quote request for <strong>${request.service_name}</strong>.
            </p>
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#166534;">Request Details</p>
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Request #:</strong> ${request.request_number}<br>
                    <strong>Service:</strong> ${request.service_name}<br>
                    <strong>Location:</strong> ${request.address}, ${request.city}, ${request.state} ${request.zip_code}<br>
                    ${request.preferred_date ? `<strong>Preferred Date:</strong> ${new Date(request.preferred_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}<br>` : ''}
                    ${request.description ? `<strong>Notes:</strong> ${request.description}<br>` : ''}
                </p>
            </div>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Our team will review your request and get back to you with a personalized quote. You'll receive an email once your quote is ready.
            </p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                If you have any questions, please contact us at <a href="mailto:${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}" style="color:#0E7480;">${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}</a>.
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `[BridgeWork] Quote Request Received — ${request.request_number}`,
            html,
        });
        if (error) {
            logger.error('Failed to send guest quote confirmation', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Guest quote confirmation email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// Notification to admins about a new guest quote request
async function sendAdminNewGuestQuoteEmail(adminEmails, request) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">New Guest Quote Request</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                A public visitor has submitted a quote request.
            </p>
            <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Request #:</strong> ${request.request_number}<br>
                    <strong>Name:</strong> ${request.guest_name}<br>
                    <strong>Email:</strong> ${request.guest_email}<br>
                    <strong>Phone:</strong> ${request.guest_phone}<br>
                    <strong>Service:</strong> ${request.service_name}<br>
                    <strong>Location:</strong> ${request.address}, ${request.city}, ${request.state} ${request.zip_code}<br>
                    ${request.preferred_date ? `<strong>Preferred Date:</strong> ${new Date(request.preferred_date).toLocaleDateString('en-CA')}<br>` : ''}
                    ${request.description ? `<strong>Description:</strong> ${request.description}<br>` : ''}
                </p>
            </div>
            <p style="color:#374151;font-size:15px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/guest-quotes" style="display:inline-block;background:#0E7480;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">View in Admin Panel</a>
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmails,
            subject: `[BridgeWork] New Guest Quote — ${request.service_name} — ${request.guest_name}`,
            html,
        });
        if (error) {
            logger.error('Failed to send admin guest quote notification', { error: error.message });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Admin guest quote email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// Quote details sent to guest by admin
async function sendGuestQuoteEmail(toEmail, guestName, request, adminMessage) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const subtotal = parseFloat(request.quoted_price);
        const tax = parseFloat(request.tax_amount || 0);
        const total = subtotal + tax;
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Your Quote is Ready, ${guestName}!</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Thank you for your interest in our services. Here is your personalized quote for <strong>${request.service_name}</strong>.
            </p>
            ${adminMessage ? `<div style="background-color:#f9fafb;border-left:4px solid #0E7480;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;"><p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">${adminMessage}</p></div>` : ''}
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#166534;">Quote Summary</p>
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Quote #:</strong> ${request.request_number}<br>
                    <strong>Service:</strong> ${request.service_name}<br>
                    <strong>Location:</strong> ${request.address}, ${request.city}, ${request.state} ${request.zip_code}<br>
                </p>
                <hr style="border:none;border-top:1px solid #bbf7d0;margin:12px 0;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Subtotal:</strong> $${subtotal.toFixed(2)} CAD<br>
                    <strong>HST (13%):</strong> $${tax.toFixed(2)} CAD<br>
                    <strong style="font-size:16px;color:#166534;">Total: $${total.toFixed(2)} CAD</strong>
                </p>
            </div>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                If you'd like to proceed, we'll send you a secure payment link. Simply reply to this email or contact us to confirm.
            </p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                Contact us: <a href="mailto:${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}" style="color:#0E7480;">${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}</a>
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `[BridgeWork] Your Quote for ${request.service_name} — ${request.request_number}`,
            html,
        });
        if (error) {
            logger.error('Failed to send guest quote email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Guest quote email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// Payment link sent to guest
async function sendGuestPaymentLinkEmail(toEmail, guestName, request, paymentUrl) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const total = parseFloat(request.quoted_price) + parseFloat(request.tax_amount || 0);
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Payment Link for Your Service</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Hi ${guestName}, your payment link is ready for <strong>${request.service_name}</strong>.
            </p>
            <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Quote #:</strong> ${request.request_number}<br>
                    <strong>Total Amount:</strong> <span style="font-size:18px;font-weight:700;color:#0E7480;">$${total.toFixed(2)} CAD</span>
                </p>
            </div>
            <p style="text-align:center;margin:24px 0;">
                <a href="${paymentUrl}" style="display:inline-block;background:#0E7480;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;">Pay Now — $${total.toFixed(2)} CAD</a>
            </p>
            <p style="color:#6b7280;font-size:13px;text-align:center;">
                This is a secure payment link powered by Stripe. Your payment information is encrypted and safe.
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `[BridgeWork] Payment Link — ${request.service_name} — $${total.toFixed(2)} CAD`,
            html,
        });
        if (error) {
            logger.error('Failed to send guest payment link email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Guest payment link email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// Invoice sent to guest after payment
async function sendGuestInvoiceEmail(toEmail, guestName, request) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const subtotal = parseFloat(request.quoted_price);
        const tax = parseFloat(request.tax_amount || 0);
        const total = subtotal + tax;
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Invoice — Payment Received</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Hi ${guestName}, thank you for your payment. Below is your invoice for the completed service.
            </p>
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#166534;">Invoice Details</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                    <tr>
                        <td style="padding:6px 0;"><strong>Invoice #:</strong></td>
                        <td style="padding:6px 0;text-align:right;">${request.request_number}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;"><strong>Date:</strong></td>
                        <td style="padding:6px 0;text-align:right;">${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;"><strong>Service:</strong></td>
                        <td style="padding:6px 0;text-align:right;">${request.service_name}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;"><strong>Location:</strong></td>
                        <td style="padding:6px 0;text-align:right;">${request.address}, ${request.city}</td>
                    </tr>
                    <tr style="border-top:1px solid #bbf7d0;">
                        <td style="padding:8px 0;"><strong>Subtotal:</strong></td>
                        <td style="padding:8px 0;text-align:right;">$${subtotal.toFixed(2)} CAD</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;"><strong>HST (13%):</strong></td>
                        <td style="padding:6px 0;text-align:right;">$${tax.toFixed(2)} CAD</td>
                    </tr>
                    <tr style="border-top:2px solid #166534;">
                        <td style="padding:8px 0;"><strong style="font-size:16px;">Total Paid:</strong></td>
                        <td style="padding:8px 0;text-align:right;"><strong style="font-size:16px;color:#166534;">$${total.toFixed(2)} CAD</strong></td>
                    </tr>
                </table>
            </div>
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
                <p style="margin:0;color:#166534;font-weight:600;font-size:15px;">Payment Status: PAID</p>
            </div>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Thank you for choosing BridgeWork! If you have any questions about this invoice, please contact us.
            </p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">
                <a href="mailto:${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}" style="color:#0E7480;">${process.env.CONTACT_EMAIL || 'bridgeworkservice@gmail.com'}</a>
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [toEmail],
            subject: `[BridgeWork] Invoice — ${request.service_name} — ${request.request_number}`,
            html,
        });
        if (error) {
            logger.error('Failed to send guest invoice email', { error: error.message, to: toEmail });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Guest invoice email exception', { error: err.message, to: toEmail });
        return { success: false, error: err.message };
    }
}

// Notify pro about guest quote assignment
async function sendProGuestQuoteAssignmentEmail(proEmail, proName, request) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">New Quote Assignment</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                Hi ${proName}, you've been assigned to provide a quote for a customer.
            </p>
            <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Request #:</strong> ${request.request_number}<br>
                    <strong>Service:</strong> ${request.service_name}<br>
                    <strong>Customer:</strong> ${request.guest_name}<br>
                    <strong>Location:</strong> ${request.address}, ${request.city}, ${request.state} ${request.zip_code}<br>
                    ${request.preferred_date ? `<strong>Preferred Date:</strong> ${new Date(request.preferred_date).toLocaleDateString('en-CA')}<br>` : ''}
                    ${request.description ? `<strong>Description:</strong> ${request.description}<br>` : ''}
                </p>
            </div>
            <p style="text-align:center;margin:24px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pro-dashboard?tab=quotes" style="display:inline-block;background:#0E7480;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Submit Your Quote</a>
            </p>
            <p style="color:#6b7280;font-size:13px;text-align:center;">
                Log in to your Pro Dashboard to review the request and submit your quotation.
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [proEmail],
            subject: `[BridgeWork] Quote Assignment: ${request.service_name} — ${request.request_number}`,
            html,
        });
        if (error) {
            logger.error('Failed to send pro guest quote assignment email', { error: error.message, to: proEmail });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Pro guest quote assignment email exception', { error: err.message, to: proEmail });
        return { success: false, error: err.message };
    }
}

// Notify admins when pro submitted their guest quote
async function sendAdminProGuestQuoteSubmittedEmail(adminEmails, request, proBusinessName, quotedPrice) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    try {
        const html = wrapInLayout(`
            <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">Pro Submitted Guest Quote</h2>
            <p style="color:#374151;font-size:15px;line-height:1.7;">
                <strong>${proBusinessName}</strong> has submitted their quotation for a guest quote request.
            </p>
            <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.8;">
                    <strong>Request #:</strong> ${request.request_number}<br>
                    <strong>Service:</strong> ${request.service_name}<br>
                    <strong>Guest:</strong> ${request.guest_name}<br>
                    <strong>Pro Quote:</strong> <span style="font-size:16px;font-weight:700;color:#166534;">$${quotedPrice.toFixed(2)} CAD</span>
                </p>
            </div>
            <p style="text-align:center;margin:24px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/guest-quotes" style="display:inline-block;background:#0E7480;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Review & Send to Guest</a>
            </p>
        `);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmails,
            subject: `[BridgeWork] Pro Quoted $${quotedPrice.toFixed(2)} — ${request.service_name} — ${request.request_number}`,
            html,
        });
        if (error) {
            logger.error('Failed to send admin pro guest quote submitted email', { error: error.message });
            return { success: false, error: error.message };
        }
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Admin pro guest quote submitted email exception', { error: err.message });
        return { success: false, error: err.message };
    }
}

// ─── Customer: Formal Quote Received (Pro-Generated) ────────────────────────
function formalQuoteEmailHTML(customerName, proName, quote) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://bridgeworkservices.com';
    const items = (quote.quote_items || []).map(i => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;">${i.description}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">${i.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151;text-align:right;">$${parseFloat(i.amount || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    return wrapInLayout(`
        <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:600;">You've Received a Quote 📋</h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
            Hi ${customerName}, <strong>${proName}</strong> has sent you a quote for "<strong>${quote.title || 'Home Service'}</strong>".
        </p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
                <tr style="background:#f3f4f6;">
                    <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280;">Description</th>
                    <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;">Qty</th>
                    <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280;">Amount</th>
                </tr>
            </thead>
            <tbody>${items}</tbody>
        </table>

        <table style="width:100%;margin-bottom:24px;">
            <tr>
                <td style="padding:6px 0;font-size:14px;color:#374151;">Subtotal</td>
                <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">$${parseFloat(quote.subtotal || 0).toFixed(2)}</td>
            </tr>
            <tr>
                <td style="padding:6px 0;font-size:14px;color:#374151;">Tax</td>
                <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">$${parseFloat(quote.tax_amount || 0).toFixed(2)}</td>
            </tr>
            <tr style="border-top:2px solid #0E7480;">
                <td style="padding:10px 0;font-size:16px;font-weight:700;color:#0E7480;">Total</td>
                <td style="padding:10px 0;font-size:16px;font-weight:700;color:#0E7480;text-align:right;">$${parseFloat(quote.total || 0).toFixed(2)} CAD</td>
            </tr>
        </table>

        ${quote.valid_until ? `<p style="margin:0 0 20px;color:#6b7280;font-size:13px;">This quote is valid until <strong>${new Date(quote.valid_until).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.</p>` : ''}

        <div style="text-align:center;margin-top:24px;">
            <a href="${frontendUrl}/dashboard/quotes/${quote.id}"
               style="display:inline-block;padding:12px 32px;background:#0E7480;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
                View Quote Details
            </a>
        </div>
    `);
}

async function sendFormalQuoteEmail(customerEmail, customerName, proName, quote) {
    try {
        if (!resend) { logger.warn('Resend not configured, skipping formal quote email'); return { success: false, error: 'Email service not configured' }; }
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `[BridgeWork] New Quote from ${proName}: ${quote.title || 'Home Service'}`,
            html: formalQuoteEmailHTML(customerName, proName, quote),
        });
        if (error) { logger.error('Failed to send formal quote email', { error: error.message }); return { success: false, error: error.message }; }
        logger.info('Formal quote email sent', { to: customerEmail, quoteId: quote.id, id: data?.id });
        return { success: true, id: data?.id };
    } catch (err) {
        logger.error('Formal quote email exception', { error: err.message });
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
    sendProPayoutNotificationEmail,
    sendBookingCancellationEmail,
    sendDisputeOpenedEmail,
    sendDisputeResolvedEmail,
    sendGuestQuoteConfirmationEmail,
    sendAdminNewGuestQuoteEmail,
    sendGuestQuoteEmail,
    sendGuestPaymentLinkEmail,
    sendGuestInvoiceEmail,
    sendProGuestQuoteAssignmentEmail,
    sendAdminProGuestQuoteSubmittedEmail,
    sendFormalQuoteEmail,
};
