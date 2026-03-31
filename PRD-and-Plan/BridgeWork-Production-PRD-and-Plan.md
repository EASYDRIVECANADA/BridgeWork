# BridgeWork — Production-Grade PRD & Phased Project Plan

**Document Version:** 2.0 — Production Rewrite
**Source Audit Date:** 2026-03-26
**PRD Issued:** 2026-03-27
**System Completion at Audit:** 68%
**Classification:** CONFIDENTIAL — Internal Engineering Use Only
**Tech Stack:** Next.js 14 + Express.js + Supabase + Stripe
**Domain:** bridgeworkservices.com

---

## TABLE OF CONTENTS

**DELIVERABLE 1 — PRODUCTION-GRADE PRD**
1. [Audit Review — Gap Analysis](#1-audit-review--gap-analysis)
2. [Project Overview](#2-project-overview)
3. [Scope Definition](#3-scope-definition)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Success Metrics & Acceptance Criteria](#7-success-metrics--acceptance-criteria)

**DELIVERABLE 2 — PHASED PROJECT PLAN**
8. [Phase 0 — Discovery & Environment Setup](#phase-0--discovery--environment-setup)
9. [Phase 1 — Critical Security Hardening](#phase-1--critical-security-hardening)
10. [Phase 2 — Core Feature Completion](#phase-2--core-feature-completion)
11. [Phase 3 — Full Feature Build-Out](#phase-3--full-feature-build-out)
12. [Phase 4 — QA, Hardening & Performance](#phase-4--qa-hardening--performance)
13. [Phase 5 — Staging Validation & Pre-Launch](#phase-5--staging-validation--pre-launch)
14. [Phase 6 — Production Launch & Post-Launch](#phase-6--production-launch--post-launch)
15. [Risk Register](#risk-register)

---

---

# DELIVERABLE 1 — PRODUCTION-GRADE PRD

---

## 1. AUDIT REVIEW — GAP ANALYSIS

The following gaps, risks, and open questions were identified in the source audit before rewriting the PRD. All issues must be resolved before production deployment.

---

### 1.1 Critical Gaps — P0 Blockers

> These must be fixed before **any** production deployment. No exceptions.

🔴 **BUG-001** — SQL Injection in `prosController.js:39`. The `service_category` URL parameter is interpolated directly into a raw SQL query. Full database compromise is possible.
```javascript
// VULNERABLE — must be parameterized immediately
query += ` AND '${service_category}' = ANY(pp.service_categories)`;
```

🔴 **BUG-002** — Unauthenticated `/debug/env-check` endpoint in `server.js:145–217`. This endpoint requires zero authentication and exposes Supabase/Stripe key prefixes, allows test DB record creation and deletion. Must be removed entirely.

🔴 **BUG-003** — Stripe publishable key in `checkout/[bookingId]/page.js:26` falls back to hardcoded `pk_test_placeholder`. Any environment missing the env var will silently break all payments with no user-visible error.

🔴 **BUG-004** — `changePassword()` in `authController.js:322–325` does not verify the current password before allowing the change. If a session token is stolen, an attacker can permanently lock out the real user.

🔴 **BUG-005** — Stripe webhook handlers in `paymentController.js:210–345` have no idempotency keys. If Stripe fires a webhook twice (normal retry behavior), the system will double-capture funds from customers.

---

### 1.2 High Priority Gaps — P1

🟠 **OPEN QUESTION** — Commission rate (13%) is hardcoded in 3 separate files (`paymentController.js:6`, `prosController.js:532`, `payoutsController.js:4`). Must be centralized in a `platform_settings` DB table or a single env config before launch.

🟠 **OPEN QUESTION** — Tax rate is inconsistent: `8%` in `quotesController.js:90` vs `13%` in `prosController.js:532`. Which is correct? Stakeholder sign-off required before any invoice is issued in production.

🟠 **BUG-006** — Pro cannot decline a quote request. There is an explicit `// TODO` comment at `pro-dashboard/page.js:1133`. Pros are forced to accept every assigned job with no recourse.

🟠 **BUG-007** — Rate-type selection modal on `/services` page is entirely unreachable. The `modalSelection` trigger is never set to `true` anywhere in the code (lines 230–367). Users cannot select between hourly-rate and emergency pricing.

🟠 **RISK** — 83 `console.log` / `console.error` statements found across the production frontend codebase. Auth tokens, Stripe responses, and Supabase data are being printed to the browser developer console in cleartext.

🟠 **RISK** — Socket.IO authentication is set to optional in `server.js:265`. Unauthenticated clients can connect to the real-time event server, subscribe to channels, and receive events.

---

### 1.3 Missing Production-Readiness Criteria

| Area | Gap | Severity |
|------|-----|----------|
| Security | No formal OWASP Top 10 coverage audit completed | 🔴 CRITICAL |
| Security | No 2FA / MFA for any user type | 🟠 HIGH |
| Security | No password complexity requirements enforced | 🟠 HIGH |
| Security | No account lockout after repeated failed logins | 🟠 HIGH |
| Performance | No Core Web Vitals baseline established | 🟠 HIGH |
| Performance | Payout history hardcoded at `limit(100)` — no pagination | ⚠️ MEDIUM |
| Scalability | No load testing performed | 🟠 HIGH |
| Accessibility | WCAG 2.1 AA compliance not validated | 🟠 HIGH |
| Compliance | No GDPR data export / deletion endpoint | ⚠️ MEDIUM |
| Compliance | No audit log table for admin actions | ⚠️ MEDIUM |
| Email | Sending from `onboarding@resend.dev` — custom domain not verified | ⚠️ MEDIUM |
| Notifications | Notification bell imported but never rendered in `Navbar.js` | 🟠 HIGH |
| Payments | 7-day Stripe payment hold expiration not handled | 🟠 HIGH |
| Payments | No failed payment retry logic | 🟠 HIGH |
| PWA | Service worker configured but push notifications not wired | ⚠️ MEDIUM |
| Database | No `audit_log` table | ⚠️ MEDIUM |
| Database | No `promo_code_usages` table — per-user limits not enforced | ⚠️ MEDIUM |

---

### 1.4 Open Questions Requiring Stakeholder Sign-Off

⚠️ **OPEN QUESTION** — What is the correct tax rate: 8% or 13%? Both values exist in production code.

⚠️ **OPEN QUESTION** — Should "Remember Me" extend session to 30 days? What is the maximum desired token lifetime?

⚠️ **OPEN QUESTION** — Is Social Login (Google / Apple OAuth) required for MVP or is it a post-launch feature?

⚠️ **OPEN QUESTION** — Is 2FA mandatory for all admin accounts at launch, or can it be delivered post-launch?

⚠️ **OPEN QUESTION** — What is the target uptime SLA? (99.9% = max 8.7 hours downtime/year; 99.5% = max 43.8 hours/year)

⚠️ **OPEN QUESTION** — Should Stripe Connect payouts be manual (admin-triggered) or automated upon job completion confirmation?

⚠️ **OPEN QUESTION** — Is GDPR compliance required at launch? Depends on whether EU homeowners or pros are being onboarded.

📌 **ASSUMPTION** — Platform operates in USD only with a 13% commission rate and a single configurable tax rate stored in `platform_settings`.

📌 **ASSUMPTION** — Production deployment targets a major cloud provider (AWS / GCP / Railway) with containerized backend services.

📌 **ASSUMPTION** — Minimum viable launch requires all P0 bugs resolved and all `MUST` functional requirements implemented and tested.

📌 **ASSUMPTION** — The email sender domain will be migrated from `onboarding@resend.dev` to a verified custom domain (e.g., `noreply@bridgeworkservices.com`) before launch.

---

## 2. PROJECT OVERVIEW

### 2.1 Product Identity

| Field | Value |
|-------|-------|
| Product Name | BridgeWork |
| Tagline | "Home Services You Can Trust" |
| Website | bridgeworkservices.com |
| Product Type | Two-sided SaaS Marketplace |
| Primary Color | #0E7480 (Teal) |
| Email Provider | Resend API (custom domain required before launch) |
| Payment Provider | Stripe + Stripe Connect |
| Platform Commission | 13% (must be centralized — currently hardcoded in 3 files) |

### 2.2 Problem Statement

Homeowners struggle to find trustworthy, insured, and fairly priced home service professionals. Skilled tradespeople lack a reliable digital pipeline of vetted jobs with guaranteed payment. BridgeWork solves both sides: homeowners get verified pros with transparent pricing; pros get steady job flow with escrow payment protection. The platform monetizes via a 13% commission on every completed transaction.

### 2.3 Business Objectives & KPIs

| Objective | KPI | Target |
|-----------|-----|--------|
| Platform Revenue | Gross Merchandise Value (GMV) | $500K GMV in Year 1 |
| Marketplace Liquidity | Bookings completed per month | 500+ bookings/month by Month 6 |
| Pro Supply | Verified active pros on platform | 200+ verified pros at launch |
| User Retention | Homeowner repeat booking rate | >40% repeat within 90 days |
| Payment Reliability | Successful payment capture rate | >99.5% |
| Platform Uptime | System availability | 99.9% SLA |
| Customer Satisfaction | Average review rating | >4.3 / 5.0 stars |
| Dispute Rate | Disputes as % of completed jobs | <2% |

### 2.4 Target Users & Personas

| User Type | Description | Technical Proficiency |
|-----------|-------------|----------------------|
| **Homeowner** | Residential property owner seeking vetted home service pros | Low — expects a consumer-grade, mobile-friendly UX |
| **Professional (Pro)** | Verified tradesperson, contractor, or service provider | Low-to-Medium — uses dashboard to manage quotes, invoices, jobs |
| **Admin** | Platform operator managing pros, disputes, payouts | Medium — internal tool user, needs reliability and audit trails |
| **SuperAdmin** | Elevated admin managing other admins and system-wide settings | Medium-High — full platform control |

### 2.5 Competitive Context

BridgeWork competes in the home services marketplace vertical alongside platforms such as Thumbtack, Angi (formerly Angie's List), TaskRabbit, and Jiffy. Key differentiators are: escrow-based payment protection, multi-bid quote system, and direct in-app messaging between homeowner and pro.

---

## 3. SCOPE DEFINITION

### 3.1 In-Scope Features

#### P0 — Must Have (Launch Blockers)

- User authentication (signup, login, JWT, password reset, change password)
- Service browsing, search, and category filtering
- Booking / quote request creation with scheduling and address
- Pro bidding and multi-quote submission
- Quote management (create, send, accept, decline, counter)
- Invoice system (create, send, PDF download, mark paid)
- Payment escrow via Stripe (hold, capture, refund)
- Pro onboarding (4-step: business info, agreement, references, Stripe Connect)
- Admin dashboard (stats, pro management, dispute management, payouts)
- In-app real-time messaging (Socket.IO)
- Email notifications for all major lifecycle events
- Notification bell with unread count in navbar
- Reviews and ratings system
- Role-based access control (Homeowner / Pro / Admin / SuperAdmin)
- Pro decline-quote functionality
- Rate-type selection modal (hourly vs emergency) on service booking
- All P0 security fixes (BUG-001 through BUG-005)

#### P1 — Should Have (Ship within 30 days of launch)

- Real-time booking status updates via Socket.IO
- Password strength indicator
- Search input debounce (300ms)
- Booking cancellation confirmation dialog
- Pro availability scheduling (weekly + time-off)
- Geolocation / nearby pros (post SQL injection fix)
- Promo code system with per-user usage enforcement
- Dispute resolution workflow (complete end-to-end)
- Admin audit logging
- GDPR data export / deletion endpoint
- Payment hold expiration handling (7-day Stripe limit)
- Social login (Google OAuth)
- Pro portfolio gallery display

#### P2 — Nice to Have (Post-launch roadmap)

- 2FA / MFA for admin accounts
- Weekly pro job digest email
- PWA push notifications
- Service area map (visual geo radius)
- Rating breakdown chart (star distribution)
- Failed payment auto-retry
- "Remember Me" extended session
- Pro portfolio gallery with download

### 3.2 Explicitly Out of Scope

- Native iOS / Android apps (PWA only for mobile)
- Multi-currency or international payments (USD only at launch)
- Automated AI-powered pro matching
- In-platform video calling
- Third-party CRM integrations (Salesforce, HubSpot)
- White-label version of the platform

### 3.3 Assumptions & Dependencies

📌 **ASSUMPTION** — Supabase remains the primary database and auth provider through launch.

📌 **ASSUMPTION** — Stripe Connect is used for all pro payouts; no alternative payout method is supported at launch.

📌 **ASSUMPTION** — PostGIS is available and enabled on the Supabase Postgres instance for geo queries.

📌 **ASSUMPTION** — The frontend remains a Next.js 14 App Router application; no framework migration is planned.

📌 **ASSUMPTION** — A custom sender domain (`noreply@bridgeworkservices.com`) will be verified with Resend before launch.

---

## 4. FUNCTIONAL REQUIREMENTS

### FR-1: User Authentication

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-1.1 | Users shall register with email, password, full name, and role selection | MUST | ✅ Done |
| FR-1.2 | Users shall log in with email and password, receiving a JWT (1-day) + refresh token (7-day) | MUST | ✅ Done |
| FR-1.3 | Password reset shall be available via email link with 1-hour token expiry | MUST | ✅ Done |
| FR-1.4 | Password change shall require verification of the current password before acceptance | MUST | ❌ BUG-004 |
| FR-1.5 | Passwords shall enforce minimum 8 characters with at least one uppercase, one number, one special character | MUST | ❌ Missing |
| FR-1.6 | Failed login attempts shall be rate-limited: 5 attempts triggers a 15-minute lockout | MUST | ❌ Missing |
| FR-1.7 | Admins shall only be created via the invitation system (SuperAdmin issues invite token) | MUST | ✅ Done |
| FR-1.8 | 2FA via TOTP or SMS shall be available for admin accounts | SHOULD | ❌ Missing |
| FR-1.9 | "Remember Me" shall extend session to 30 days via a long-lived refresh token | SHOULD | ❌ UI only |
| FR-1.10 | Social login via Google OAuth shall be available for homeowner accounts | SHOULD | ❌ Missing |

**User Story:** As a homeowner, I want to create an account and log in securely so that I can book services and track my jobs.

**Acceptance Criteria (FR-1.4):**
- Given a logged-in user on the change password form
- When they submit a new password without providing the correct current password
- Then the system shall return HTTP 401 with error message "Current password is incorrect" and the password shall not be changed

**Edge Cases:**
- Expired JWT: return 401 with `TOKEN_EXPIRED` code; client must use refresh token
- Refresh token expired: force full re-login
- Account created via invitation: password must be set on first login

---

### FR-2: Service Discovery

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-2.1 | Homeowners shall browse services organized by category with API-driven data | MUST | ✅ Done |
| FR-2.2 | Services shall be searchable by keyword | MUST | ✅ Done |
| FR-2.3 | Service search shall debounce user input by 300ms before firing the API call | MUST | ❌ Missing |
| FR-2.4 | Services shall display pricing type (hourly vs fixed) clearly | MUST | ✅ Done |
| FR-2.5 | Users shall be able to select pricing type (standard rate vs emergency rate) when booking | MUST | ❌ BUG-007 |
| FR-2.6 | Service lists with more than 20 items shall implement server-side pagination | MUST | ❌ Missing |
| FR-2.7 | All API failures on the services page shall display user-facing error messages (not silent console errors) | MUST | ❌ Missing |
| FR-2.8 | Homepage pro showcase and testimonials shall be fetched from live API data | MUST | ❌ BUG-011 |

**Acceptance Criteria (FR-2.5):**
- Given a user browsing services on `/services`
- When they click "Book" on a service that supports multiple rate types
- Then a modal shall appear with rate-type options (Standard Rate / Emergency Rate)
- And the selected rate type shall be carried into the booking request payload

---

### FR-3: Booking System

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-3.1 | Homeowners shall create job requests specifying service, address, preferred date/time, and rate type | MUST | ✅ Done |
| FR-3.2 | Scheduled datetime shall be validated server-side to be a future date/time | MUST | ❌ Missing |
| FR-3.3 | Job requests shall be assigned to available, nearby, verified pros | MUST | ✅ Done |
| FR-3.4 | Pros shall accept or **decline** job assignments with a reason | MUST | ⚠️ Decline broken |
| FR-3.5 | Booking status shall progress through: `pending → accepted → in_progress → completed` | MUST | ✅ Done |
| FR-3.6 | Either party cancelling a booking shall trigger a confirmation dialog before submission | MUST | ❌ Missing |
| FR-3.7 | Real-time booking status updates shall be pushed to the client via Socket.IO (no manual refresh required) | SHOULD | ❌ Missing |
| FR-3.8 | Homeowners shall confirm job completion before payment is released from escrow | MUST | ✅ Done |
| FR-3.9 | Booking number generation shall use a cryptographically secure random method (not `Math.random()`) | MUST | ❌ BUG-010 |
| FR-3.10 | All race conditions on concurrent booking status updates shall be guarded with DB-level transactions | MUST | ⚠️ Risk |

**Acceptance Criteria (FR-3.4 — Pro Decline):**
- Given a pro viewing an assigned quote request
- When they click "Decline" and optionally enter a reason
- Then the booking status shall update to `declined` and the homeowner shall receive an email notification
- And the admin shall be notified to reassign the job

**Edge Cases:**
- Booking already paid: cancellation must trigger refund flow, not plain status update
- Past scheduled date: job cannot be accepted; auto-expire to `cancelled`
- Pro declines all assigned pros: admin is notified to manually source a replacement

---

### FR-4: Payments & Escrow

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-4.1 | Payments shall be held in Stripe escrow until the homeowner confirms job completion | MUST | ✅ Done |
| FR-4.2 | Platform commission shall be deducted from pro payout (rate stored in `platform_settings`) | MUST | ⚠️ Hardcoded |
| FR-4.3 | Tax rate shall be stored in `platform_settings` and applied consistently across all quotes and invoices | MUST | ❌ Inconsistent |
| FR-4.4 | Stripe webhooks shall use idempotency keys to safely handle duplicate event delivery | MUST | ❌ BUG-005 |
| FR-4.5 | Stripe webhook events shall validate the `Stripe-Signature` header and reject replays older than 300 seconds | MUST | ❌ Missing |
| FR-4.6 | Payment holds approaching the 7-day Stripe expiration shall be auto-handled (extend or capture/release) | MUST | ❌ Missing |
| FR-4.7 | All currency arithmetic shall use integer cents (not floating-point dollars) to prevent rounding errors | MUST | ❌ BUG-013 |
| FR-4.8 | Homeowners shall be able to open a dispute on a completed job within 48 hours of completion | MUST | ⚠️ Partial |
| FR-4.9 | Admins shall resolve disputes with options: full refund, partial refund, or close in pro's favour | MUST | ⚠️ Partial |
| FR-4.10 | The checkout page shall never fall back to a hardcoded Stripe key — env var must be required | MUST | ❌ BUG-003 |

**Acceptance Criteria (FR-4.4 — Webhook Idempotency):**
- Given Stripe fires a `payment_intent.succeeded` event
- When the same event is delivered a second time (Stripe retry)
- Then the system shall detect the duplicate via the `stripe_event_id` and skip processing
- And return HTTP 200 to Stripe (to stop retries) without double-capturing funds

---

### FR-5: Pro Management & Onboarding

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-5.1 | Pros shall complete a 4-step onboarding flow before being eligible to receive job assignments | MUST | ✅ Done |
| FR-5.2 | Onboarding step navigation shall validate required fields before advancing to the next step (no step-skipping) | MUST | ⚠️ Risk |
| FR-5.3 | Onboarding shall include Stripe Connect setup; pro cannot complete onboarding without it | MUST | ✅ Done |
| FR-5.4 | Stripe Connect return URL shall handle success and failure states with clear UI feedback | MUST | ⚠️ Partial |
| FR-5.5 | Insurance document date fields shall validate correct date format and future expiry | MUST | ❌ Missing |
| FR-5.6 | Admins shall approve or reject pro applications with an email notification sent on each decision | MUST | ✅ Done |
| FR-5.7 | Pros shall set weekly availability schedules; unavailable pros shall not appear in booking assignments | MUST | ⚠️ Partial |
| FR-5.8 | Nearby pro search shall use parameterized queries only — no raw string interpolation in SQL | MUST | ❌ BUG-001 |
| FR-5.9 | Pro profiles shall display: star rating, review count, portfolio images, service categories, and hourly rate | MUST | ⚠️ Partial |
| FR-5.10 | Service categories shown in the pro dashboard shall be fetched from the API, not hardcoded | MUST | ❌ BUG-012 |

---

### FR-6: Quotes & Invoicing

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-6.1 | Pros shall create itemized quotes with line items for labour and materials | MUST | ✅ Done |
| FR-6.2 | Quotes shall be emailed to the homeowner and visible in their dashboard | MUST | ✅ Done |
| FR-6.3 | Homeowners shall accept, decline, or counter-offer quotes | MUST | ⚠️ Partial |
| FR-6.4 | Concurrent quote acceptance (two users accepting simultaneously) shall be guarded with a DB-level lock | MUST | ❌ Race condition |
| FR-6.5 | Accepted quotes shall be convertible to invoices in one action | MUST | ✅ Done |
| FR-6.6 | Invoices shall be downloadable as PDF, branded with BridgeWork logo | MUST | ✅ Done |
| FR-6.7 | Tax rate on all quotes and invoices shall be sourced from `platform_settings` only | MUST | ❌ BUG-008 |

---

### FR-7: Notifications

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-7.1 | All major lifecycle events shall trigger branded email notifications via Resend API | MUST | ✅ Done |
| FR-7.2 | Email sender domain shall be a verified custom domain before production launch | MUST | ❌ Using resend.dev |
| FR-7.3 | The notification bell in the navbar shall display a live unread notification count | MUST | ❌ Bell not rendered |
| FR-7.4 | Clicking the notification bell shall open a panel listing recent unread notifications | MUST | ❌ Missing |
| FR-7.5 | Booking status changes shall trigger in-app + email notifications to the affected party | SHOULD | ❌ Missing |
| FR-7.6 | Missing email templates shall be created: booking cancellation, dispute opened, dispute resolved | MUST | ❌ Missing |
| FR-7.7 | Real-time message notifications shall display immediately via Socket.IO | MUST | ✅ Done |

---

### FR-8: Admin & SuperAdmin

| ID | Requirement | Priority | Current Status |
|----|-------------|----------|----------------|
| FR-8.1 | Admin dashboard shall display: total revenue, active bookings, pending pro applications, open disputes | MUST | ✅ Done |
| FR-8.2 | All admin-level actions (approve/reject pro, resolve dispute, change permissions) shall be written to an `audit_log` table | MUST | ❌ Missing |
| FR-8.3 | Dispute resolution shall support: full refund, partial refund, or ruling in pro's favour | MUST | ⚠️ Partial |
| FR-8.4 | Service image uploads shall validate MIME type server-side (not rely solely on multer) | MUST | ⚠️ Partial |
| FR-8.5 | Admin permissions JSON shall be validated before being stored | MUST | ❌ Missing |
| FR-8.6 | SuperAdmin shall be the only role capable of creating or deactivating other admins | MUST | ✅ Done |
| FR-8.7 | An admin shall not be able to deactivate their own account | MUST | ✅ Done |

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### NFR-1: Security

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-1.1 | Zero SQL injection vulnerabilities in production | 0 raw query interpolations | ❌ BUG-001 |
| NFR-1.2 | No debug or internal endpoints accessible without SuperAdmin auth | 0 exposed endpoints | ❌ BUG-002 |
| NFR-1.3 | All secret keys and config values stored in environment variables only | 0 hardcoded secrets | ❌ Partial |
| NFR-1.4 | No `console.log` / `console.error` outputting sensitive data in production builds | 0 leaking logs | ❌ 83 instances |
| NFR-1.5 | Rate limiting on all public auth endpoints (login, signup, password reset) | Max 10 req/min per IP | ❌ Missing |
| NFR-1.6 | Stripe webhook signature validation + replay attack prevention (300s window) | 100% events validated | ❌ Missing |
| NFR-1.7 | Socket.IO connections shall require a valid JWT before upgrading the connection | 0 unauthenticated sockets | ❌ Auth optional |
| NFR-1.8 | OWASP Top 10 checklist completed and signed off before launch | 100% coverage | ❌ Not started |
| NFR-1.9 | All file uploads validated by MIME type server-side (not client-reported Content-Type) | 100% server-validated | ⚠️ Partial |
| NFR-1.10 | Passwords must meet complexity requirements: 8+ chars, 1 uppercase, 1 number, 1 special character | Enforced on signup + change | ❌ Missing |

**Security positives already in place:**
- ✅ Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- ✅ CORS configured with explicit allowlist
- ✅ JWT with correct expiry (1d access, 7d refresh)
- ✅ Passwords hashed with bcryptjs
- ✅ Email enumeration protection on password reset
- ✅ Supabase Row-Level Security (RLS) policies on sensitive tables
- ✅ SuperAdmin / Admin separation
- ✅ Input validation via express-validator

---

### NFR-2: Performance

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-2.1 | Time to First Byte (TTFB) on server-rendered pages | < 200ms (p95) | ❌ Not measured |
| NFR-2.2 | Largest Contentful Paint (LCP) | < 2.5s on 4G mobile | ❌ Not measured |
| NFR-2.3 | Cumulative Layout Shift (CLS) | < 0.1 | ❌ Not measured |
| NFR-2.4 | API response time for all endpoints | < 300ms (p95) | ❌ Not measured |
| NFR-2.5 | Service search shall debounce at 300ms before API call | 0 keystroke-level API calls | ❌ Missing |
| NFR-2.6 | All paginated lists shall implement server-side cursor pagination | No unbounded queries | ❌ Partial |
| NFR-2.7 | All async operations shall show loading states / skeletons to the user | 100% coverage | ⚠️ Partial |
| NFR-2.8 | All frontend navigation shall use `router.push()` — zero `window.location.href` calls | 0 full-page reloads | ❌ Multiple instances |
| NFR-2.9 | Pro dashboard shall be refactored from 30+ useState hooks to a structured state management approach | Reduced re-render count | ❌ Architecture debt |

---

### NFR-3: Reliability & Uptime

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-3.1 | Platform uptime SLA | 99.9% | ⚠️ Not contractual yet |
| NFR-3.2 | All API calls shall surface user-facing error messages on failure (no silent console-only errors) | 100% error handling | ❌ Many silent fails |
| NFR-3.3 | Payment webhooks shall be idempotent — safe for Stripe to retry | 0 double-charges | ❌ BUG-005 |
| NFR-3.4 | Database operations that modify multiple tables shall use transactions | 100% critical paths | ✅ Done |
| NFR-3.5 | A runbook and rollback plan shall be documented before production deployment | Documented | ❌ Missing |
| NFR-3.6 | Error monitoring (e.g., Sentry) shall be integrated and alerting on p0 errors | < 5 min alert time | ❌ Missing |

---

### NFR-4: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | Backend shall be stateless and horizontally scalable | Support 2+ backend instances |
| NFR-4.2 | Socket.IO shall use Redis adapter for multi-instance real-time events | Required before scaling to 2+ instances |
| NFR-4.3 | Database connection pooling shall be configured via Supabase connection pooler (PgBouncer) | Max pool: 20 connections per instance |
| NFR-4.4 | System shall sustain 500 concurrent users without p95 latency exceeding 500ms | Validated by load test |
| NFR-4.5 | Cron jobs (`node-cron`) shall be guarded against concurrent execution on multi-instance deployments | Use distributed lock or move to queue |

---

### NFR-5: Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5.1 | All pages shall meet WCAG 2.1 Level AA compliance minimum | Validated by automated audit + manual review |
| NFR-5.2 | All form fields shall have associated `<label>` elements | 100% coverage |
| NFR-5.3 | All interactive elements shall be keyboard-navigable | 100% coverage |
| NFR-5.4 | All images shall have descriptive `alt` attributes | 100% coverage |
| NFR-5.5 | Colour contrast ratio shall meet 4.5:1 for normal text | Validated with contrast checker |

---

### NFR-6: Compliance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-6.1 | Privacy Policy and Terms of Service shall be linked from all auth pages | Present at launch |
| NFR-6.2 | A GDPR data export endpoint shall allow users to download all their data | Required if EU users onboarded |
| NFR-6.3 | A GDPR data deletion endpoint shall allow users to request account and data removal | Required if EU users onboarded |
| NFR-6.4 | All admin actions shall be written to an immutable `audit_log` table | 100% admin action coverage |
| NFR-6.5 | PCI-DSS compliance is delegated entirely to Stripe — no raw card data is stored or logged | Verified by removing all payment console.logs |

---

### NFR-7: Browser & Device Support

| Browser / Device | Minimum Version |
|------------------|----------------|
| Chrome | Last 2 major versions |
| Safari | Last 2 major versions (iOS 15+) |
| Firefox | Last 2 major versions |
| Edge | Last 2 major versions |
| Mobile Safari (iPhone) | iOS 15+ |
| Chrome for Android | Last 2 major versions |
| Internet Explorer | Not supported |

---

## 6. TECHNICAL ARCHITECTURE

### 6.1 Current Stack (Retained)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend Framework | Next.js App Router | 14.0.4 | Keep; mature, production-ready |
| UI Library | React | 18.2.0 | Keep |
| Styling | TailwindCSS | 3.3.0 | Keep |
| State Management | Redux Toolkit | 2.0.1 | Keep; refactor pro-dashboard |
| Forms | react-hook-form | 7.49.3 | Keep |
| Backend Framework | Express.js | 4.18.2 | Keep |
| Runtime | Node.js | 18+ LTS | Keep |
| Database | PostgreSQL via Supabase | — | Keep |
| Auth | Supabase Auth + Custom JWT | — | Keep |
| Real-time | Socket.IO | 4.6.0 | Add Redis adapter before scale-out |
| Payments | Stripe + Stripe Connect | v14.10.0 | Keep |
| Email | Resend API | 6.9.2 | Migrate to verified custom domain |
| File Storage | Supabase Storage | — | Keep |
| Geolocation | PostGIS ST_DWithin | — | Keep; fix SQL injection first |
| Logging | Winston + Morgan | 3.11.0 | Keep; add Sentry for error tracking |
| Scheduling | node-cron | 3.0.3 | Add distributed lock before scale |

### 6.2 Required Additions Before Launch

| Addition | Purpose | Priority |
|----------|---------|----------|
| **Sentry** | Error tracking and alerting | P0 |
| **Redis** | Socket.IO multi-instance adapter; distributed cron lock | P1 |
| **`platform_settings` DB table** | Centralized commission rate, tax rate, feature flags | P0 |
| **`audit_log` DB table** | Immutable admin action log | P1 |
| **`promo_code_usages` DB table** | Per-user promo code enforcement | P1 |
| **`stripe_webhook_events` DB table** | Idempotency store for Stripe events | P0 |
| **CI/CD Pipeline** | GitHub Actions → staging → production with automated tests | P0 |
| **Staging Environment** | Mirrors production; used for UAT | P0 |

### 6.3 High-Level Data Model (Entity Relationships)

```
profiles (users)
  ├── bookings (one homeowner → many bookings)
  │     ├── quotes (one booking → many quotes from pros)
  │     │     └── invoices (one accepted quote → one invoice)
  │     ├── transactions (one booking → one transaction)
  │     ├── messages (one booking → many messages)
  │     ├── reviews (one completed booking → one review)
  │     └── job_proofs (one booking → before/after photos)
  └── pro_profiles (one pro user → one pro profile)
        ├── pro_availability (weekly schedule)
        ├── pro_time_off (date ranges)
        └── pro_payouts (earnings history)

platform_settings (NEW — centralized config)
audit_log (NEW — admin action trail)
stripe_webhook_events (NEW — idempotency store)
promo_code_usages (NEW — per-user promo tracking)
```

### 6.4 Deployment Architecture (Recommended)

```
┌──────────────────────────────────────────────────────────────┐
│                    CDN (Vercel / Cloudflare)                  │
│              Static assets, edge caching, DDoS protection     │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│              Frontend — Next.js 14 (Vercel)                   │
│              App Router, SSR, SSG, Image Optimization         │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST + WebSocket
┌───────────────────────────▼──────────────────────────────────┐
│           Backend — Express.js (Railway / AWS ECS)            │
│           JWT Auth, 20 Controllers, Socket.IO + Redis         │
└──────┬─────────────────────┬──────────────────┬─────────────┘
       │                     │                  │
┌──────▼──────┐    ┌─────────▼──────┐  ┌───────▼──────┐
│  Supabase   │    │  Stripe API    │  │  Resend API   │
│  Postgres   │    │  + Connect     │  │  (Email)      │
│  + Storage  │    │  + Webhooks    │  └──────────────┘
│  + Auth     │    └───────────────┘
└──────┬──────┘              │           ┌──────────────┐
       │                     │           │  Redis       │
       │              ┌──────▼──────┐    │  Socket.IO   │
       │              │  Sentry     │    │  Adapter     │
       │              │  (Errors)   │    └──────────────┘
       │              └─────────────┘
       │
  PostGIS (geo)
  RLS Policies
```

### 6.5 CI/CD Pipeline

```
Developer pushes → GitHub PR
  → Automated: ESLint + TypeScript check + unit tests
  → PR review required (min 1 approver)
  → Merge to main → deploy to STAGING automatically
  → Staging smoke tests pass
  → Manual approval gate → deploy to PRODUCTION
  → Post-deploy: health check + Sentry error rate monitor
```

---

## 7. SUCCESS METRICS & ACCEPTANCE CRITERIA

### 7.1 Launch Readiness Checklist

**Security (all must be ✅ before launch)**
- [ ] BUG-001: SQL injection fixed and penetration tested
- [ ] BUG-002: `/debug/env-check` endpoint removed
- [ ] BUG-003: Stripe key env var required (no fallback)
- [ ] BUG-004: `changePassword()` verifies current password
- [ ] BUG-005: Webhook idempotency implemented
- [ ] All 83 `console.log` instances removed from production builds
- [ ] OWASP Top 10 checklist completed
- [ ] Rate limiting on all public auth endpoints
- [ ] Socket.IO requires valid JWT before connection upgrade

**Functionality (all must be ✅ before launch)**
- [ ] Pro can decline a quote request
- [ ] Rate-type selection modal fires correctly
- [ ] Notification bell renders with live unread count
- [ ] Commission rate and tax rate centralized in `platform_settings`
- [ ] All currency math uses integer cents
- [ ] All `window.location.href` replaced with `router.push()`
- [ ] Homepage content fetched from live API (no hardcoded test data)
- [ ] Future-date validation on booking scheduling

**Infrastructure (all must be ✅ before launch)**
- [ ] Staging environment deployed and smoke-tested
- [ ] CI/CD pipeline operational (lint → test → staging → production gate)
- [ ] Sentry error tracking integrated and alerting configured
- [ ] Custom email sender domain verified with Resend
- [ ] Runbook and rollback procedure documented
- [ ] Environment variables audited: no secrets in code

### 7.2 Per-Feature Definition of Done

A feature is **Done** when:
1. Backend endpoint(s) implemented, validated with express-validator, and returning correct HTTP status codes
2. Frontend UI integrated with API, loading states shown, and user-facing error messages displayed on failure
3. Unit tests cover the happy path and at least 2 edge cases
4. E2E test covers the primary user flow
5. No `console.log` statements in the code path
6. Accessibility: keyboard-navigable and WCAG 2.1 AA contrast compliant
7. Code reviewed and approved by at least 1 other engineer
8. Deployed to staging and manually verified

### 7.3 Monitoring & Alerting Requirements

| Signal | Tool | Alert Threshold |
|--------|------|----------------|
| Application errors | Sentry | >5 new errors/minute → page on-call |
| API p95 latency | Sentry / Datadog | >500ms sustained → alert |
| Payment failures | Stripe Dashboard + Webhook | Any webhook 5xx → immediate alert |
| Uptime | UptimeRobot / Better Uptime | Downtime > 1 min → page on-call |
| Database CPU | Supabase Dashboard | >80% CPU → alert |
| Stripe webhook delivery failures | Stripe Dashboard | Failed webhook delivery → alert |

---

---

# DELIVERABLE 2 — PHASED PROJECT PLAN

**Total Estimated Effort:** ~32 engineering weeks (2 senior full-stack engineers)
**Current System Completion:** 68% → Target: 100% production-ready

---

## PHASE 0 — Discovery & Environment Setup

**Objective:** Establish a solid engineering foundation. No feature code ships until this phase is complete.
**Duration:** 1 week
**Estimated Effort:** 8 dev-days

### Deliverables

- [ ] Monorepo structure confirmed and documented
- [ ] Development, Staging, and Production environments provisioned
- [ ] All environment variables audited and moved to secret manager
- [ ] CI/CD pipeline operational (GitHub Actions → staging → production gate)
- [ ] Sentry integrated in backend and frontend
- [ ] Redis instance provisioned (for Socket.IO scale-out and cron lock)
- [ ] `platform_settings` DB table created with `commission_rate` and `tax_rate` columns
- [ ] `audit_log` DB table created
- [ ] `stripe_webhook_events` DB table created (idempotency store)
- [ ] `promo_code_usages` DB table created
- [ ] Custom email sender domain verified with Resend API
- [ ] Team aligned on branching strategy, PR review process, and Definition of Done
- [ ] All 83 `console.log` / `console.error` instances removed from codebase (automated ESLint rule added)

### Technical Tasks

- Provision staging environment mirroring production (same Supabase project, separate schema)
- Set up GitHub Actions: lint (ESLint + TypeScript), unit tests, build check on every PR
- Configure deployment pipelines: merge to `main` → auto-deploy staging; tagged release → production with approval gate
- Add `no-console` ESLint rule and run `npm run lint --fix` across entire codebase
- Run DB migration for `platform_settings`, `audit_log`, `stripe_webhook_events`, `promo_code_usages`
- Populate `platform_settings` with `commission_rate: 0.13` and `tax_rate: [TO BE CONFIRMED]`
- Integrate Sentry DSN into Express error handler middleware and Next.js `_app`
- Provision Redis and configure connection in backend

### Definition of Done

- CI/CD pipeline runs green on `main`
- All 3 environments (dev / staging / prod) accessible and health-check passing
- Zero `console.log` instances in codebase (enforced by ESLint)
- All environment variables documented in a `ENV_VARS.md` (values in secret manager only)
- `platform_settings` table seeded with confirmed rates

### Dependencies & Blockers

⚠️ **OPEN QUESTION** — Stakeholder must confirm the correct tax rate before `platform_settings` is seeded.

🔴 **RISK** — If Redis provisioning is delayed, Socket.IO multi-instance support is blocked. Single-instance is acceptable for launch.

---

## PHASE 1 — Critical Security Hardening

**Objective:** Eliminate all P0 security vulnerabilities. Nothing launches with these open.
**Duration:** 1 week
**Estimated Effort:** 8 dev-days
**Dependency:** Phase 0 complete

### Deliverables

- [ ] BUG-001: SQL injection fixed in `prosController.js:39`
- [ ] BUG-002: `/debug/env-check` endpoint removed from `server.js`
- [ ] BUG-003: Stripe publishable key requires env var — no fallback allowed
- [ ] BUG-004: `changePassword()` verifies current password before accepting change
- [ ] BUG-005: Stripe webhook idempotency implemented using `stripe_webhook_events` table
- [ ] Webhook replay attack prevention: reject events older than 300 seconds
- [ ] Socket.IO authentication made mandatory (non-optional)
- [ ] Rate limiting applied to: `/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`
- [ ] Password complexity requirements enforced on signup and change-password
- [ ] Account lockout after 5 failed login attempts (15-minute cooldown)
- [ ] MIME type server-side validation on all file upload endpoints
- [ ] Admin permissions JSON validated with schema before storage
- [ ] Hardcoded localhost URL in `authController.js:357` replaced with env var

### Technical Tasks

```
prosController.js:39
  BEFORE: query += ` AND '${service_category}' = ANY(pp.service_categories)`
  AFTER:  Use parameterized query with $1 placeholder and whitelist validation

server.js:145–217
  DELETE the entire /debug/env-check route block

checkout/[bookingId]/page.js:26
  BEFORE: process.env.NEXT_PUBLIC_STRIPE_KEY || 'pk_test_placeholder'
  AFTER:  if (!process.env.NEXT_PUBLIC_STRIPE_KEY) throw new Error('Missing Stripe key')

authController.js:322–325
  ADD: const isValid = await bcrypt.compare(currentPassword, user.password_hash)
       if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' })

paymentController.js:210–345
  ADD: Check stripe_webhook_events table for event.id before processing
       INSERT event.id on first process; skip with 200 if already exists
       Validate: Math.floor(Date.now() / 1000) - event.created < 300

server.js:265
  CHANGE: socket auth from optional to required — reject connections without valid JWT
```

### Definition of Done

- All P0 bugs resolved and verified with targeted tests
- Penetration test checklist (manual) completed for: SQLi, auth bypass, webhook replay, debug endpoint
- OWASP Top 10 checklist reviewed and signed off
- Zero hardcoded secrets detectable by `git grep` across entire repo history

### Dependencies & Blockers

🔴 **RISK** — Webhook idempotency requires the `stripe_webhook_events` table from Phase 0. Phase 0 must be fully complete before this phase begins.

---

## PHASE 2 — Core Feature Completion

**Objective:** Fix all broken P1 features. Bring system from 68% to ~85% functional completion.
**Duration:** 2 weeks
**Estimated Effort:** 14 dev-days
**Dependency:** Phase 1 complete

### Deliverables

- [ ] BUG-006: Pro decline-quote feature fully implemented (backend + frontend)
- [ ] BUG-007: Rate-type selection modal fixed and reachable in `/services`
- [ ] Notification bell rendered in `Navbar.js` with live unread count badge
- [ ] Notification panel (dropdown) lists recent unread notifications
- [ ] Real-time booking status updates pushed via Socket.IO
- [ ] All `window.location.href` replaced with `router.push()` across all frontend pages
- [ ] Commission rate and tax rate read from `platform_settings` in all 3 controllers
- [ ] All currency arithmetic converted to integer cents
- [ ] Booking cancellation confirmation dialog implemented
- [ ] Scheduled datetime validated server-side as future date
- [ ] Booking number generation switched to `crypto.randomBytes()`
- [ ] Homepage pro showcase and testimonials fetched from live API
- [ ] Service categories in pro dashboard fetched from API
- [ ] Missing email templates added: booking cancellation, dispute opened, dispute resolved

### Technical Tasks

**Pro Decline Quote (BUG-006):**
- Add `declineQuoteRequest(bookingId, reason)` function to `pro-dashboard/page.js` (line 1133)
- Add `PATCH /api/bookings/:id/decline` endpoint to `bookingController.js`
- Validate: booking must be in `pending` status; pro must be assigned to this booking
- On decline: update booking status to `declined`, notify homeowner by email, notify admin

**Rate-Type Modal (BUG-007):**
- Trace modal trigger condition in `services/page.js:230–367`
- Fix `modalSelection` state so it is set to `true` when user clicks "Book" on a multi-rate service
- Verify modal renders and selected rate type is passed to booking request payload

**Notification Bell:**
- Render `<NotificationBell />` component in `Navbar.js` (already imported, never used)
- Connect to `GET /api/notifications?unread=true` to fetch unread count on mount
- Subscribe to Socket.IO `notification:new` event to increment count in real-time
- Dropdown panel: list 10 most recent notifications with type, message, timestamp, mark-as-read

**Centralize Rates:**
- Add `getConfig()` helper that reads from `platform_settings` table (cached 60s)
- Replace hardcoded `0.13` in `paymentController.js:6`, `prosController.js:532`, `payoutsController.js:4`
- Replace hardcoded `0.08` in `quotesController.js:90` with `getConfig().tax_rate`

**Integer Cents:**
- Audit all currency math in `quotesController.js:26–32`
- Multiply dollar amounts by 100 on input; divide by 100 only on display
- All Stripe amounts already use cents — ensure consistency throughout

### Definition of Done

- All items in the deliverables list manually verified on staging
- Pro can accept AND decline quote requests
- Rate-type modal opens and correct rate is submitted to booking
- Notification bell shows live count and dropdown works
- Homepage shows real API data (no hardcoded names or testimonials)
- All navigation uses `router.push()` — confirmed by `grep -r "window.location.href"` returning 0 results
- All rate calculations use `platform_settings` values — confirmed by `grep -r "0\.13\|0\.08"` returning 0 results in controller files

---

## PHASE 3 — Full Feature Build-Out

**Objective:** Implement all remaining P1 features and complete partial implementations.
**Duration:** 3 weeks
**Estimated Effort:** 21 dev-days
**Dependency:** Phase 2 complete

### Deliverables

- [ ] Dispute resolution workflow — complete end-to-end (homeowner opens → admin reviews → resolves with refund/ruling)
- [ ] Pro availability scheduling — frontend fully connected to backend
- [ ] Promo code system — per-user and total usage limits enforced via `promo_code_usages` table
- [ ] Job proof photos — download button added for homeowner and admin
- [ ] Payment hold expiration handling — cron job auto-captures or cancels holds approaching 7-day limit
- [ ] Pro portfolio gallery — upload and display fully functional
- [ ] Admin audit logging — all admin actions written to `audit_log`
- [ ] GDPR data export endpoint — `GET /api/users/export` returns all user data as JSON
- [ ] GDPR data deletion endpoint — `DELETE /api/users/me` anonymizes/deletes user data
- [ ] Search debounce (300ms) implemented on `/services` page
- [ ] Password strength indicator on signup page
- [ ] Pro onboarding step validation — cannot skip steps with empty required fields
- [ ] Insurance document date validation on pro onboarding
- [ ] `changePassword()` verified old password fix applied and tested
- [ ] Rating validation: `createReview()` enforces rating between 1–5
- [ ] Review character limit enforced (max 1000 characters)
- [ ] Unique review constraint: one review per completed booking per user
- [ ] Payout history pagination (remove hardcoded `limit(100)`)
- [ ] Failed payment retry: notify user and provide retry UI

### Technical Tasks

**Dispute Resolution:**
- `POST /api/payments/dispute` → creates dispute record, notifies admin
- Admin: `GET /api/admin/disputes` → lists open disputes with messages
- Admin: `POST /api/admin/disputes/:id/resolve` → `action: full_refund | partial_refund | close_pro_favour`
- Full refund: Stripe `refunds.create()` for full amount
- Partial refund: Stripe `refunds.create({ amount: partialCents })`
- Close in pro's favour: release escrow to pro via Stripe capture
- Send resolution email to both homeowner and pro

**Payment Hold Expiration (cron):**
- Add `node-cron` job running daily at 2 AM
- Query `transactions` where `status = 'held'` and `created_at < NOW() - INTERVAL '6 days'`
- For each: if booking `status = 'completed'` → capture; else → cancel hold and notify both parties
- Guard with Redis distributed lock to prevent duplicate execution on multi-instance

**Admin Audit Log:**
- All admin controller functions call `auditLog(adminId, action, targetId, details)` before returning
- `audit_log` table: `id, admin_id, action, target_type, target_id, details (JSONB), created_at`
- Admin UI: `GET /api/admin/audit-log` with filters by admin, action type, date range

### Definition of Done

- Dispute flow tested end-to-end on staging (open → admin resolves → both parties emailed)
- Cron job tested with a synthetic held transaction approaching expiry
- GDPR export returns all user data in structured JSON
- GDPR delete anonymizes PII fields and returns 200
- `audit_log` table populated on all tested admin actions
- No unbounded queries in payout history (confirmed via EXPLAIN ANALYZE)

### Dependencies & Blockers

🔴 **RISK** — GDPR endpoints may not be required at launch if platform is US-only. Confirm with stakeholder.

⚠️ **OPEN QUESTION** — Partial refund amount for disputes: fixed formula or admin-entered freeform? UX design needed.

---

## PHASE 4 — QA, Hardening & Performance

**Objective:** Validate correctness, security, performance, and accessibility across the entire system.
**Duration:** 2 weeks
**Estimated Effort:** 14 dev-days
**Dependency:** Phase 3 complete

### Deliverables

- [ ] Unit test coverage: ≥80% on all backend controllers
- [ ] Integration tests: all API endpoints covered with happy path + 2 edge cases
- [ ] E2E tests (Playwright or Cypress): 5 critical user flows automated
  - Homeowner signup → book service → pay → review pro
  - Pro onboarding → receive job → submit quote → receive payment
  - Admin approve pro → assign job → resolve dispute
  - Password reset full flow
  - Stripe payment + webhook delivery
- [ ] Load test: 500 concurrent users, p95 latency < 500ms (k6 or Artillery)
- [ ] Security audit: OWASP Top 10 checklist completed and signed off
- [ ] Accessibility audit: WCAG 2.1 AA validated (axe-core automated + manual keyboard test)
- [ ] Cross-browser QA: Chrome, Safari, Firefox, Edge — desktop + mobile
- [ ] Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID/INP < 200ms
- [ ] All remaining P2 bugs triaged: fix or accept as post-launch backlog
- [ ] Pro dashboard refactored from 30+ `useState` hooks to Redux slice or `useReducer`
- [ ] Image optimization: all `via.placeholder.com` replaced with real assets or Next.js Image component
- [ ] SVG rendering bug fixed in `signup/page.js:142`

### Technical Tasks

**E2E Test Setup (Playwright):**
```
tests/
  auth.spec.ts        → signup, login, logout, password reset
  booking.spec.ts     → create request, accept quote, pay, review
  pro.spec.ts         → onboard, receive job, submit invoice
  admin.spec.ts       → approve pro, resolve dispute
  payment.spec.ts     → checkout, webhook delivery simulation
```

**Load Test (k6):**
```javascript
// Target: 500 VUs, 10 min sustained
export const options = { vus: 500, duration: '10m' };
// Scenarios: browse services, create booking, send message
// Pass criteria: p95 < 500ms, error rate < 0.5%
```

**Core Web Vitals:**
- Run `next build && next start` in production mode
- Use Lighthouse CI in GitHub Actions to enforce LCP < 2.5s on key pages
- Fix: lazy-load below-fold images, defer non-critical JS, add `<Suspense>` boundaries

### Definition of Done

- All E2E tests passing on staging CI
- Load test report: p95 < 500ms, 0 payment errors under load
- Lighthouse scores: Performance ≥85, Accessibility ≥90 on key pages
- OWASP checklist signed off by a second engineer
- Zero WCAG 2.1 AA violations reported by axe-core on all pages
- Cross-browser QA sign-off documented

---

## PHASE 5 — Staging Validation & Pre-Launch

**Objective:** Full UAT sign-off. Production environment ready. Rollback plan documented.
**Duration:** 1 week
**Estimated Effort:** 5 dev-days
**Dependency:** Phase 4 complete and all blocking issues resolved

### Deliverables

- [ ] UAT session with stakeholders: all P0 + P1 features manually verified
- [ ] Staging environment running production build with production Stripe keys (test mode)
- [ ] All P0 bugs confirmed resolved on staging
- [ ] Launch readiness checklist (Section 7.1) fully checked off
- [ ] Production environment fully provisioned (DNS, SSL, env vars, DB migrations)
- [ ] Runbook documented: deployment steps, health check URLs, rollback procedure
- [ ] Rollback plan: previous Docker image tagged and ready; DB migration rollback scripts prepared
- [ ] On-call rotation defined (who is paged for P0 alerts at launch)
- [ ] Stripe webhooks configured to point to production URL
- [ ] Resend API custom domain DNS verified and email sending confirmed
- [ ] Final data migration (if any test/seed data needs to be cleared from production DB)
- [ ] Smoke test suite run against production environment (read-only operations only)

### Definition of Done

- Stakeholder UAT sign-off received in writing
- Launch readiness checklist: 100% checked
- Runbook reviewed by at least 2 engineers
- Production smoke tests passing
- On-call rotation confirmed and paging configured in Sentry / PagerDuty

---

## PHASE 6 — Production Launch & Post-Launch

**Objective:** Zero-downtime launch. 30-day stability window with active monitoring.
**Duration:** Ongoing (30-day active post-launch period)
**Estimated Effort:** 5 dev-days (launch week) + ongoing monitoring

### Launch Day Sequence

```
T-24h:  Final staging smoke test pass
T-12h:  Production env vars confirmed, Stripe webhooks pointing to prod
T-4h:   Team on standby, Sentry alerts active
T-0:    Deploy backend → health check passes → deploy frontend
T+15m:  Smoke test on production (signup, browse, checkout test mode)
T+1h:   Monitor Sentry error rate, Stripe dashboard, Supabase query performance
T+24h:  First post-launch retrospective
```

### Deliverables

- [ ] Zero-downtime deployment via rolling update
- [ ] Feature flags enabled for gradual rollout of high-risk features (e.g., promo codes)
- [ ] Real-user monitoring (RUM) active: track Core Web Vitals in production
- [ ] 30-day post-launch stability checklist:
  - Week 1: Daily error rate review, Stripe webhook success rate check
  - Week 2: First load test re-run against production (off-peak)
  - Week 3: First GDPR request test (if applicable)
  - Week 4: Post-launch retrospective, prioritize Month 2 backlog

### Post-Launch P2 Backlog (Month 2+)

| Feature | Description |
|---------|-------------|
| 2FA / MFA for admins | TOTP-based 2FA via Authenticator app |
| Social login (Google OAuth) | OAuth 2.0 for homeowner signup/login |
| PWA push notifications | Wire service worker to notification system |
| Weekly pro digest email | Cron job: weekly job summary email to active pros |
| Service area map | Visual map of pro's service radius |
| Failed payment auto-retry | Stripe retry logic with user notification |
| Rating breakdown chart | Visual star distribution on pro profiles |
| "Remember Me" extended session | 30-day refresh token |

---

## RISK REGISTER

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | SQL injection (BUG-001) exploited before fix is deployed | HIGH | 🔴 CRITICAL — Full DB compromise | Fix in Phase 1 Sprint 1 before any public access. Do not expose staging URL publicly. |
| 2 | Stripe double-charge due to webhook non-idempotency (BUG-005) | MEDIUM | 🔴 CRITICAL — Financial & legal liability | Implement idempotency in Phase 1. Test with Stripe CLI event replay. |
| 3 | Tax rate inconsistency causes incorrect invoice totals sent to customers | HIGH | 🟠 HIGH — Revenue errors, customer disputes | Centralize in `platform_settings` in Phase 0. Confirm correct rate with stakeholder before seeding. |
| 4 | Payment hold expires (7-day Stripe limit) before job is completed | MEDIUM | 🟠 HIGH — Payment lost, pro not paid | Implement expiration cron in Phase 3. Alert admin at Day 5. |
| 5 | Pro dashboard 30+ useState hooks cause silent state bugs under real load | MEDIUM | 🟠 HIGH — Data loss, incorrect UI state | Refactor to Redux slice in Phase 4. Add Sentry breadcrumbs for state transitions. |
| 6 | Scope creep from stakeholder UAT adds new features to Phase 5 | HIGH | 🟠 HIGH — Delays launch | Enforce feature freeze after Phase 3 completes. New requests go to Month 2 backlog. |
| 7 | Socket.IO does not scale to 500+ concurrent users on single instance | MEDIUM | 🟠 HIGH — Real-time features fail under load | Redis adapter provisioned in Phase 0. Load tested in Phase 4. |
| 8 | Supabase free tier connection limits hit at launch load | LOW | 🟠 HIGH — DB connection errors | Enable PgBouncer connection pooling. Monitor in Supabase dashboard. Upgrade plan if needed. |
| 9 | Resend custom domain verification takes longer than expected | MEDIUM | ⚠️ MEDIUM — Emails delivered from resend.dev domain, spam risk | Start DNS verification in Phase 0. Buffer 5 business days. |
| 10 | GDPR compliance required sooner than expected (EU users onboard) | LOW | ⚠️ MEDIUM — Legal exposure | GDPR endpoints built in Phase 3 regardless. Monitor user geography from day 1. |

---

## APPENDIX A — Bug Registry Summary

### P0 — Production Blockers

| ID | File | Issue |
|----|------|-------|
| BUG-001 | `prosController.js:39` | SQL injection via `service_category` param |
| BUG-002 | `server.js:145–217` | Unauthenticated `/debug/env-check` endpoint |
| BUG-003 | `checkout/[bookingId]/page.js:26` | Stripe key hardcoded fallback `pk_test_placeholder` |
| BUG-004 | `authController.js:322–325` | `changePassword()` does not verify current password |
| BUG-005 | `paymentController.js:210–345` | Webhook handlers have no idempotency |

### P1 — High Priority

| ID | File | Issue |
|----|------|-------|
| BUG-006 | `pro-dashboard/page.js:1133` | Pro decline quote — explicit TODO, never built |
| BUG-007 | `services/page.js:230–367` | Rate-type modal trigger never fires |
| BUG-008 | `quotesController.js:90` | Tax rate 8% inconsistent with 13% elsewhere |
| BUG-009 | `login/page.js:25,30,37,40,42` | 5x console.log in auth flow — token exposure |
| BUG-010 | `bookingController.js:268` | Booking number uses `Math.random()` |

### P2 — Medium Priority

| ID | File | Issue |
|----|------|-------|
| BUG-011 | `page.js (Home)` | Hardcoded test data for pros and testimonials |
| BUG-012 | `pro-dashboard/page.js` | Service categories hardcoded |
| BUG-013 | `quotesController.js:26–32` | Floating-point currency math |
| BUG-014 | `authController.js:357` | Hardcoded `http://localhost:3000` in emails |
| BUG-015 | `signup/page.js:142` | Invalid SVG text element |
| BUG-016 | Multiple frontend files | `window.location.href` instead of `router.push()` |
| BUG-017 | `pro-onboarding/page.js:120–121` | `console.error` may expose Stripe/Supabase errors |
| BUG-018 | `checkout/[bookingId]/page.js` | `console.log` in payment flow |
| BUG-019 | `my-jobs/page.js:97` | `console.log` in error handler |
| BUG-020 | `reviewsController.js:42` | No rating range validation (1–5) |

---

## APPENDIX B — Completion Projection

| Layer | At Audit | Target (Post-Phase 3) | Target (Launch) |
|-------|---------|----------------------|----------------|
| Database Schema | 85% | 95% | 100% |
| Backend API | 75% | 90% | 100% |
| Frontend UI | 65% | 85% | 100% |
| Security Hardening | 50% | 90% | 100% |
| Email Notifications | 90% | 95% | 100% |
| Payment Integration | 73% | 90% | 100% |
| Real-time Features | 80% | 90% | 95% |
| Admin Tools | 78% | 90% | 100% |
| Test Coverage | ~10% | 60% | 80% |
| **OVERALL** | **68%** | **90%** | **100%** |

---

*Document Version: 2.0 — Production Rewrite*
*Source Audit: 2026-03-26 | PRD Issued: 2026-03-27*
*Next review: After Phase 1 critical fixes are applied and verified.*
*Owner: Engineering Lead — BridgeWork*
