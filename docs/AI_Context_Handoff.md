# BridgeWork — AI Context Handoff Document

> **Purpose:** This file captures full project context so any AI assistant (Cascade/Windsurf) on any machine can continue where we left off. Paste or reference this file at the start of a new conversation.
>
> **Last Updated:** February 19, 2026

---

## Project Overview

- **Brand:** BridgeWork (NOT "Jiffy" — all references should use BridgeWork)
- **Type:** Home services marketplace (like Jiffy/TaskRabbit)
- **Stack:** Next.js 14 + Express.js + Supabase + Stripe
- **Repo:** `https://github.com/GvD17-potato/BridgeWork.git` (branch: `main`)
- **Repo Root:** `jiffy-replica/` contains `frontend/`, `backend/`, `database/`; `docs/` is at repo root

## Tech Stack Details

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Redux Toolkit | 3000 |
| Backend | Express.js, Supabase Admin Client, Socket.IO | 5000 |
| Database | Supabase (PostgreSQL + PostGIS) | Hosted |
| Payments | Stripe (PaymentIntents with manual capture + Stripe Connect) | — |
| Auth | Supabase Auth (JWT) | — |
| Real-time | Socket.IO (messaging, typing indicators) | — |
| Storage | Supabase Storage (chat image uploads) | — |
| Frontend Hosting | Netlify — `https://fluffy-melomakarona-d00b8e.netlify.app` | — |
| Backend Hosting | Render — `https://bridgework-backend.onrender.com` | — |

## Current Completion: ~90%

### What's Done (✅)
- **28+ frontend pages** (all UI complete, redesigned landing + auth pages)
- **8 backend API modules** (auth, services, bookings, pros, reviews, payments, messages, stripe connect)
- **Full auth flow** (Supabase Auth + JWT, AuthProvider with debounced fetchProfile)
- **16 database tables** with RLS (including `job_proof`)
- **Real-time messaging** with image upload (Socket.IO + Supabase Storage)
- **Complete booking flow** (create → pay → pro accepts → pro submits proof → user confirms → completed)
- **Pro registration and job management** (accept/decline jobs, submit proof of work)
- **Escrow Payment System** (Stripe PaymentIntents with `capture_method: 'manual'`):
  - User pays at booking time → funds HELD (not charged)
  - Pro completes work → submits proof (photos + notes)
  - User reviews proof → clicks "Confirm & Pay" → funds captured → job completed
  - User can "Dispute" → funds frozen → admin notified
  - Idempotent capture (handles retries gracefully)
- **Stripe Connect** — pro onboarding, payment splitting (15% platform fee), pro earnings dashboard
- **Transaction History** — user transaction page
- **Admin Revenue Dashboard** — `/admin/revenue` with refund handling
- **Promo Codes** — end-to-end wired at checkout
- **Payment Status Badges** — "Funds Held" (blue), "Paid" (green), "Pay Now" on booking cards
- **CORS** — dynamic origin matching, trailing slash stripping for FRONTEND_URL env var

### What's Left (🔲) — Remaining Tasks

#### HIGH PRIORITY
1. **Point Render to new repo** — Render currently deploys from `BridgeWork-depreciated` (old repo). Update Render settings → Build & Deploy → change connected repo to `GvD17-potato/BridgeWork` on `main` branch
2. **Production smoke test** — Full end-to-end test of escrow flow on production (Netlify + Render) with Stripe test cards
3. **Admin dashboard for disputes** — Backend endpoints exist (`disputeBooking`, `cancelHeldPayment`) but no admin-facing UI to review and resolve disputes
4. **Run database migration** — Execute `database/migrations/005_escrow_job_proof.sql` in Supabase SQL Editor (adds `job_proof` table and new booking columns). May already be done — check if `job_proof` table exists first

#### MEDIUM PRIORITY
5. **Auto-refund scheduler** — Bookings with held funds but no pro acceptance by scheduled date should auto-refund
6. **Email notifications** — Booking confirmations, status updates, payment receipts (use Resend or SendGrid)
7. **Push notifications** — Browser push for new messages, job alerts, booking updates
8. **In-app notification center** — Bell icon with dropdown (DB `notifications` table already exists)
9. **Pro proof image upload** — Currently pros enter photo URLs manually; integrate Supabase Storage for direct upload
10. **Review & rating system** — Prompt users to leave review after confirming completed job (backend partially ready)

#### LOWER PRIORITY
11. **Full admin dashboard** — User management, booking oversight, analytics, pro application review
12. **Support ticket system** — DB table exists, needs UI
13. **Pro availability calendar** — Weekly schedule, time-off management
14. **Transaction history page** — Dedicated frontend page (backend endpoint exists)
15. **Mobile responsiveness audit** — Verify escrow UI (modals, badges, buttons) on mobile
16. **SEO & meta tags** — Open Graph, Twitter cards, page titles
17. **Security audit** — Input sanitization, rate limiting review, CORS hardening
18. **Error handling polish** — Better user-facing error messages and loading states

## Key Accounts (Test)

| Email | Name | Role |
|-------|------|------|
| `zeldaalberona17@gmail.com` | Marc Polo | **admin** |
| `danafgaliver@gmail.com` | Galiver Danaf | **pro** |
| `zetthebloodedge@gmail.com` | Daniel Mercado | **user** |

**Stripe test card:** `4242 4242 4242 4242` (any future expiry, any CVC)

## Important Architecture Notes

1. **Auth Flow:** Supabase Auth → backend validates JWT via `supabase.auth.getUser(token)` → profile from `profiles` table via supabaseAdmin (bypasses RLS)
2. **NEVER call `supabase.auth.getSession()` inside `onAuthStateChange` callback** — it deadlocks. Pass `session.access_token` directly.
3. **RLS Recursion Bug:** Admin RLS policies on `profiles` table cause infinite recursion. Backend uses `supabaseAdmin` to bypass.
4. **Escrow Payment Flow:**
   - `createPaymentIntent` uses `capture_method: 'manual'` — funds are authorized but NOT charged
   - Payment allowed at `pending` status (pay-first flow, before pro accepts)
   - Webhook handles `payment_intent.amount_capturable_updated` (hold confirmed) and `payment_intent.canceled` (hold released)
   - `capturePayment` endpoint: user confirms → Stripe captures → booking marked completed
   - Post-capture DB updates are **non-fatal** (errors logged, but API returns 200 since Stripe already captured)
   - Idempotent: if booking already completed or transaction already succeeded, returns success
5. **Stripe Connect:** Platform takes 15% commission (`PLATFORM_COMMISSION_RATE` env var). Payment splitting uses `application_fee_amount` + `transfer_data.destination`.
6. **Pro profiles** have `stripe_account_id` column for Stripe Connect.
7. **Frontend auth** uses `authInitialized` flag in Redux to prevent redirect race conditions after Stripe payment redirects.
8. **CORS:** `server.js` strips trailing slashes from `FRONTEND_URL` env var before adding to allowed origins. In dev, any `127.0.0.1` or `localhost` origin is allowed.
9. **Booking statuses:** `pending`, `accepted`, `in_progress`, `completed`, `cancelled`, `disputed`
10. **Transaction statuses:** `pending`, `held`, `succeeded`, `failed`, `refunded`

## Escrow Flow Diagram

```
User books service → Pays via Stripe (funds HELD, not charged)
    ↓
Pro receives job alert → Accepts job → Status: accepted
    ↓
Pro completes work → Submits proof (photos + notes) → Status: in_progress
    ↓
User reviews proof on My Jobs page
    ↓
  ┌─── User clicks "Confirm & Pay" → Funds captured → Status: completed
  │
  └─── User clicks "Dispute" → Funds frozen → Admin notified → Status: disputed
```

## Key Files

### Backend
- `backend/src/server.js` — Express server, CORS config, Socket.IO setup
- `backend/src/controllers/paymentsController.js` — Stripe payment intents, webhooks, escrow capture, cancel, dispute
- `backend/src/controllers/stripeConnectController.js` — Connect onboarding, earnings, admin revenue, refunds
- `backend/src/controllers/prosController.js` — Pro jobs, proof submission (`submitJobProof`, `getJobProof`)
- `backend/src/routes/payments.js` — Payment routes: create-intent, webhook, capture, cancel-hold, dispute
- `backend/src/routes/pros.js` — Pro routes: jobs, proof submission
- `backend/src/middleware/auth.js` — authenticate, authorize(role), optionalAuth
- `backend/src/scripts/setupAdminAccount.js` — Promote user to admin
- `backend/src/scripts/setupProAccount.js` — Promote user to pro

### Frontend
- `frontend/src/lib/api.js` — All API client methods (submitProof, getJobProof, capturePayment, cancelHold, disputeBooking)
- `frontend/src/app/my-jobs/page.js` — User jobs with escrow UI: view proof, confirm & pay, dispute modals
- `frontend/src/app/pro-dashboard/page.js` — Pro dashboard with proof submission modal, earnings tab, Stripe Connect
- `frontend/src/app/dashboard/page.js` — Dashboard with payment badges (Funds Held / Paid / Pay Now)
- `frontend/src/app/checkout/[bookingId]/CheckoutClient.js` — Stripe Elements checkout (allows payment at pending status)
- `frontend/src/app/payment-success/PaymentSuccessClient.js` — Post-payment with escrow messaging ("Payment Authorized")
- `frontend/src/app/admin/revenue/page.js` — Admin revenue dashboard with refund modal
- `frontend/src/store/slices/authSlice.js` — Redux auth with authInitialized flag
- `frontend/src/app/providers.js` — AuthProvider with Supabase listener (debounced fetchProfile)

### Database
- `database/migrations/005_escrow_job_proof.sql` — Adds `job_proof` table, new booking columns, new enum values
- `database/scripts/clean_test_data.sql` — Cleans all test data including job_proof

### Docs (at repo root `docs/`)
- `docs/AI_Context_Handoff.md` — THIS FILE
- `docs/EOD_Reports.md` + `.docx` — Daily progress reports (Feb 5–18)
- `docs/Video_Demo_Script.md` + `.docx` — Video recording script with escrow flow scenes
- `docs/Delivery_Timeline_Goals.md` + `.docx` — Full delivery timeline, cost breakdown, phases
- `docs/Payment_Revenue_Breakdown.md` + `.docx` — Revenue model and fee calculations
- `docs/Project_Structure_Analysis.md` + `.docx` — Codebase structure analysis
- `docs/Weekly_Summary_Report.md` + `.docx` — Weekly summary for stakeholders

## Deployment Info

| Service | URL | Deploys From |
|---------|-----|-------------|
| **Frontend (Netlify)** | `https://fluffy-melomakarona-d00b8e.netlify.app` | `GvD17-potato/BridgeWork` → `main` |
| **Backend (Render)** | `https://bridgework-backend.onrender.com` | ⚠️ Currently `GvD17-potato/BridgeWork-depreciated` → `main` — **NEEDS TO BE CHANGED to `BridgeWork` repo** |
| **Database (Supabase)** | Hosted | — |

### Render Environment Variables (Backend)
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_COMMISSION_RATE=0.15
FRONTEND_URL=https://fluffy-melomakarona-d00b8e.netlify.app
NODE_ENV=production
```

### Netlify Environment Variables (Frontend)
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=https://bridgework-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Local Development (.env / .env.local)
```
# Backend .env
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_COMMISSION_RATE=0.15
FRONTEND_URL=http://localhost:3000

# Frontend .env.local
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Recent Bug Fixes (for context)

1. **capturePayment 500 error (Feb 18):** Stripe captured funds but backend returned 500 because `supabaseAdmin.raw()` doesn't exist. Fixed by: (a) fetch-then-increment pattern for pro stats, (b) non-fatal post-capture DB updates, (c) idempotency checks.
2. **CORS blocking new Netlify (Feb 18):** `FRONTEND_URL` env var on Render had trailing slash, browser sends origin without it. Fixed by stripping trailing slashes in `server.js`.
3. **AuthProvider rate limiting (Feb 14):** 429 errors on `/auth/me`. Fixed by exempting from rate limiter and debouncing `fetchProfile`.

## Git History (Key Commits)

| Date | Hash | Description |
|------|------|-------------|
| Feb 18 | `1d67ac7` | docs: Updated Video Demo Script + generated .docx |
| Feb 18 | `f0b21d2` | fix: strip trailing slash from FRONTEND_URL in CORS config |
| Feb 18 | `0804387` | Change Production url |
| Feb 18 | `888b8d5` | docs: EOD reports Feb 14-18 |
| Feb 17 | `3ed793d` | feat: Escrow payment system — hold funds, proof upload, confirm/dispute |
| Feb 15-16 | `0a51e00` | redesign landing and auth pages |
| Feb 14 | `45481e1` | feat: Phase 2A + 2B — Stripe payments, Connect, admin revenue, refunds |
| Feb 13 | `c298340` | feat: Add image upload to chat + fix auto-scroll bug |

---

## How to Set Up on a New Machine

1. **Clone:** `git clone https://github.com/GvD17-potato/BridgeWork.git`
2. **Backend:** `cd jiffy-replica/backend && npm install` → create `.env` with vars above → `node src/server.js`
3. **Frontend:** `cd jiffy-replica/frontend && npm install` → create `.env.local` with vars above → `npm run dev`
4. **Database:** If fresh, run migrations in order in Supabase SQL Editor (`database/migrations/001_*.sql` through `005_*.sql`)

---

> **How to use:** At the start of a new Windsurf/Cascade conversation on another machine, say:
> "Read `docs/AI_Context_Handoff.md` for full project context. This is a home services platform called BridgeWork. Continue from the remaining tasks list."
