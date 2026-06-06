const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(srcRoot, '..');
const repoRoot = path.resolve(frontendRoot, '..');

describe('one deploy migration foundation', () => {
  test('frontend API client uses same-origin /api by default instead of Render URL env', () => {
    const source = fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8');

    expect(source).toContain("const API_URL = '/api';");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain('http://localhost:5000');
  });

  test('auth provider fetches the profile through same-origin /api', () => {
    const source = fs.readFileSync(path.join(srcRoot, 'app', 'providers.js'), 'utf8');

    expect(source).toContain("axios.get('/api/auth/me'");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain('http://localhost:5000');
  });

  test('admin signup uses same-origin public invitation endpoints', () => {
    const source = fs.readFileSync(path.join(srcRoot, 'app', 'admin-signup', 'page.js'), 'utf8');

    expect(source).toContain('`/api/admin-invitations/verify/${token}`');
    expect(source).toContain("'/api/admin-invitations/accept'");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
  });

  test('Supabase Edge bridgework-api function exists with service route handlers and legacy fallback', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).not.toContain('../_shared/');
    expect(edgeSource).toContain('handleServicesRequest');
    expect(edgeSource).toContain('LEGACY_API_BASE_URL');
    expect(edgeSource).toContain('FUNCTION_PREFIXES');
    expect(edgeSource).toContain('"/functions/v1/bridgework-api"');
    expect(edgeSource).toContain('"/health"');
    expect(edgeSource).toContain('"/api/services"');
    expect(edgeSource).toContain('"/api/services/categories"');
  });

  test('Supabase Edge bridgework-api function owns admin invitation and permission routes', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('handleAdminInvitationRequest');
    expect(edgeSource).toContain('handleAdminManageRequest');
    expect(edgeSource).toContain('authenticateAdmin');
    expect(edgeSource).toContain('"/api/admin-invitations/accept"');
    expect(edgeSource).toContain('"/api/admin/invitations/direct-create"');
    expect(edgeSource).toContain('"/api/admin/manage-admins/admins"');
    expect(edgeSource).toContain('VALID_PERMISSION_KEYS');
  });

  test('Supabase Edge bridgework-api function owns core auth and profile routes', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('handleAuthRequest');
    expect(edgeSource).toContain('authenticateUser');
    expect(edgeSource).toContain('"/api/auth/login"');
    expect(edgeSource).toContain('"/api/auth/logout"');
    expect(edgeSource).toContain('"/api/auth/refresh"');
    expect(edgeSource).toContain('"/api/auth/me"');
    expect(edgeSource).toContain('"/api/auth/profile"');
    expect(edgeSource).toContain('"/api/auth/change-password"');
  });

  test('bookings and quote/invoice route groups are routed through Supabase Edge before legacy fallback', () => {
    const proxySource = fs.readFileSync(
      path.join(srcRoot, 'app', 'api', '[...path]', 'route.js'),
      'utf8'
    );
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(proxySource).toContain('/^\\/api\\/bookings(?:\\/|$)/');
    expect(proxySource).toContain('/^\\/api\\/quotes-invoices(?:\\/|$)/');
    expect(edgeSource).toContain('handleBookingsRequest');
    expect(edgeSource).toContain('handleQuotesInvoicesRequest');
    expect(edgeSource).toContain('pathname.startsWith("/api/bookings")');
    expect(edgeSource).toContain('pathname.startsWith("/api/quotes-invoices")');
  });

  test('Supabase Edge owns pro quote request read endpoints for the first bookings migration slice', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('getProProfile');
    expect(edgeSource).toContain('"/api/bookings/pro/quote-requests"');
    expect(edgeSource).toContain('quoteRequestDetailMatch');
    expect(edgeSource).toContain('quote_assignments');
    expect(edgeSource).toContain('booking_quotations');
    expect(edgeSource).toContain('can_submit_quote');
  });

  test('Supabase Edge owns pro quote request write and counter-offer endpoints', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('submitQuotationMatch');
    expect(edgeSource).toContain('declineQuoteAssignmentMatch');
    expect(edgeSource).toContain('"/api/bookings/pro/my-quotations"');
    expect(edgeSource).toContain('respondCounterOfferMatch');
    expect(edgeSource).toContain('pending_admin_review');
    expect(edgeSource).toContain('A valid price greater than 0 is required');
    expect(edgeSource).toContain('Assignment declined successfully');
    expect(edgeSource).toContain('Counter-offer accepted! Your quote has been updated.');
  });

  test('Supabase Edge disambiguates pro quotation booking joins', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('bookings!booking_quotations_booking_id_fkey');
  });

  test('Supabase Edge owns homeowner quote view and counter-offer endpoints', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('homeownerBookingQuotationsMatch');
    expect(edgeSource).toContain('homeownerCounterOfferMatch');
    expect(edgeSource).toContain('"/api/bookings/:id/quotations"');
    expect(edgeSource).toContain('pending_admin_review');
    expect(edgeSource).toContain('Counter-offer sent! The pro will be notified.');
    expect(edgeSource).toContain('This quotation is not available for counter-offers');
  });

  test('Supabase Edge owns homeowner quote acceptance endpoint', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('homeownerAcceptQuotationMatch');
    expect(edgeSource).toContain('"/api/bookings/:bookingId/quotations/:quotationId/accept"');
    expect(edgeSource).toContain('getTaxRate');
    expect(edgeSource).toContain('selected_quotation_id');
    expect(edgeSource).toContain('Auto-generated when the homeowner accepted the selected quote.');
    expect(edgeSource).toContain('Quote accepted successfully! The pro has been notified to start the job.');
    expect(edgeSource).toContain('This booking has already been updated. Please refresh and try again.');
  });

  test('payment read and reporting endpoints route through Supabase Edge before legacy fallback', () => {
    const proxySource = fs.readFileSync(
      path.join(srcRoot, 'app', 'api', '[...path]', 'route.js'),
      'utf8'
    );
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(proxySource).toContain('/^\\/api\\/payments(?:\\/|$)/');
    expect(edgeSource).toContain('handlePaymentsRequest');
    expect(edgeSource).toContain('pathname.startsWith("/api/payments")');
    expect(edgeSource).toContain('"/api/payments/transactions"');
    expect(edgeSource).toContain('"/api/payments/connect/status"');
    expect(edgeSource).toContain('"/api/payments/connect/earnings"');
    expect(edgeSource).toContain('"/api/payments/connect/commission-rate"');
    expect(edgeSource).toContain('"/api/payments/admin/revenue"');
    expect(edgeSource).toContain('Route is still handled by the legacy payments backend');
  });

  test('Supabase Edge owns payment intent creation and payment confirmation', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('createPaymentIntentMatch');
    expect(edgeSource).toContain('confirmPaymentMatch');
    expect(edgeSource).toContain('stripePaymentIntentRequest');
    expect(edgeSource).toContain('"/api/payments/create-intent"');
    expect(edgeSource).toContain('"/api/payments/confirm-payment"');
    expect(edgeSource).toContain('capture_method: "manual"');
    expect(edgeSource).toContain('Payment is not available for this booking status.');
    expect(edgeSource).toContain('No price has been set for this booking yet.');
    expect(edgeSource).toContain('Payment not in expected state. Status:');
  });

  test('Supabase Edge owns held payment capture and payout ledger updates', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('capturePaymentMatch');
    expect(edgeSource).toContain('"/api/payments/capture"');
    expect(edgeSource).toContain('`/payment_intents/${heldTx.stripe_payment_intent_id}/capture`');
    expect(edgeSource).toContain('Job is already completed.');
    expect(edgeSource).toContain('Payment already captured. Job marked as completed.');
    expect(edgeSource).toContain('No held payment found for this booking.');
    expect(edgeSource).toContain('Cannot release payment');
    expect(edgeSource).toContain('pro_payouts');
    expect(edgeSource).toContain("payout_method: 'stripe_transfer'");
    expect(edgeSource).toContain("status: 'paid'");
    expect(edgeSource).toContain('Payment released. Job marked as completed.');
  });

  test('Supabase Edge owns Stripe payment webhook processing', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('handleStripeWebhook');
    expect(edgeSource).toContain('verifyStripeWebhookSignature');
    expect(edgeSource).toContain('"/api/payments/webhook"');
    expect(edgeSource).toContain('Webhook Error:');
    expect(edgeSource).toContain('stripe_webhook_events');
    expect(edgeSource).toContain("'payment_intent.amount_capturable_updated'");
    expect(edgeSource).toContain("'payment_intent.succeeded'");
    expect(edgeSource).toContain("'payment_intent.payment_failed'");
    expect(edgeSource).toContain("'payment_intent.canceled'");
    expect(edgeSource).toContain('handleInvoiceCheckoutCompleted');
    expect(edgeSource).toContain('Payment Hold Expired (Auto)');
    expect(edgeSource).toContain('{ received: true }');
  });

  test('Next API proxy keeps the previous public API env as a temporary fallback', () => {
    const proxySource = fs.readFileSync(
      path.join(srcRoot, 'app', 'api', '[...path]', 'route.js'),
      'utf8'
    );

    expect(proxySource).toContain('getMigratedApiBaseUrl');
    expect(proxySource).toContain('MIGRATED_EDGE_ROUTES');
    expect(proxySource).toContain('process.env.NEXT_PUBLIC_API_URL');
    expect(proxySource).toContain('const publicLegacyUrl = process.env.NEXT_PUBLIC_API_URL;');
  });

  test('Socket.IO uses a temporary legacy backend URL instead of the Netlify origin', () => {
    const socketSource = fs.readFileSync(path.join(__dirname, 'socket.js'), 'utf8');

    expect(socketSource).toContain('NEXT_PUBLIC_SOCKET_URL');
    expect(socketSource).toContain('NEXT_PUBLIC_API_URL');
    expect(socketSource).toContain('window.location.origin');
  });

  test('Supabase config targets the BridgeWork production project ref', () => {
    const configSource = fs.readFileSync(path.join(repoRoot, 'supabase', 'config.toml'), 'utf8');

    expect(configSource).toContain('project_id = "ndxauksylgoxtdoxwsjk"');
    expect(configSource).toContain('[functions.bridgework-api]');
    expect(configSource).toContain('verify_jwt = false');
  });

  test('Netlify deployment docs point /api to the BridgeWork Edge API', () => {
    const deploymentDoc = fs.readFileSync(path.join(repoRoot, 'NETLIFY_DEPLOYMENT.md'), 'utf8');

    expect(deploymentDoc).toContain(
      'SUPABASE_EDGE_API_URL=https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api'
    );
    expect(deploymentDoc).not.toContain('https://YOUR_PROJECT_REF.supabase.co/functions/v1/bridgework-api');
  });

  test('Phase 2 runbook includes deploy and live smoke commands', () => {
    const runbook = fs.readFileSync(
      path.join(repoRoot, 'docs', 'one-deploy-phase-2-services.md'),
      'utf8'
    );

    expect(runbook).toContain('npx supabase functions deploy bridgework-api --project-ref ndxauksylgoxtdoxwsjk');
    expect(runbook).toContain('The function is self-contained for dashboard deployment');
    expect(runbook).toContain('SUPABASE_EDGE_API_URL=https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api');
    expect(runbook).toContain('https://bridgeworkservices.com/api/services?search=hvac&sales_channel=residential');
  });
});
