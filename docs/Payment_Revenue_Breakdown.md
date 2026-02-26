# BridgeWork — Payment & Revenue Breakdown

> Last Updated: February 14, 2026

---

## 1. Payment Flow Overview

```
Customer books service ($120)
    ↓
Tax applied (8%) → $9.60
    ↓
Customer pays total: $129.60
    ↓
Stripe processes payment
    ↓
Stripe deducts processing fee (2.9% + $0.30)
    ↓
Platform receives net amount
    ↓
Platform takes commission (15%)
    ↓
Pro receives remainder via Stripe Connect payout
    ↓
Stripe deducts Connect payout fee (0.25% + $0.25)
    ↓
Pro receives final amount
```

---

## 2. Fee Structure

| Fee Type | Rate | Charged To | Description |
|----------|------|------------|-------------|
| **Stripe Processing Fee** | 2.9% + $0.30 per transaction | Deducted from gross payment | Standard Stripe fee for processing credit/debit cards |
| **Platform Commission** | 15% of base service price | Deducted from payment before pro payout | BridgeWork's revenue — configurable percentage |
| **Stripe Connect Payout Fee** | 0.25% + $0.25 per payout | Deducted from pro's payout | Fee for transferring funds to pro's bank account |
| **Tax (HST/GST)** | 8% of service price (after discount) | Paid by customer | Collected and remitted by platform |
| **Chargeback/Dispute Fee** | $15 per dispute | Charged to platform | Only if customer disputes a charge (<1% of transactions) |

---

## 3. Scenario-Based Breakdown

### Scenario A: Standard Booking — $120 Service

| Line Item | Amount | % of Gross |
|-----------|--------|------------|
| **Service Base Price** | $120.00 | — |
| **Tax (8%)** | $9.60 | — |
| **Customer Pays (Gross)** | **$129.60** | 100% |
| | | |
| Stripe Processing Fee (2.9% + $0.30) | -$4.06 | 3.13% |
| **Net After Stripe Fee** | **$125.54** | 96.87% |
| | | |
| **Platform Commission (15% of $120)** | **+$18.00** | 13.89% |
| Tax Collected (held for remittance) | $9.60 | 7.41% |
| | | |
| Amount to Pro (before Connect fee) | $97.94 | 75.57% |
| Stripe Connect Payout Fee (0.25% + $0.25) | -$0.49 | 0.38% |
| **Pro Receives (Final)** | **$97.45** | 75.19% |
| | | |
| **Platform Net Revenue** | **$13.94** | 10.76% |

#### Platform Revenue Calculation:
```
Platform Commission:          $18.00  (15% of $120 base price)
Minus Stripe Processing Fee:  -$4.06  (2.9% + $0.30 of $129.60)
= Platform Net Revenue:       $13.94
```

#### Pro Earnings Calculation:
```
Net After Stripe Fee:         $125.54
Minus Tax (held by platform): -$9.60
Minus Platform Commission:    -$18.00
= Pro Amount Before Payout:   $97.94
Minus Connect Payout Fee:     -$0.49  (0.25% + $0.25)
= Pro Final Earnings:         $97.45
```

---

### Scenario B: Premium Booking — $250 Service

| Line Item | Amount | % of Gross |
|-----------|--------|------------|
| **Service Base Price** | $250.00 | — |
| **Tax (8%)** | $20.00 | — |
| **Customer Pays (Gross)** | **$270.00** | 100% |
| | | |
| Stripe Processing Fee (2.9% + $0.30) | -$8.13 | 3.01% |
| **Net After Stripe Fee** | **$261.87** | 96.99% |
| | | |
| **Platform Commission (15% of $250)** | **+$37.50** | 13.89% |
| Tax Collected (held for remittance) | $20.00 | 7.41% |
| | | |
| Amount to Pro (before Connect fee) | $204.37 | 75.69% |
| Stripe Connect Payout Fee (0.25% + $0.25) | -$0.76 | 0.28% |
| **Pro Receives (Final)** | **$203.61** | 75.41% |
| | | |
| **Platform Net Revenue** | **$29.37** | 10.88% |

---

### Scenario C: Budget Booking — $60 Service

| Line Item | Amount | % of Gross |
|-----------|--------|------------|
| **Service Base Price** | $60.00 | — |
| **Tax (8%)** | $4.80 | — |
| **Customer Pays (Gross)** | **$64.80** | 100% |
| | | |
| Stripe Processing Fee (2.9% + $0.30) | -$2.18 | 3.36% |
| **Net After Stripe Fee** | **$62.62** | 96.64% |
| | | |
| **Platform Commission (15% of $60)** | **+$9.00** | 13.89% |
| Tax Collected (held for remittance) | $4.80 | 7.41% |
| | | |
| Amount to Pro (before Connect fee) | $48.82 | 75.34% |
| Stripe Connect Payout Fee (0.25% + $0.25) | -$0.37 | 0.57% |
| **Pro Receives (Final)** | **$48.45** | 74.77% |
| | | |
| **Platform Net Revenue** | **$6.82** | 10.53% |

---

### Scenario D: Booking with Promo Code — $120 Service, 20% Discount

| Line Item | Amount | % of Gross |
|-----------|--------|------------|
| **Service Base Price** | $120.00 | — |
| **Promo Discount (20%)** | -$24.00 | — |
| **Discounted Price** | $96.00 | — |
| **Tax (8% of $96)** | $7.68 | — |
| **Customer Pays (Gross)** | **$103.68** | 100% |
| | | |
| Stripe Processing Fee (2.9% + $0.30) | -$3.31 | 3.19% |
| **Net After Stripe Fee** | **$100.37** | 96.81% |
| | | |
| **Platform Commission (15% of $96)** | **+$14.40** | 13.89% |
| Tax Collected (held for remittance) | $7.68 | 7.41% |
| | | |
| Amount to Pro (before Connect fee) | $78.29 | 75.52% |
| Stripe Connect Payout Fee (0.25% + $0.25) | -$0.45 | 0.43% |
| **Pro Receives (Final)** | **$77.84** | 75.08% |
| | | |
| **Platform Net Revenue** | **$11.09** | 10.70% |

> **Note:** When a promo code is applied, the platform absorbs the discount — the pro still gets paid based on the discounted price. This is configurable; alternatively, the platform could absorb the full discount and pay the pro based on the original price.

---

## 4. Monthly Revenue Projections

### At 15% Platform Commission

| Monthly Jobs | Avg Service Price | Gross Revenue | Stripe Fees | Platform Commission | Tax Collected | Pro Payouts | **Platform Net Revenue** |
|-------------|-------------------|---------------|-------------|--------------------|--------------|-----------|-----------------------|
| 25 | $100 | $2,700 | ~$86 | $375 | $200 | $2,039 | **$289** |
| 50 | $100 | $5,400 | ~$172 | $750 | $400 | $4,078 | **$578** |
| 50 | $150 | $8,100 | ~$258 | $1,125 | $600 | $6,117 | **$867** |
| 100 | $120 | $12,960 | ~$413 | $1,800 | $960 | $9,787 | **$1,387** |
| 200 | $120 | $25,920 | ~$826 | $3,600 | $1,920 | $19,574 | **$2,774** |
| 500 | $150 | $81,000 | ~$2,580 | $11,250 | $6,000 | $61,170 | **$8,670** |

### Revenue Formula:
```
Platform Net Revenue = (Platform Commission) - (Stripe Processing Fees)
Platform Commission  = Sum of (base_price × 0.15) for all bookings
Stripe Processing Fee = Sum of (gross_payment × 0.029 + 0.30) for all bookings
```

---

## 5. Money Distribution Summary (Per $100 Service)

```
Customer pays:  $108.00  (service + 8% tax)
                   │
                   ├── Stripe Fee:        $3.43  (3.18%)  → Goes to Stripe
                   ├── Tax:               $8.00  (7.41%)  → Held for government remittance
                   ├── Platform Cut:      $15.00 (13.89%) → BridgeWork revenue
                   ├── Connect Fee:       $0.46  (0.43%)  → Goes to Stripe
                   └── Pro Earnings:      $81.11 (75.10%) → Pro's bank account
                                         ───────
                   Total:               $108.00 (100%)

Platform Net = $15.00 - $3.43 = $11.57 per $100 job (~10.71% effective margin)
```

---

## 6. Key Percentages at a Glance

| Stakeholder | % of Customer Payment | Description |
|-------------|----------------------|-------------|
| **Customer** | Pays 108% of base price | Base price + 8% tax |
| **Stripe** | ~3.5% | Processing fee + Connect payout fee |
| **Government (Tax)** | ~7.4% | 8% tax collected, held for remittance |
| **BridgeWork (Platform)** | ~10.7% | 15% commission minus Stripe fees |
| **Pro** | ~75.1% | Remainder after all deductions |

---

## 7. Configurable Parameters

These values can be adjusted in the backend:

| Parameter | Current Value | Location | Notes |
|-----------|--------------|----------|-------|
| Platform Commission % | 15% | `paymentsController.js` | Industry standard: 10-25% |
| Tax Rate | 8% | `bookingsController.js` | Varies by jurisdiction |
| Currency | USD | `paymentsController.js` | Can be changed to CAD |
| Stripe Processing | 2.9% + $0.30 | Set by Stripe | Non-negotiable at current volume |
| Connect Payout | 0.25% + $0.25 | Set by Stripe | Non-negotiable |

---

## 8. Stripe Connect Implementation Plan (Phase 2)

### What Needs to Be Built

| Task | Description | Priority |
|------|-------------|----------|
| Pro Stripe onboarding | Each pro creates a Stripe Connected Account via OAuth flow | High |
| `stripe_connect_account_id` on `pro_profiles` | Store each pro's connected account ID | High |
| Payment splitting in `createPaymentIntent` | Add `application_fee_amount` and `transfer_data` | High |
| Pro payout dashboard | Show pros their earnings, pending payouts, payout history | Medium |
| Platform admin revenue dashboard | Show total revenue, fees, payouts | Medium |
| Refund handling | Process refunds and reverse pro payouts | Medium |

### Code Change Required (paymentsController.js)

```javascript
// FROM (current — all money to platform):
const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.total_price * 100),
    currency: 'usd',
    customer: customerId,
});

// TO (with Connect — automatic split):
const PLATFORM_COMMISSION_RATE = 0.15; // 15%
const applicationFee = Math.round(booking.base_price * PLATFORM_COMMISSION_RATE * 100);

const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.total_price * 100),
    currency: 'usd',
    customer: customerId,
    application_fee_amount: applicationFee,
    transfer_data: {
        destination: proProfile.stripe_connect_account_id,
    },
});
```

### Estimated Timeline
- **Pro onboarding flow:** 2-3 days
- **Payment splitting:** 1 day
- **Pro earnings dashboard:** 2 days
- **Admin revenue dashboard:** 2 days
- **Testing & QA:** 1-2 days
- **Total: ~8-10 dev days**

---

## 9. Important Notes

1. **Tax Remittance:** The 8% tax collected must be remitted to the appropriate tax authority. Consult an accountant for filing requirements.

2. **Promo Code Impact:** Discounts reduce the base price, which reduces both the platform commission and the pro's earnings proportionally.

3. **Chargebacks:** If a customer disputes a charge, Stripe charges a $15 fee regardless of outcome. The platform should have a dispute resolution process to minimize these.

4. **Minimum Viable Revenue:** At 50 jobs/month with an average $120 service price, the platform nets approximately **$578/month** after all fees.

5. **Break-Even Analysis:**
   - Monthly hosting costs: ~$51-71/month (production tier)
   - Break-even: ~5-7 jobs per month at $120 average
   - Profitable from the first month with moderate volume

---

*Document prepared for BridgeWork stakeholder review.*
*All calculations based on Stripe standard pricing as of February 2026.*
