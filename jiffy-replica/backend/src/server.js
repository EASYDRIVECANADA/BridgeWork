require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { supabaseAdmin } = require('./config/supabase');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const bookingsRoutes = require('./routes/bookings');
const prosRoutes = require('./routes/pros');
const reviewsRoutes = require('./routes/reviews');
const paymentsRoutes = require('./routes/payments');
const messagesRoutes = require('./routes/messages');
const quotesRoutes = require('./routes/quotes');
const supportChatRoutes = require('./routes/supportChat');
const onboardingRoutes = require('./routes/onboarding');

const app = express();

// Trust proxy - required for Render.com and other cloud platforms
app.set('trust proxy', 1);

const httpServer = createServer(app);
// Configure allowed origins
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://fluffy-melomakarona-d00b8e.netlify.app',
    'https://delicate-yeot-55d47d.netlify.app',
    'https://bridgeworkservices.com',
    'https://www.bridgeworkservices.com'
];

// Add production frontend URL if set (for flexibility)
if (process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, ''); // Strip trailing slashes
    if (!allowedOrigins.includes(frontendUrl)) {
        allowedOrigins.push(frontendUrl);
    }
}

// In development, allow any 127.0.0.1 origin (Windsurf preview proxies use random ports)
const isAllowedOrigin = (origin) => {
    if (!origin) return true; // Allow non-browser requests (Postman, curl, etc.)
    if (allowedOrigins.includes(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
    return false;
};

const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    }
});

const PORT = process.env.PORT || 5000;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());

app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 2000),
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for read-only data fetches in development
        if (process.env.NODE_ENV !== 'production' && req.method === 'GET') return true;
        // Always skip auth/me (called frequently by auth provider)
        if (req.path === '/auth/me' || req.path === '/api/auth/me') return true;
        return false;
    },
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Temporary diagnostic endpoint — REMOVE after debugging
app.get('/debug/env-check', async (req, res) => {
    const checks = {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 10) + '...',
        nodeEnv: process.env.NODE_ENV,
        frontendUrl: process.env.FRONTEND_URL,
    };
    // Check Stripe key
    checks.hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    checks.stripeKeyPrefix = process.env.STRIPE_SECRET_KEY?.substring(0, 12) + '...';
    try {
        const stripe = require('./config/stripe');
        const bal = await stripe.balance.retrieve();
        checks.stripeConnected = true;
        checks.stripeCurrency = bal.available?.[0]?.currency;
    } catch (e) {
        checks.stripeConnected = false;
        checks.stripeError = e.message;
    }
    // Raw HTTPS test to Stripe (bypass SDK)
    try {
        const result = await new Promise((resolve, reject) => {
            const https = require('https');
            const opts = {
                hostname: 'api.stripe.com',
                path: '/v1/balance',
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + process.env.STRIPE_SECRET_KEY },
                timeout: 10000,
            };
            const req = https.request(opts, res => {
                let b = ''; res.on('data', c => b += c);
                res.on('end', () => resolve({ status: res.statusCode, body: b.substring(0, 200) }));
            });
            req.on('error', e => reject(e));
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            req.end();
        });
        checks.stripeRawTest = result.status;
        checks.stripeRawOk = result.status === 200;
    } catch (e) {
        checks.stripeRawTest = 'failed';
        checks.stripeRawError = e.message;
    }
    // Test supabaseAdmin can read
    try {
        const { data, error } = await supabaseAdmin.from('profiles').select('id').limit(1);
        checks.adminCanRead = !error;
        checks.adminReadError = error?.message || null;
    } catch (e) {
        checks.adminCanRead = false;
        checks.adminReadError = e.message;
    }
    // Test supabaseAdmin can write (insert + delete)
    try {
        const testId = '00000000-0000-0000-0000-000000000001';
        const { error: insertErr } = await supabaseAdmin.from('profiles').upsert({
            id: testId, email: 'diag_test@test.com', full_name: 'Diag', role: 'user'
        });
        checks.adminCanWrite = !insertErr;
        checks.adminWriteError = insertErr?.message || null;
        if (!insertErr) {
            await supabaseAdmin.from('profiles').delete().eq('id', testId);
        }
    } catch (e) {
        checks.adminCanWrite = false;
        checks.adminWriteError = e.message;
    }
    res.json(checks);
});

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/pros', prosRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/quotes-invoices', quotesRoutes);
app.use('/api/support-chat', supportChatRoutes);
app.use('/api/onboarding', onboardingRoutes);

// ─── Contact Form Endpoint ───────────────────────────────────────────────────
const { sendContactFormEmail } = require('./services/emailService');
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Name, email, subject, and message are required.' });
        }
        const result = await sendContactFormEmail(name, email, phone || '', subject, message);
        if (!result.success) {
            return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
        }
        res.json({ success: true, message: 'Your message has been sent. We will get back to you soon!' });
    } catch (error) {
        logger.error('Contact form error', { error: error.message });
        res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
});

const userSockets = new Map();

io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    socket.on('authenticate', (userId) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        logger.info('User authenticated on socket', { userId, socketId: socket.id });
    });

    socket.on('join_booking', (bookingId) => {
        socket.join(`booking_${bookingId}`);
        logger.info('User joined booking room', { bookingId, socketId: socket.id });
    });

    socket.on('send_message', async (data) => {
        const { bookingId, message, recipientId } = data;
        try {
            // Persist message to database
            const { data: newMessage, error } = await supabaseAdmin
                .from('messages')
                .insert({
                    booking_id: bookingId,
                    sender_id: socket.userId,
                    recipient_id: recipientId,
                    message
                })
                .select(`
                    *,
                    sender:profiles!sender_id (
                        id,
                        full_name,
                        avatar_url,
                        role
                    )
                `)
                .single();

            if (error) {
                logger.error('Socket send_message DB error', { error: error.message });
                socket.emit('message_error', { error: 'Failed to save message' });
                return;
            }

            // Broadcast to booking room
            io.to(`booking_${bookingId}`).emit('new_message', newMessage);

            // Notify recipient directly if not in room
            const recipientSocketId = userSockets.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('new_message_notification', {
                    booking_id: bookingId,
                    message: newMessage
                });
            }
        } catch (err) {
            logger.error('Socket send_message error', { error: err.message });
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    socket.on('typing', (data) => {
        const { bookingId } = data;
        socket.to(`booking_${bookingId}`).emit('user_typing', {
            userId: socket.userId,
            bookingId
        });
    });

    socket.on('stop_typing', (data) => {
        const { bookingId } = data;
        socket.to(`booking_${bookingId}`).emit('user_stop_typing', {
            userId: socket.userId,
            bookingId
        });
    });

    // Support chat rooms
    socket.on('join_support', (conversationId) => {
        socket.join(`support_${conversationId}`);
        logger.info('User joined support room', { conversationId, socketId: socket.id });
    });

    socket.on('join_admin_support', () => {
        socket.join('admin_support_room');
        logger.info('Admin joined support room', { socketId: socket.id });
    });

    socket.on('booking_update', (data) => {
        const { bookingId, status } = data;
        io.to(`booking_${bookingId}`).emit('status_update', {
            bookingId,
            status,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            userSockets.delete(socket.userId);
        }
        logger.info('Client disconnected', { socketId: socket.id });
    });
});

app.set('io', io);
app.set('userSockets', userSockets);

app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection', { error: err.message, stack: err.stack });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

module.exports = { app, httpServer, io };
