# 🎯 PAYMENT SYSTEM v2.0 - Unified Tier Model & Stripe Setup

**Date:** May 4, 2026  
**Changes:** Consolidated from 3-tier (Free/Hero/Quest Master) to 2-tier (Free/Pro) system

---

## 📊 NEW SUBSCRIPTION TIERS

### Free Tier
- **Price:** $0
- **Characters:** 1
- **Campaigns:** 1 (observer only - can join but not create)
- **AI Calls:** 3/month
- **Features:** Basic character sheet, dice roller, reference tables, join campaigns
- **Stripe:** No payment required

### Pro Tier (formerly "Ultimate DM Screen")
- **Price:** $9.99/month or $99.99/year (17% savings)
- **Characters:** Unlimited
- **Campaigns:** Unlimited
- **AI Calls:** Unlimited
- **Features:** Everything - character journal, party inventory, session recaps, portrait AI, world building, Rook AI, combat tracking, full reference tables, session broadcasting, NPC mapping, story arcs
- **Stripe:** Recurring subscription

### Legacy Tiers (Auto-Mapped)
- **Hero** → Pro
- **Quest Master** → Pro
- **Legendary** → Pro

On their next login, existing users in old tiers will automatically have access to Pro tier features.

---

## 🔧 STRIPE CONFIGURATION

### What You Need From Stripe

1. **Publishable Key** (`pk_test_` or `pk_live_`)
   - Used in frontend for checkout
   - Safe to expose in code

2. **Secret Key** (`sk_test_` or `sk_live_`)
   - Add to `.env` as `STRIPE_API_KEY`
   - NEVER expose publicly

3. **Webhook Signing Secret** (`whsec_`)
   - Add to `.env` as `STRIPE_WEBHOOK_SECRET`
   - Used to verify webhook events are from Stripe

4. **Price IDs** (Product prices you create in Stripe Dashboard)
   - Monthly price ID
   - Yearly price ID

### .env Configuration

```bash
# Stripe API Keys (use sk_test_* for development, sk_live_* for production)
STRIPE_API_KEY=sk_test_51NgVlxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_Moxxxxxxxxxxxxxxxxxxxxxxxx

# Payment Settings
STRIPE_CURRENCY=gbp
```

---

## ⚙️ STRIPE DASHBOARD SETUP

### Step 1: Create Products

Go to **Products** in your Stripe Dashboard

#### Product A: Ultimate DM Screen - Monthly
- Name: `Ultimate DM Screen - Monthly`
- Price: `9.99 GBP`
- Billing period: `Monthly`
- → Copy **Price ID** (e.g., `price_1NgVlxxxxxxx`)

#### Product B: Ultimate DM Screen - Yearly
- Name: `Ultimate DM Screen - Yearly`
- Price: `99.99 GBP`
- Billing period: `Yearly`
- → Copy **Price ID** (e.g., `price_1NgVlyyyyyy`)

### Step 2: Configure Webhooks

Go to **Developers** → **Webhooks**

1. Click **+ Add Endpoint**
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Click the endpoint to open it
6. Click **Reveal** next to Signing secret
7. Copy and add to `.env` as `STRIPE_WEBHOOK_SECRET`

### Step 3: Get API Keys

Go to **Developers** → **API Keys**

- Copy **Publishable key** → Optional, can hardcode in React
- Copy **Secret key** → **Must add to backend `.env` as `STRIPE_API_KEY`**

### Step 4: Test Mode (Development)

While developing, use **Test Mode** keys:
- `pk_test_...`
- `sk_test_...`

Test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Exp:** Any future date
- **CVC:** Any 3 digits

### Step 5: Production Mode (Live)

When ready to accept real payments:
1. Stripe Dashboard → Switch to **Live mode** (top left)
2. Get **Live keys** (`pk_live_...`, `sk_live_...`)
3. Update `.env` with Live keys
4. Redeploy backend
5. Update frontend to use Live publishable key if hardcoded

---

## 🧪 TEST CHECKLIST

Before going live, verify:

- [ ] Backend `.env` has `STRIPE_API_KEY` (sk_test_*)
- [ ] Backend `.env` has `STRIPE_WEBHOOK_SECRET` (whsec_test_*)
- [ ] Products created in Stripe (monthly + yearly)
- [ ] Webhook endpoint added and responding
- [ ] Checkout button works and redirects to Stripe
- [ ] Test payment (card `4242...`) completes
- [ ] User upgraded to `pro` tier after payment
- [ ] Webhook received and processed (check logs)
- [ ] Failed payment (card `4000...`) shows error
- [ ] Subscription continues to next billing cycle

---

## 💻 BACKEND CHANGES

### Updated Models

File: `backend/models/__init__.py`

SUBSCRIPTION_PLANS now has:
```python
{
    'free': { ... },           # 1 char, 1 campaign, 3 AI calls
    'pro': { ... },            # Unlimited everything
    'player': { ... },         # Legacy → redirects to pro
    'gm': { ... },             # Legacy → redirects to pro
    'legendary': { ... },      # Legacy → redirects to pro
    'adventurer': { ... }      # Internal testing
}
```

### Enforcement Logic

- **Campaign creation** is gated by `tier` check
  - Free tier: `campaigns_limit` = 1 → limited to observer
  - Pro tier: `campaigns_limit` = -1 (unlimited)

- **Character creation** is gated by `tier` check
  - Free tier: `characters_limit` = 1
  - Pro tier: `characters_limit` = -1 (unlimited)

- **AI calls** are gated by monthly counter
  - Free tier: `ai_calls_limit` = 3/month
  - Pro tier: `ai_calls_limit` = unlimited

---

## 🎨 FRONTEND PRICING PAGE

Update `frontend/src/pages/PricingPage.js` to show:

```jsx
const TIERS = [
  {
    name: 'Free',
    price: '$0',
    features: [
      '1 character',
      '1 campaign (observer only)',
      '3 AI calls/month',
      'Basic character sheet',
      'Dice roller'
    ]
  },
  {
    name: 'Ultimate DM Screen',
    price: '$9.99',
    billing: '/month',
    priceYearly: '$99.99/year (17% off)',
    featured: true,
    features: [
      '✓ Unlimited characters',
      '✓ Unlimited campaigns', 
      '✓ Unlimited AI calls',
      '✓ Character journal',
      '✓ Party inventory',
      '✓ Rook AI co-GM',
      '✓ Combat tracker',
      '✓ Full reference tables',
      '✓ Session broadcasting'
    ]
  }
];
```

---

## 🚀 DEPLOYMENT STEPS

1. **Backup current setup** - Take a snapshot of current database
2. **Update `.env`** - Add Stripe keys
3. **Deploy backend** - New models with updated SUBSCRIPTION_PLANS
4. **Deploy frontend** - Updated pricing page
5. **Test in staging** - Use Stripe test keys
6. **Go live** - Switch to Stripe live keys
7. **Monitor** - Check logs for webhook processing errors

---

## 📧 MIGRATION EMAIL TO USERS

```
Subject: Your Premium Access Gets Even Better 🎉

Hi [USER],

Great news! We've simplified our subscription plans. Your existing premium access is now part of our new "Ultimate DM Screen" tier, which includes ALL features.

What changed:
✓ Only one premium tier now (much simpler!)
✓ All features included (no more deciding between Player/GM tiers)
✓ Same or lower price
✓ Same renewal date - no interruption

What you get:
• Unlimited characters
• Unlimited campaigns
• Unlimited AI calls
• Full reference tables
• Rook AI co-GM
• Session broadcasting
• Everything else

Your subscription renews on [DATE] at $9.99/month (or yearly option).

Questions? Reply to this email.

- The Rook Team
```

---

## ❓ FAQ

**Q: Will existing users be charged differently?**  
A: They'll be on the new Pro tier at the same renewal date. You may want to offer a 2-3 month loyalty discount to smooth the transition.

**Q: Can users still use promo codes?**  
A: Yes! Promo codes work independently of Stripe. They set a flag in the database.

**Q: What if a user downgrades from Pro to Free?**  
A: They lose access to premium features but keep their 1 character + observer campaign access.

**Q: Do I need to use Stripe?**  
A: Currently yes - it's the payment processor. You can disable it by not setting `STRIPE_API_KEY` and rely on promo codes only (test/invite mode).

**Q: Can I change the price later?**  
A: Yes, just update `SUBSCRIPTION_PLANS` in the code or create new products in Stripe. Existing subscriptions continue at original price unless you set up a migration.

---

## 📞 SUPPORT

- **Stripe Docs:** https://stripe.com/docs
- **Stripe Test Cards:** https://stripe.com/docs/testing
- **Webhook Events:** https://stripe.com/docs/webhooks
- **Your Stripe Dashboard:** https://dashboard.stripe.com
