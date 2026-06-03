# PWNF Cloudflare Worker — Deployment Guide

## What this Worker does
- Receives form data from the website checkout form
- Fires GHL contact capture webhook (guaranteed, before Stripe)
- Creates a Stripe Checkout Session with fixed 8.25% Texas tax
- Returns the Stripe checkout URL to the browser
- Receives Stripe payment confirmation webhook and fires GHL post-payment webhook

## Deploy via Cloudflare Dashboard (no CLI needed)

### Step 1 — Create the Worker
1. Log into Cloudflare → click **Workers & Pages** in the left sidebar
2. Click **Create** → **Create Worker**
3. Name it: `pwnf-checkout`
4. Click **Deploy** (ignore the default code for now)
5. Click **Edit code** on the next screen
6. Delete all the default code
7. Paste the entire contents of `worker.js` into the editor
8. Click **Deploy**

### Step 2 — Add environment variables (secrets)
1. Go to your Worker → **Settings** → **Variables and Secrets**
2. Click **Add variable** for each of these — use **Secret** type for all:

| Variable name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | Your Stripe live secret key (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook endpoint (whsec_...) — add after Step 4 |
| `GHL_SIGNUP_WEBHOOK` | `https://services.leadconnectorhq.com/hooks/b6dwywQfMCvXAy4PDicG/webhook-trigger/22251fb0-4750-4a1f-8fde-73cd01b3cdb2` |
| `GHL_PAYMENT_WEBHOOK` | `https://services.leadconnectorhq.com/hooks/b6dwywQfMCvXAy4PDicG/webhook-trigger/0a36872a-471b-4ec1-a57d-acc47f7e8242` |

3. Click **Save and deploy** after adding all variables

### Step 3 — Add the route
1. Go to your Worker → **Settings** → **Triggers** → **Routes**
2. Click **Add route**
3. Route: `patriotwashnfold.com/api/*`
4. Zone: `patriotwashnfold.com`
5. Click **Save**

### Step 4 — Update Stripe webhook endpoint
1. Go to Stripe → Developers → Webhooks
2. Find the existing "PWNF GHL Post-Payment" endpoint
3. **Update the URL** to: `https://patriotwashnfold.com/api/webhook`
   (The Worker now handles this instead of GHL directly)
4. Copy the **Signing secret** (whsec_...)
5. Go back to Cloudflare Worker → Settings → Variables and add `STRIPE_WEBHOOK_SECRET`

### Step 5 — That's it
The website form already calls `/api/checkout` (after the code update).
Test with a real checkout and verify:
- GHL contact is created with correct student data
- Stripe checkout shows 8.25% tax for all addresses
- After payment, GHL tags contact as `pwnf-subscriber`
- Welcome text fires
