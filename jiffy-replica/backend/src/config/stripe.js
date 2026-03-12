const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
    timeout: 30000, // 30 second timeout (default is 80s but Render may cut connections earlier)
    maxNetworkRetries: 2, // Retry on network failures
    telemetry: false, // Disable telemetry to reduce overhead
});

module.exports = stripe;
