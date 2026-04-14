const express = require('express');
const router = express.Router();
const { handleTransactionSucceeded } = require('../controllers/ghlWebhookController');

// POST /api/webhooks/ghl
// Receives Supabase DB webhook for transactions table → forwards to GHL
router.post('/ghl', handleTransactionSucceeded);

module.exports = router;
