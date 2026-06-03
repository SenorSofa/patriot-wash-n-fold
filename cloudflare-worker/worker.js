/**
 * PATRIOT WASH N FOLD — Cloudflare Worker
 * 
 * Handles two routes:
 *   POST /api/checkout  — Creates a Stripe Checkout Session with fixed 8.25% Texas tax
 *                         and fires GHL contact capture webhook before redirecting
 *   POST /api/webhook   — Receives Stripe checkout.session.completed events and
 *                         fires GHL post-payment webhook to tag contact as subscriber
 * 
 * Environment variables required (set in Cloudflare Workers dashboard):
 *   STRIPE_SECRET_KEY      — sk_live_... (your Stripe live secret key)
 *   STRIPE_WEBHOOK_SECRET  — whsec_... (from Stripe webhook endpoint settings)
 *   GHL_SIGNUP_WEBHOOK     — GHL inbound webhook URL for contact capture
 *   GHL_PAYMENT_WEBHOOK    — GHL inbound webhook URL for post-payment subscriber tagging
 */

const PRICE_IDS = {
  red_upfront:    'price_1Tc9qlGZqppInSm2ClF6v27R',
  red_weekly:     'price_1TcQksGZqppInSm2NqrfpIJW',
  white_upfront:  'price_1TcRRKGZqppInSm2d9mmJY7j',
  white_biweekly: 'price_1TcRUCGZqppInSm2XGlDzVh7',
  blue:           'price_1TcRfKGZqppInSm2faPGT0JD',
};

const TAX_RATE_ID = 'txr_1TeGJCGZqppInSm2RSWSLwkZ'; // Texas Sales Tax 8.25%

const SUCCESS_URL = 'https://patriotwashnfold.com/?signup=success';
const CANCEL_URL  = 'https://patriotwashnfold.com/pricing.html';

// Recurring plan keys (need subscription mode)
const RECURRING_PLANS = new Set(['red_weekly', 'white_biweekly']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }

    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

// ─── CHECKOUT HANDLER ────────────────────────────────────────────────────────

async function handleCheckout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: 'Invalid JSON' }, 400);
  }

  const { firstName, lastName, email, phone, parentEmail, selectedPlan, detergentPref } = body;

  if (!email || !selectedPlan || !PRICE_IDS[selectedPlan]) {
    return corsResponse({ error: 'Missing required fields' }, 400);
  }

  const priceId  = PRICE_IDS[selectedPlan];
  const isRecurring = RECURRING_PLANS.has(selectedPlan);

  // 1. Fire GHL contact capture webhook (before Stripe — guaranteed capture)
  try {
    await fetch(env.GHL_SIGNUP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName, lastName, email, phone,
        parentEmail, selectedPlan, detergentPref,
        source: 'patriotwashnfold.com'
      })
    });
  } catch (e) {
    // GHL failure must not block payment
    console.error('GHL signup webhook failed:', e.message);
  }

  // 2. Build Stripe Checkout Session params
  const sessionParams = new URLSearchParams();
  sessionParams.append('success_url', SUCCESS_URL);
  sessionParams.append('cancel_url', CANCEL_URL);
  sessionParams.append('customer_email', email);
  sessionParams.append('client_reference_id', email);
  sessionParams.append('allow_promotion_codes', 'true');

  if (isRecurring) {
    sessionParams.append('mode', 'subscription');
    sessionParams.append('line_items[0][price]', priceId);
    sessionParams.append('line_items[0][quantity]', '1');
    sessionParams.append('subscription_data[default_tax_rates][0]', TAX_RATE_ID);
    // Pass student info as metadata on the subscription
    sessionParams.append('subscription_data[metadata][studentEmail]', email);
    sessionParams.append('subscription_data[metadata][selectedPlan]', selectedPlan);
  } else {
    sessionParams.append('mode', 'payment');
    sessionParams.append('line_items[0][price]', priceId);
    sessionParams.append('line_items[0][quantity]', '1');
    sessionParams.append('line_items[0][tax_rates][0]', TAX_RATE_ID);
    // Pass student info as metadata
    sessionParams.append('payment_intent_data[metadata][studentEmail]', email);
    sessionParams.append('payment_intent_data[metadata][selectedPlan]', selectedPlan);
  }

  // 3. Create Stripe Checkout Session
  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: sessionParams.toString()
  });

  const session = await stripeResponse.json();

  if (!stripeResponse.ok) {
    console.error('Stripe error:', JSON.stringify(session));
    return corsResponse({ error: session.error?.message || 'Stripe error' }, 500);
  }

  return corsResponse({ url: session.url }, 200);
}

// ─── STRIPE WEBHOOK HANDLER ───────────────────────────────────────────────────

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature');
  const rawBody   = await request.text();

  // Verify webhook signature
  if (env.STRIPE_WEBHOOK_SECRET) {
    const isValid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const studentEmail = session.client_reference_id || session.customer_email;

    // Fire GHL post-payment webhook to tag as subscriber and trigger welcome text
    try {
      await fetch(env.GHL_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'checkout.session.completed',
          studentEmail,
          data: { object: session }
        })
      });
    } catch (e) {
      console.error('GHL payment webhook failed:', e.message);
    }
  }

  return new Response('ok', { status: 200 });
}

// ─── STRIPE SIGNATURE VERIFICATION ───────────────────────────────────────────

async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')));
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

// ─── CORS HELPER ─────────────────────────────────────────────────────────────

function corsResponse(body, status) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://patriotwashnfold.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}
