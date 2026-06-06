# One-Deploy Phase 2: Services API Cutover

This phase migrates the public services and service categories API from Render to the Supabase Edge function while keeping Render as a fallback for unmigrated routes.

## Scope

Migrated through `supabase/functions/bridgework-api`:

- `GET /health`
- `GET /api/services`
- `GET /api/services/search`
- `GET /api/services/categories`
- `GET /api/services/categories/:id`
- `GET /api/services/:id`
- `GET /api/bookings/pro/quote-requests`
- `GET /api/bookings/pro/quote-requests/:id`
- `POST /api/bookings/pro/quote-requests/:id/submit`
- `POST /api/bookings/pro/quote-requests/:id/decline`
- `GET /api/bookings/pro/my-quotations`
- `POST /api/bookings/pro/quotations/:quotationId/respond-counter-offer`
- `GET /api/bookings/:id/quotations`
- `POST /api/bookings/:bookingId/quotations/:quotationId/counter-offer`
- `POST /api/bookings/:bookingId/quotations/:quotationId/accept`
- `GET /api/payments/transactions`
- `POST /api/payments/create-intent`
- `POST /api/payments/confirm-payment`
- `POST /api/payments/capture`
- `POST /api/payments/webhook` for payment intent events and invoice checkout sessions
- `GET /api/payments/connect/status` for pros without a Stripe account
- `GET /api/payments/connect/earnings`
- `GET /api/payments/connect/commission-rate`
- `GET /api/payments/admin/revenue`

The frontend now routes `/api/bookings/*`, `/api/quotes-invoices/*`, and `/api/payments/*` to Supabase Edge first. Unported bookings, quote/invoice, dispute, refund, cancel-hold, guest quote checkout, and Connect link actions still proxy from the Edge function to `LEGACY_API_BASE_URL` when that variable is configured.

## Supabase Deploy

Run from `jiffy-replica` with a Supabase account that has deploy access to project `ndxauksylgoxtdoxwsjk`:

```bash
npx supabase functions deploy bridgework-api --project-ref ndxauksylgoxtdoxwsjk
```

If deploying manually in the Supabase dashboard, create or edit the `bridgework-api` function and paste the contents of `supabase/functions/bridgework-api/index.ts`. The function is self-contained for dashboard deployment and does not require uploading the repo's `_shared` folder.

This local machine reached the project but received a `403` from Supabase, so an authorized owner/admin account must run the deploy or provide a valid Supabase access token.

## Netlify Environment

Set these in Netlify, then redeploy the site:

```bash
SUPABASE_EDGE_API_URL=https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api
LEGACY_API_BASE_URL=https://your-current-render-backend.example.com
NEXT_PUBLIC_API_URL=https://your-current-render-backend.example.com
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-signing-secret>
```

`SUPABASE_EDGE_API_URL` is the preferred target. `LEGACY_API_BASE_URL` keeps non-migrated routes working. `NEXT_PUBLIC_API_URL` remains a temporary emergency fallback and should be removed after Edge parity is complete.

## Smoke Checks

After deploying the function:

```bash
curl https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/health
curl "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/services?search=hvac&sales_channel=residential"
curl "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/services/categories?sales_channel=residential"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/bookings/pro/quote-requests"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/bookings/pro/my-quotations"
curl -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/bookings/<BOOKING_ID>/quotations"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/bookings/<BOOKING_ID>/quotations/<QUOTATION_ID>/accept"
curl -H "Authorization: Bearer <USER_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/transactions"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>"}' "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/create-intent"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>","payment_intent_id":"<PAYMENT_INTENT_ID>"}' "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/confirm-payment"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>"}' "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/capture"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/connect/earnings"
curl -H "Authorization: Bearer <USER_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/connect/commission-rate"
curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" "https://ndxauksylgoxtdoxwsjk.supabase.co/functions/v1/bridgework-api/api/payments/admin/revenue"
```

After setting Netlify env vars and redeploying:

```bash
curl "https://bridgeworkservices.com/api/services?search=hvac&sales_channel=residential"
curl "https://bridgeworkservices.com/api/services/categories?sales_channel=residential"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/bookings/pro/quote-requests"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/bookings/pro/my-quotations"
curl -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/bookings/<BOOKING_ID>/quotations"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/bookings/<BOOKING_ID>/quotations/<QUOTATION_ID>/accept"
curl -H "Authorization: Bearer <USER_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/payments/transactions"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>"}' "https://bridgeworkservices.com/api/payments/create-intent"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>","payment_intent_id":"<PAYMENT_INTENT_ID>"}' "https://bridgeworkservices.com/api/payments/confirm-payment"
curl -X POST -H "Authorization: Bearer <HOMEOWNER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"booking_id":"<BOOKING_ID>"}' "https://bridgeworkservices.com/api/payments/capture"
curl -H "Authorization: Bearer <PRO_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/payments/connect/earnings"
curl -H "Authorization: Bearer <USER_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/payments/connect/commission-rate"
curl -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" "https://bridgeworkservices.com/api/payments/admin/revenue"
```

Expected: each services response returns `success: true` and includes HVAC/category data. The pro quote-request response should return `success: true` with `data.bookings` and `data.pro_id`. The pro quotations response should return `success: true` with `data.quotations`. The homeowner booking quotations response should return `success: true` with `data.booking` and `data.quotations`. The quote-acceptance response should return `success: true`, `data.quotation.status` as `selected`, and an accepted booking with `total_price`. Payment read responses should return `success: true` with `data.transactions`, earnings totals, commission rate data, or revenue totals as appropriate. Payment intent creation should return `data.client_secret` and `data.payment_intent_id`; confirmation should return `data.status` as `held` for manual-capture intents; capture should return `data.status` as `captured` after proof of work exists. The public services page should show HVAC when searching at `/services?type=residential`.
