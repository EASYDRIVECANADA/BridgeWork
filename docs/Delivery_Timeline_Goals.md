# BridgeWork — Delivery Timeline & Completion Goals

**Project:** BridgeWork (Home Services Platform)
**Prepared:** February 13, 2026
**Last Revised:** February 22, 2026
**Developer:** EDC Development Team
**Client:** Syed

---

## 1. Current Build Status — What's Done

### Overall Progress: ~85% of Full Product

| Area | Status | Completion |
|------|--------|------------|
| Frontend UI/UX (28 pages) | ✅ Complete | 100% |
| Backend API (8 modules) | ✅ Complete | 100% |
| Authentication (Supabase) | ✅ Complete | 100% |
| Database Schema (15 tables) | ✅ Complete | 100% |
| Real-time Messaging + Image Upload | ✅ Complete | 100% |
| Booking Flow (create, view, status) | ✅ Complete | 100% |
| Pro Registration & Job Acceptance | ✅ Complete | 100% |
| Payment Processing (Stripe Checkout) | ✅ Complete | 100% |
| Stripe Connect (Pro Payouts & Revenue Split) | ✅ Complete | 100% |
| Transaction History | ✅ Complete | 100% |
| Admin Revenue Dashboard | ✅ Complete | 100% |
| Refund Handling | ✅ Complete | 100% |
| Push Notifications | 🔲 Not Started | 0% |
| Email Notifications (Signup Confirm + Password Reset) | ✅ Complete | 100% |
| Review & Rating System (UI wired, backend ready) | 🟡 Partial | 60% |
| Production Deployment (Netlify + Render + Supabase) | ✅ Complete | 100% |

---

## 2. What's Left to Build — Remaining Functionalities

### Phase 2A: Payment & Transactions (HIGH PRIORITY) ✅ COMPLETE
| # | Feature | Description | Est. Days | Status |
|---|---------|-------------|-----------|--------|
| 1 | Stripe Integration | Connect Stripe API, test keys configured | 2 | ✅ Done |
| 2 | Payment Intent Flow | Create payment intent on booking, checkout page | 1 | ✅ Done |
| 3 | Checkout UI | Stripe Elements card form, order summary, trust badges | 1 | ✅ Done |
| 4 | Payment Success Page | Post-payment confirmation with booking details | 0.5 | ✅ Done |
| 5 | Transaction History | User transaction history page with pagination | 1 | ✅ Done |
| 6 | Promo Code Redemption | Apply promo codes at checkout (end-to-end wired) | 0.5 | ✅ Done |
| 7 | Dashboard Payment Status | Payment badges + Pay Now buttons on booking cards | 0.5 | ✅ Done |
| **Subtotal** | | | **6.5 days** | **100%** |

### Phase 2B: Stripe Connect — Pro Payouts & Revenue Split (HIGH PRIORITY) ✅ COMPLETE
| # | Feature | Description | Est. Days | Status |
|---|---------|-------------|-----------|--------|
| 1 | Pro Stripe Onboarding | Express account creation + onboarding link in pro dashboard | 2 | ✅ Done |
| 2 | `stripe_account_id` | Already exists on `pro_profiles` table, wired to Connect flow | 0.5 | ✅ Done |
| 3 | Payment Splitting | `application_fee_amount` + `transfer_data` on payment intents | 1 | ✅ Done |
| 4 | Platform Commission Config | Configurable via `PLATFORM_COMMISSION_RATE` env var (default 15%) | 0.5 | ✅ Done |
| 5 | Pro Earnings Dashboard | Real earnings data, Stripe dashboard link, transaction history | 2 | ✅ Done |
| 6 | Admin Revenue Dashboard | Full revenue overview, fee breakdown, refund modal | 2 | ✅ Done |
| 7 | Refund Handling | Admin can process Stripe refunds, updates booking + notifications | 1.5 | ✅ Done |
| 8 | Testing & QA | End-to-end test with Stripe Connect test accounts | 1 | 🔲 Pending |
| **Subtotal** | | | **10.5 days** | **~95%** |

> **Revenue Model:** 15% platform commission per booking. See `docs/Payment_Revenue_Breakdown.md` for detailed scenario-based calculations, fee structures, and monthly revenue projections.

### Phase 3: Notifications & Communication (MEDIUM PRIORITY)
| # | Feature | Description | Est. Days |
|---|---------|-------------|-----------|
| 1 | Email Notifications | Booking confirmation, status updates, reminders (SendGrid/Resend) | 2 |
| 2 | Push Notifications | Browser push for new messages, job alerts, booking updates | 2 |
| 3 | In-App Notification Center | Bell icon with notification dropdown (DB table exists) | 1 |
| **Subtotal** | | | **5 days** |

### Phase 4: Advanced Features (MEDIUM PRIORITY)
| # | Feature | Description | Est. Days |
|---|---------|-------------|-----------|
| 1 | Review & Rating UI | Post-job review form, star ratings, pro response | 1 |
| 2 | Pro Availability Calendar | Set weekly schedule, time-off management | 1.5 |
| 3 | Saved Addresses | Manage multiple addresses (DB table exists) | 0.5 |
| 4 | Favorites | Save favorite pros (DB table exists) | 0.5 |
| **Subtotal** | | | **3.5 days** |

### Phase 5: Admin & Operations (LOWER PRIORITY)
| # | Feature | Description | Est. Days |
|---|---------|-------------|-----------|
| 1 | Admin Dashboard | User management, booking oversight, analytics | 3 |
| 2 | Pro Application Review | Admin approves/rejects pro applications | 1 |
| 3 | Support Ticket System | User submits tickets, admin manages (DB table exists) | 1.5 |
| 4 | Content Management | Service/category CRUD from admin panel | 1 |
| **Subtotal** | | | **6.5 days** |

### Phase 6: Polish & Launch Prep (REQUIRED)
| # | Feature | Description | Est. Days |
|---|---------|-------------|-----------|
| 1 | Production Deployment | Final deploy to Render + Netlify with env vars | 0.5 |
| 2 | SEO & Meta Tags | Open Graph, Twitter cards, page titles | 0.5 |
| 3 | Error Handling & Loading States | Consistent error boundaries, skeleton loaders | 1 |
| 4 | Mobile Responsiveness Audit | Test all 26 pages on mobile/tablet | 1 |
| 5 | Performance Optimization | Image optimization, lazy loading, bundle size | 1 |
| 6 | Security Audit | Input sanitization, rate limiting, CORS hardening | 1 |
| 7 | Google Maps / Geolocation | Address autocomplete, pro proximity search, map view (nice-to-have) | 2 |
| **Subtotal** | | | **7 days** |

---

## 3. Delivery Timeline

### Timeline Option A: MVP Launch (Marketing-Ready)
**Target: February 27, 2026** *(restored to original date per client request)*

Focus on what's needed for marketing and early user testing:

| Week | Dates | Deliverables | Status |
|------|-------|-------------|--------|
| **Week 1** | Feb 14–20 | Stripe payment integration, email notifications, production deployment | ✅ Done |
| **Week 2** | Feb 22–27 | Review & rating system, Stripe live testing, QA, MVP launch | � In Progress |

**MVP Includes:**
- ✅ All 26 pages (done)
- ✅ Auth, booking, messaging (done)
- 🆕 Payment processing (Stripe)
- 🆕 Email notifications (booking confirmations)
- 🆕 Review & rating system
- 🆕 Production deployment (live URL)

**MVP Excludes (deferred to post-launch):**
- Admin dashboard
- Push notifications
- Pro availability calendar
- Support ticket system

---

### Timeline Option B: Full Product Launch
**Target: March 13, 2026** *(restored to original date)*

| Week | Dates | Deliverables | Status |
|------|-------|-------------|--------|
| **Week 1** | Feb 14–20 | Stripe payment + email notifications + production deploy | ✅ Done |
| **Week 2** | Feb 22–27 | Review system, Stripe live testing, QA, **MVP launch** | � In Progress |
| **Week 3** | Feb 28–Mar 6 | Admin dashboard, push notifications, pro availability | 🔲 Pending |
| **Week 4** | Mar 7–13 | Polish, security audit, mobile audit, performance, **full launch** | 🔲 Pending |

**Full Product Includes:** Everything in MVP + admin panel, push notifications, pro scheduling, support system, full polish.

---

### Week 2 Build Plan: Review & Rating System (Feb 22–27)

**Current Status:** Backend 100% done, Frontend 60% done (UI exists with mock data)

#### What's Already Built
| Component | Layer | Status |
|-----------|-------|--------|
| `reviews` DB table (with rating trigger) | Database | ✅ Done |
| `reviewsController.js` — create, getByProId, respondToReview | Backend | ✅ Done |
| `reviews.js` routes — POST, GET, respond | Backend | ✅ Done |
| `reviewsAPI` — create, getByProId, respond | Frontend API | ✅ Done |
| Pro profile page — review display UI | Frontend | 🟡 Mock data |
| DB trigger — auto-updates pro `rating` + `total_reviews` on new review | Database | ✅ Done |

#### What Needs to Be Built

| # | Task | Description | Est. Hours | Target Date |
|---|------|-------------|-----------|-------------|
| 1 | **Review Form Component** | Star rating selector, comment textarea, image upload. Shown on completed bookings. | 3h | Feb 22 |
| 2 | **"Leave a Review" trigger** | Add review button/prompt on completed booking cards in user dashboard | 2h | Feb 22 |
| 3 | **Wire Pro Profile to Real API** | Replace mock data in `pro-profile/[id]/page.js` with real `prosAPI` + `reviewsAPI` calls | 3h | Feb 23 |
| 4 | **Pro Response UI** | Add "Respond to Review" form in pro dashboard for each review received | 2h | Feb 23 |
| 5 | **Review display on booking detail** | Show review (if exists) on booking detail page | 1h | Feb 24 |
| 6 | **Stripe Live Mode Testing** | Switch to live Stripe keys, test real payment with real card, verify capture/refund | 3h | Feb 25 |
| 7 | **QA & Bug Fixes** | End-to-end testing of full user journey: signup → book → pay → complete → review | 4h | Feb 26 |
| 8 | **Production Deploy & Verify** | Final deploy to Netlify + Render, smoke test all features | 2h | Feb 27 |

#### Step-by-Step Implementation Plan

**Day 1 (Feb 22) — Review Form + Trigger**
1. Create `ReviewForm` component with:
   - 5-star interactive rating selector
   - Comment textarea (optional)
   - Image upload (optional, reuse existing upload logic)
   - Submit button → calls `reviewsAPI.create()`
2. Add "Leave a Review" button on completed booking cards in user dashboard
3. Create review submission modal/page that opens from the booking card
4. Test: create a review → verify it appears in DB → verify pro rating auto-updates

**Day 2 (Feb 23) — Pro Profile + Pro Response**
1. Replace all mock data in `pro-profile/[id]/page.js` with real API calls:
   - Fetch pro profile via `prosAPI.getById(id)`
   - Fetch reviews via `reviewsAPI.getByProId(proId)`
   - Display real rating distribution, real review list
2. Add "Respond to Review" form in pro dashboard:
   - List all reviews for the pro
   - Text input for response → calls `reviewsAPI.respond(id, { response })`
   - Show existing responses inline

**Day 3 (Feb 24) — Polish + Integration**
1. Show review on booking detail page (if review exists for that booking)
2. Add review count badges on pro cards in search results
3. Handle edge cases: no reviews yet, loading states, error states
4. Test full flow: user completes booking → leaves review → pro responds

**Day 4 (Feb 25) — Stripe Live Mode**
1. Create Stripe live mode keys (from Stripe dashboard)
2. Update Render env vars with live `STRIPE_SECRET_KEY`
3. Update Netlify env vars with live `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Test real payment with a real credit card ($1 test charge)
5. Verify: payment captured → pro payout → refund works
6. Redeploy both frontend and backend

**Day 5 (Feb 26) — QA & Bug Fixes**
1. Full end-to-end test of user journey on production:
   - Sign up → confirm email → log in
   - Browse services → book a service
   - Pay via Stripe → verify payment success
   - Pro accepts job → completes job
   - User leaves review → pro responds
2. Fix any bugs found during testing
3. Mobile responsiveness check on key pages

**Day 6 (Feb 27) — MVP Launch**
1. Final production deploy
2. Smoke test all critical paths
3. Share live URL with client
4. MVP officially launched 🚀

---

## 4. Recommended Path for Marketing

For **marketing preparation**, I recommend **Timeline Option A (MVP Launch by Feb 27)**. This gives you:

1. **A live, working URL** to share with potential users and investors
2. **Core user journey complete** — browse → book → pay → message → review
3. **Professional appearance** — all 26 pages with consistent branding
4. **Real functionality** — not a prototype, actual working features

### What Marketing Can Start Preparing Now:
- **Screenshots** of all major pages (homepage, services, dashboard, messaging)
- **Demo video** (script provided separately)
- **Feature list** for marketing materials
- **Live URL** will be available after deployment (within 1–2 days)

---

## 5. Additional Notes & Things to Be Aware Of

### Technical Considerations
1. **Supabase Free Tier Limits** — Currently on free tier. For production with real users, upgrade to Pro plan ($25/mo) for:
   - 8GB database storage (vs 500MB free)
   - 250GB bandwidth (vs 2GB free)
   - 100GB file storage (vs 1GB free)
   - No pausing after 1 week of inactivity

2. **Render Free Tier** — Backend on free tier spins down after 15 min of inactivity. First request after sleep takes ~30 seconds. For production:
   - Upgrade to Starter plan ($7/mo) for always-on
   - Or use a health check ping service

3. **Stripe Setup Required** — Free to create, pay-per-transaction only. Need a Stripe account with:
   - API keys (publishable + secret)
   - Stripe Connect setup for pro payouts
   - Webhook endpoint configured
   - Test mode for development (free, fake cards), live mode for production
   - **Stripe Fees:**
     - Per transaction: **2.9% + $0.30 CAD** per successful charge
     - Stripe Connect (pro payouts): additional **0.25% + $0.25** per payout
     - Disputes/chargebacks: **$15 CAD** per dispute (rare, <1% of transactions)
   - **What is a chargeback?** When a customer contacts their bank to reverse a payment (e.g., "I didn't authorize this" or "service not received"). The bank pulls the money back and Stripe charges a $15 fee regardless of outcome.
   - **Example transaction breakdown:**
     - Customer pays **$100** → Stripe takes $3.20 → Platform receives **$96.80**
     - Platform takes 15% commission ($15) → Pro receives $85 minus Connect fee ($0.46) = **$84.54**
     - **Platform net profit: ~$15 per $100 job** (commission % is configurable)

4. **Domain Name** — Currently using Netlify subdomain (e.g., `bridgework-app.netlify.app`). A custom domain is essential for branding and credibility.
   - Purchase from a domain registrar, then point DNS to your hosting provider
   - SSL certificate is automatic on all hosting providers listed below
   - **Recommended domains for BridgeWork:**
     | Domain | Est. Price | Notes |
     |--------|-----------|-------|
     | `bridgework.ca` | ~$12–15/yr | Best for Canadian market |
     | `bridgework.com` | ~$10–12/yr | Best for global reach (check availability) |
     | `bridgeworkservices.com` | ~$10–12/yr | Fallback if `.com` is taken |
     | `getbridgework.com` | ~$10–12/yr | Marketing-friendly alternative |
   - **Domain registrar pricing (annual):**
     | Registrar | `.com` | `.ca` | `.io` |
     |-----------|--------|-------|-------|
     | **Namecheap** (recommended) | ~$10/yr | ~$12/yr | ~$30/yr |
     | Cloudflare Registrar | ~$10/yr | N/A | ~$28/yr |
     | GoDaddy | ~$12/yr | ~$15/yr | ~$35/yr |
   - **Recommendation:** Namecheap or Cloudflare — cheapest at-cost pricing, no upsells

5. **Hosting Options** — Current setup and alternatives:

   **Current Setup (What We Use Now):**
   | Component | Provider | Tier | Cost |
   |-----------|----------|------|------|
   | Frontend | **Netlify** | Free | $0 (100GB bandwidth, auto-deploy from Git) |
   | Backend API | **Render** | Free | $0 (spins down after 15 min inactivity) |
   | Database | **Supabase** | Free | $0 (500MB DB, 1GB storage) |

   **Why Netlify + Render + Supabase?**
   - Zero cost to start — no upfront investment
   - Auto-deploy on every Git push
   - SSL included on all providers
   - Scales easily by upgrading tiers

   **Alternative Hosting Options:**
   | Option | Frontend | Backend | Database | Monthly Cost | Pros | Cons |
   |--------|----------|---------|----------|-------------|------|------|
   | **A: Current (Netlify + Render + Supabase)** | Netlify Free | Render Free | Supabase Free | **$0** | Zero cost, easy setup | Render cold starts (30s), Supabase limits |
   | **B: Current (Paid tiers)** | Netlify Pro $19 | Render Starter $7 | Supabase Pro $25 | **$51/mo** | Always-on, production-ready | Monthly cost |
   | **C: Vercel + Railway** | Vercel Free | Railway $5 | Supabase Pro $25 | **$30/mo** | Fast deploys, no cold starts | Railway limited free tier |
   | **D: VPS (DigitalOcean)** | DO Droplet | Same droplet | Supabase Pro $25 | **$31–37/mo** | Full control, no cold starts | Requires server management |
   | **E: AWS (Amplify + EC2)** | Amplify Free | EC2 t3.micro | RDS/Supabase | **$15–50/mo** | Enterprise-grade | Complex setup, AWS learning curve |

   **Recommendation:** Stay with **Option A (free tiers)** for MVP launch. Upgrade to **Option B (paid tiers, ~$51/mo)** when real users start using the platform. This avoids Render cold starts and Supabase limits.

6. **Email Service** — Need an email provider for transactional emails:
   - Required for: booking confirmations, password resets, pro notifications
   - **Email provider pricing:**
     | Provider | Free Tier | Paid |
     |----------|-----------|------|
     | **Resend** (recommended) | 3,000 emails/month | $20/mo for 50K |
     | SendGrid | 100 emails/day (~3,000/mo) | $15/mo for 50K |
     | AWS SES | 3,000/mo free (if on EC2) | $0.10 per 1,000 |
   - Recommendation: Start with **Resend** — free tier is sufficient for early launch, no credit card required

### Business Considerations
7. **Terms of Service & Privacy Policy** — Pages exist with placeholder content. Need legal review before launch with real users.

8. **Insurance Page** — Currently shows placeholder providers (belairdirect, Intact). Need actual partnership details or remove before launch.

9. **Pro Verification** — Current flow creates pro accounts but doesn't include actual background check integration. This is a manual process for now.

10. **Pricing** — Service prices are seeded with sample data. Need real pricing from the business team before launch.

11. **Geographic Scope** — The platform references Canadian addresses (Ontario). Confirm the initial launch market.

### Security Notes
12. **Rate Limiting** — Not yet implemented on API endpoints. Should add before production launch to prevent abuse.

13. **Input Validation** — Basic validation exists. Need comprehensive sanitization audit before handling real user data.

14. **File Upload** — Image uploads limited to 5MB, image types only. Storage bucket is public (images accessible via URL). Consider signed URLs for sensitive content.

---

## 6. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Supabase free tier limits hit | High | Medium | Upgrade to Pro plan before marketing push |
| Render cold starts (30s delay) | Medium | High | Upgrade to paid plan or add health ping |
| Stripe integration complexity | Medium | Low | Well-documented API, standard flow |
| Mobile responsiveness gaps | Medium | Medium | Dedicated mobile audit in Week 2 |
| Legal compliance (ToS/Privacy) | High | Medium | Get legal review before public launch |

---

## 7. Cost Breakdown — Launch Budget

### MVP Launch (Minimum — Free Tiers)
| Service | Cost |
|---------|------|
| Stripe | **$0** (pay per transaction only) |
| Netlify hosting | **$0** (free tier: 100GB bandwidth) |
| Render backend | **$0** (free tier: spins down after 15 min) |
| Supabase | **$0** (free tier: 500MB DB, 1GB storage) |
| Email — Resend | **$0** (free tier: 3,000 emails/month) |
| Domain name | **~$12/year** |
| **Total to launch MVP** | **~$12 one-time (domain only)** |

### Production-Grade (Paid Tiers — When Real Users Come)
| Service | Cost |
|---------|------|
| Stripe | 2.9% + $0.30 per transaction |
| Netlify Pro | $19/mo |
| Render Starter | $7/mo |
| Supabase Pro | $25/mo |
| Email — Resend | $0–$20/mo |
| Domain name | ~$12/year |
| **Total monthly (production)** | **~$51–71/month** + transaction fees |

### Stripe Revenue Example
| Monthly Bookings | Avg. Job Price | Gross Revenue | Stripe Fees | Platform Commission (15%) | Net Platform Revenue |
|-----------------|---------------|---------------|-------------|--------------------------|---------------------|
| 50 jobs | $100 | $5,000 | ~$160 | $750 | **~$590/mo** |
| 100 jobs | $100 | $10,000 | ~$320 | $1,500 | **~$1,180/mo** |
| 200 jobs | $150 | $30,000 | ~$640 | $4,500 | **~$3,860/mo** |

---

## 8. Summary

| Metric | Value |
|--------|-------|
| **Current Completion** | ~85% of full product |
| **Pages Built** | 28+ (incl. transactions, admin revenue, checkout, payment success) |
| **API Modules** | 8 (incl. Stripe Connect controller) |
| **DB Tables** | 15 / 15 |
| **Remaining Work** | ~15 dev days (notifications, reviews, admin panel, polish) |
| **MVP Launch Cost** | ~$12 (domain only) |
| **Production Monthly Cost** | ~$51–71/month + Stripe fees |
| **MVP Target** | **February 27, 2026** |
| **Full Launch Target** | **March 13, 2026** |
| **Critical Blockers** | None — all remaining work is additive |

---

*Document prepared: February 13, 2026*
*Last updated: February 22, 2026 (timeline restored to original dates per client, added review system build plan)*
