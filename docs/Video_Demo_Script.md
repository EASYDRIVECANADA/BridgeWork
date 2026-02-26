# BridgeWork — Video Demo Script (Updated)

**Purpose:** Walkthrough recording for stakeholder update (Syed)
**Estimated Duration:** 10–12 minutes
**Recording Tool:** OBS Studio / Loom / Screen recorder of choice
**Resolution:** 1920×1080 recommended
**Last Updated:** February 19, 2026

---

## Pre-Recording Checklist

- [ ] Production site live at `https://fluffy-melomakarona-d00b8e.netlify.app` (or use local dev servers)
- [ ] Backend live at `https://bridgework-backend.onrender.com` (or local `node src/server.js`)
- [ ] Two browser windows ready (one for homeowner, one for pro)
- [ ] Test accounts ready:
  - **Homeowner:** Daniel Mercado (or any registered user)
  - **Pro:** Galiver Danaf (or any active pro account)
- [ ] Stripe test card ready: `4242 4242 4242 4242` (any future expiry, any CVC)
- [ ] Clear browser cache / use incognito for clean demo
- [ ] Close unnecessary tabs and notifications
- [ ] Run `clean_test_data.sql` in Supabase SQL Editor for a fresh start (optional)

---

## SCENE 1: Introduction (15 seconds)

**[Show: Homepage]**

> "This is BridgeWork — a home services platform that connects homeowners with verified professionals. I'll walk you through the full platform including our new escrow payment system."

---

## SCENE 2: Homepage & Branding (30 seconds)

**[Show: Homepage at `/`]**

- Scroll through the homepage slowly
- Point out:
  - BridgeWork logo and branding in the navbar
  - Hero banner with search functionality
  - Service category cards (11 categories)
  - "How It Works" section
  - Promotional banners
  - Footer with navigation links

> "The homepage features our branded design with service categories, promotional sections, and a clean modern UI built with Next.js and Tailwind CSS."

---

## SCENE 3: Services Browsing (30 seconds)

**[Navigate: `/services`]**

- Show the services listing page with all 26 services
- Click on one service to show the detail page (`/services/[id]`)
- Point out: service description, pricing, booking button

> "Users can browse all 26 services across 11 categories. Each service has a detailed page with description, pricing, and a booking option."

---

## SCENE 4: User Registration with Email Confirmation (60 seconds)

**[Navigate: `/signup`]**

- Fill out the signup form (first name, last name, email, phone, password)
- Click "Sign Up"
- Show the **"Check Your Email"** confirmation screen with the user's email displayed
- Point out: user cannot log in until they confirm their email

**[Switch to email inbox (Gmail)]**

- Show the **branded BridgeWork confirmation email** arriving in inbox
- Point out: BridgeWork logo, blue header, "Confirm your email address" button
- Click the confirmation link

> "When a user signs up, they receive a branded confirmation email from BridgeWork. They must click the link to activate their account — this prevents fake signups and ensures valid email addresses. Notice the professional branded template."

---

## SCENE 5: Login (15 seconds)

**[Navigate: `/login`]**

- Log in with the confirmed account
- Show the redirect to dashboard

> "After confirming their email, the user can now log in and access their dashboard."

---

## SCENE 6: User Dashboard (30 seconds)

**[Show: `/dashboard`]**

- Show the dashboard with:
  - User's booking history with payment status badges (Funds Held / Paid / Pay Now)
  - Quick action cards (Schedule & Save, Insurance, Credits)
  - Navigation to Messages, My Jobs, Profile

> "The dashboard shows the user's active and past bookings with live payment status. You can see badges indicating whether funds are held in escrow, fully paid, or awaiting payment."

---

## SCENE 7: Booking a Service + Escrow Payment (90 seconds)

**[Navigate: `/services` → Pick a service (e.g., AC Tune-Up) → Click "Book Now"]**

- Walk through the booking flow:
  - Select service
  - Enter address and scheduling details
  - Confirm booking
- Show the booking appearing on the dashboard with "Pay Now" badge

**[Click "Pay Now" → Checkout page `/checkout/[bookingId]`]**

- Show the Stripe Elements card input form
- Enter test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Click "Pay"
- Show the Payment Success page with **escrow messaging**:
  - "Payment Authorized" (not "Payment Successful")
  - Explanation that funds are held until job is confirmed

**[Navigate back to `/dashboard` or `/my-jobs`]**

- Show the booking now displays **"Funds Held"** badge (blue)

> "Here's our escrow payment system in action. When a user books and pays, the funds are authorized on their card but NOT charged yet. The money is held in escrow by Stripe. The user sees a 'Funds Held' badge confirming their payment is secured."

---

## SCENE 8: Pro Side — Accept Job & Submit Proof (90 seconds)

**[Switch to Pro browser window → Navigate: `/pro-dashboard`]**

- Log in with the pro account
- Show the Pro Dashboard with:
  - Job alerts showing the new booking
  - Statistics (jobs done, earnings, rating)

**[Accept the job]**

- Click "Accept" on the job alert
- Show the job moving to "Active Jobs" with "Accepted" status

**[Submit Proof of Work]**

- Click the **"Submit Proof"** button (orange) on the active job
- Show the proof submission modal:
  - Enter photo URLs (proof images)
  - Add optional notes (e.g., "Completed AC tune-up, replaced filter")
  - Click "Submit Proof"
- Show the button change to **"Proof Sent"** badge (green)

> "On the pro side, after accepting and completing the work, the pro submits proof — photos and notes documenting the job. This is stored in our database and shared with the homeowner for review. Notice the 'Submit Proof' button replaces the old 'Bill Out' — pros can no longer directly charge customers."

---

## SCENE 9: User Confirms Job — Escrow Release (60 seconds)

**[Switch back to Homeowner browser → Navigate: `/my-jobs`]**

- Show the active job now displays:
  - **"Proof Submitted"** label
  - **"Funds Held"** badge
  - **"View Proof"** button
  - **"Confirm & Pay"** button (green)
  - **"Dispute"** button (red)

**[Click "View Proof"]**

- Show the proof modal with the pro's submitted photos and notes

**[Click "Confirm & Pay"]**

- Show the confirmation dialog
- Confirm → funds are captured
- Job moves to **"Completed"** section with **"Paid"** badge

> "The homeowner can now review the pro's proof of work. If satisfied, they click 'Confirm & Pay' which releases the held funds to the pro. The job is marked as completed. If not satisfied, they can dispute — which freezes the funds and notifies an admin to review."

---

## SCENE 10: Messaging System (60 seconds)

**[Navigate: `/messages` on homeowner account]**

This is the key feature demo:

1. **Show the split-panel UI** — conversation list on left, chat on right
2. **Click on a conversation** — show messages loading
3. **Type a message** — show real-time delivery via Socket.IO
4. **Show typing indicator** — "User is typing..."
5. **Image Upload:**
   - Click the **camera icon** in the chat input
   - Select an image file (JPG/PNG)
   - Show the **image preview bar** above the input
   - Click **"Send Image"**
   - Show the image appearing in the chat bubble
   - Click the image to open full-size in new tab
6. **Show unread badge** — navigate away and back to show badge clears

> "The messaging system is fully real-time using Socket.IO. Users and pros can exchange text messages and images. The image upload feature stores files in Supabase Storage. You can see the split-panel design with conversation list, typing indicators, and image previews."

---

## SCENE 11: Forgot Password Flow (45 seconds)

**[Navigate: `/login` → Click "Forgot Password?"]**

- Show the forgot password page
- Enter an email address and click "Send Reset Link"
- Show the **"Check Your Email"** success screen

**[Switch to email inbox (Gmail)]**

- Show the **branded BridgeWork reset password email** arriving
- Point out: BridgeWork branding, "Reset Password" button, security notice
- Click the reset link

**[Show: `/reset-password` page]**

- Enter a new password and confirm
- Show the success screen with link to login

> "The forgot password flow sends a branded reset email via Supabase. The user clicks the link, enters a new password, and can immediately log in. The system prevents email enumeration — it always shows success regardless of whether the email exists."

---

## SCENE 12: Additional Pages (30 seconds)

Quick scroll-through of:

**[Navigate quickly through each:]**

- `/credits` — Credits & promo codes page
- `/insurance` — Insurance perks page
- `/schedule-save` — Schedule & Save with service reminders
- `/profile/edit` — Profile editing form
- `/become-pro` — Pro application page
- `/about`, `/careers`, `/help` — Informational pages

> "We've also built out the full suite of supporting pages — credits, insurance perks, schedule and save reminders, profile management, pro application, and informational pages like About, Careers, and Help."

---

## SCENE 13: Closing Summary (30 seconds)

**[Show: Homepage]**

> "To summarize — BridgeWork is a full-stack home services platform with email-verified signups, branded password reset flow, escrow payments powered by Stripe, real-time messaging with image upload, and a complete pro proof-of-work system. The platform includes 26+ pages, 8 backend API modules, Supabase authentication with branded email templates, and is deployed on Render and Netlify. Thank you."

---

## Post-Recording

- [ ] Review the recording for any errors or sensitive data (especially Stripe test keys)
- [ ] Trim intro/outro dead air
- [ ] Export as MP4
- [ ] Upload to shared drive or send via the group chat
- [ ] Accompany with the Weekly Summary Report, EOD Reports, and Delivery Timeline docs

---

## Key Talking Points to Emphasize

1. **Escrow payment system** — Funds held until job confirmed; protects both users and pros
2. **Proof of work** — Pros must submit photo evidence before getting paid
3. **Dispute resolution** — Users can dispute; admin reviews and resolves
4. **Stripe integration** — PaymentIntents with manual capture, Stripe Connect for pro payouts, 15% platform commission
5. **Full-stack build** — Not just UI mockups; everything is connected to a real database
6. **Real-time features** — Socket.IO messaging works live between users
7. **Image upload** — Files stored in Supabase Storage, not just local
8. **26 pages** — Complete user journey from browsing to booking to payment to messaging
9. **Production-ready** — Deployed on Netlify (frontend) and Render (backend)
10. **Email system** — Branded confirmation and reset emails via Supabase; users must verify email before accessing the platform
11. **11 development days** — Rapid delivery timeline (Feb 5–19)

---

## Escrow Flow Summary (for reference during recording)

```
User books service → Pays via Stripe (funds HELD, not charged)
    ↓
Pro receives job alert → Accepts job
    ↓
Pro completes work → Submits proof (photos + notes)
    ↓
User reviews proof on My Jobs page
    ↓
  ┌─── User clicks "Confirm & Pay" → Funds captured → Job completed
  │
  └─── User clicks "Dispute" → Funds frozen → Admin notified → Admin resolves
           ↓                                       ↓
       Admin releases funds to pro          Admin refunds user
```

---

*Script prepared: February 13, 2026*
*Updated: February 18, 2026 — Added escrow payment system, proof of work, and dispute flow scenes*
*Updated: February 19, 2026 — Added email confirmation signup, forgot password flow, and branded email template scenes*
