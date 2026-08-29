/**
 * PATRIOT WASH N FOLD — Cloudflare Worker
 *
 * Routes:
 *   POST /api/checkout          — Creates Stripe Checkout Session with fixed 8.25% TX tax
 *   POST /api/webhook           — Receives Stripe checkout.session.completed, fires GHL post-payment
 *   GET  /api/students          — Returns active regular subscribers (pwnf-subscriber tag) from GHL
 *   POST /api/intake-submit     — Fires GHL webhook for each regular subscriber Joe selected (schedules Thursday text)
 *   GET  /api/omni-students     — Returns OMNI students by group (?group=a or ?group=b)
 *   POST /api/omni-submit       — Fires GHL OMNI delivery webhook instantly for selected OMNI students
 *
 * Required Cloudflare secrets:
 *   STRIPE_SECRET_KEY           rk_live_... (restricted Stripe key)
 *   STRIPE_WEBHOOK_SECRET       whsec_...
 *   GHL_SIGNUP_WEBHOOK          GHL inbound webhook — contact capture
 *   GHL_PAYMENT_WEBHOOK         GHL inbound webhook — post-payment subscriber tag
 *   GHL_INTAKE_WEBHOOK          GHL inbound webhook — laundry received (regular subscribers → Thursday text)
 *   GHL_OMNI_DELIVERY_WEBHOOK   GHL inbound webhook — OMNI laundry delivered (instant text)
 *   GHL_API_KEY                 pit-... (GHL private integration token)
 */

const PRICE_IDS = {
  red_upfront:    'price_1Tc9qlGZqppInSm2ClF6v27R',
  red_weekly:     'price_1TcQksGZqppInSm2NqrfpIJW',
  white_upfront:  'price_1TcRRKGZqppInSm2d9mmJY7j',
  white_biweekly: 'price_1TcRUCGZqppInSm2XGlDzVh7',
  blue:           'price_1TcRfKGZqppInSm2faPGT0JD',
};

const TAX_RATE_ID    = 'txr_1TeGJCGZqppInSm2RSWSLwkZ';
const GHL_LOCATION   = 'b6dwywQfMCvXAy4PDicG';
const SUCCESS_URL    = 'https://patriotwashnfold.com/?signup=success';
const CANCEL_URL     = 'https://patriotwashnfold.com/pricing.html';
const RECURRING_PLANS = new Set(['red_weekly', 'white_biweekly']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }
    if (url.pathname === '/api/students' && request.method === 'GET') {
      return handleGetStudents(request, env);
    }
    if (url.pathname === '/api/intake-submit' && request.method === 'POST') {
      return handleIntakeSubmit(request, env);
    }
    if (url.pathname === '/api/omni-students' && request.method === 'GET') {
      return handleGetOmniStudents(request, env);
    }
    if (url.pathname === '/api/omni-submit' && request.method === 'POST') {
      return handleOmniSubmit(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

// ─── CHECKOUT ────────────────────────────────────────────────────────────────

async function handleCheckout(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return corsResponse({ error: 'Invalid JSON' }, 400); }

  const { firstName, lastName, email, phone, parentEmail, selectedPlan, detergentPref } = body;
  if (!email || !selectedPlan || !PRICE_IDS[selectedPlan]) {
    return corsResponse({ error: 'Missing required fields' }, 400);
  }

  const priceId     = PRICE_IDS[selectedPlan];
  const isRecurring = RECURRING_PLANS.has(selectedPlan);

  // 1. Fire GHL contact capture (before Stripe — guaranteed)
  try {
    await fetch(env.GHL_SIGNUP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, phone, parentEmail, selectedPlan, detergentPref, source: 'patriotwashnfold.com' })
    });
  } catch (e) { console.error('GHL signup webhook failed:', e.message); }

  // 2. Create Stripe Checkout Session
  const params = new URLSearchParams();
  params.append('success_url', SUCCESS_URL);
  params.append('cancel_url', CANCEL_URL);
  params.append('customer_email', email);
  params.append('client_reference_id', email);
  params.append('allow_promotion_codes', 'true');

  if (isRecurring) {
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('subscription_data[default_tax_rates][0]', TAX_RATE_ID);
    params.append('subscription_data[metadata][studentEmail]', email);
    params.append('subscription_data[metadata][selectedPlan]', selectedPlan);
  } else {
    params.append('mode', 'payment');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][tax_rates][0]', TAX_RATE_ID);
    params.append('payment_intent_data[metadata][studentEmail]', email);
    params.append('payment_intent_data[metadata][selectedPlan]', selectedPlan);
  }

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString()
  });

  const session = await stripeRes.json();
  if (!stripeRes.ok) {
    console.error('Stripe error:', JSON.stringify(session));
    return corsResponse({ error: session.error?.message || 'Stripe error' }, 500);
  }

  return corsResponse({ url: session.url }, 200);
}

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature');
  const rawBody   = await request.text();

  if (env.STRIPE_WEBHOOK_SECRET) {
    const isValid = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  if (event.type === 'checkout.session.completed') {
    const session     = event.data.object;
    const studentEmail = session.client_reference_id || session.customer_email;
    try {
      await fetch(env.GHL_PAYMENT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'checkout.session.completed', studentEmail, data: { object: session } })
      });
    } catch (e) { console.error('GHL payment webhook failed:', e.message); }
  }

  return new Response('ok', { status: 200 });
}

// ─── GET STUDENTS — regular subscribers (pwnf-subscriber tag) ────────────────

async function handleGetStudents(request, env) {
  try {
    const students = await fetchContactsByTag(env, 'pwnf-subscriber');
    return corsResponse({ students }, 200);
  } catch (err) {
    console.error('Students fetch error:', err.message);
    return corsResponse({ error: 'Server error' }, 500);
  }
}

// ─── GET OMNI STUDENTS — by group tag (?group=a or ?group=b) ─────────────────

async function handleGetOmniStudents(request, env) {
  const url   = new URL(request.url);
  const group = (url.searchParams.get('group') || '').toLowerCase();

  if (group !== 'a' && group !== 'b') {
    return corsResponse({ error: 'group param must be "a" or "b"' }, 400);
  }

  const tag = group === 'a' ? 'omni-group-a' : 'omni-group-b';

  try {
    const students = await fetchContactsByTag(env, tag);
    return corsResponse({ students, group }, 200);
  } catch (err) {
    console.error('OMNI students fetch error:', err.message);
    return corsResponse({ error: 'Server error' }, 500);
  }
}

// ─── SHARED: fetch all contacts with a given tag (paginated) ─────────────────

async function fetchContactsByTag(env, tag) {
  const collected = [];
  let searchAfter = null;
  let page = 0;
  const MAX_PAGES = 20; // safety cap: 20 * 100 = 2000 contacts max

  while (page < MAX_PAGES) {
    const payload = {
      locationId: GHL_LOCATION,
      pageLimit: 100,
      filters: [
        {
          field: 'tags',
          operator: 'contains',
          value: tag,
        },
      ],
    };
    if (searchAfter) payload.searchAfter = searchAfter;

    const ghlRes = await fetch(
      'https://services.leadconnectorhq.com/contacts/search',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error('GHL API error:', ghlRes.status, errText);
      throw new Error(`GHL API error ${ghlRes.status}`);
    }

    const data     = await ghlRes.json();
    const contacts = data.contacts || [];
    if (contacts.length === 0) break;

    for (const c of contacts) collected.push(c);

    const total = typeof data.total === 'number' ? data.total : null;
    if (total !== null && collected.length >= total) break;

    const last = contacts[contacts.length - 1];
    const nextCursor = last && last.searchAfter;
    if (!nextCursor || contacts.length < 100) break;
    searchAfter = nextCursor;
    page++;
  }

  // Defensive client-side tag check + dedup
  const seen = new Set();
  return collected
    .filter(c => Array.isArray(c.tags) && c.tags.includes(tag))
    .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .map(c => ({
      id:        c.id,
      firstName: c.firstName || '',
      lastName:  c.lastName  || '',
      phone:     c.phone     || '',
      email:     c.email     || '',
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

// ─── INTAKE SUBMIT — regular subscribers (fires GHL → schedules Thursday text) ──

async function handleIntakeSubmit(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return corsResponse({ error: 'Invalid JSON' }, 400); }

  const { students } = body;
  if (!students || !Array.isArray(students) || students.length === 0) {
    return corsResponse({ error: 'No students provided' }, 400);
  }

  const results = await Promise.allSettled(
    students.map(student =>
      fetch(env.GHL_INTAKE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId:  student.id,
          firstName:  student.firstName,
          lastName:   student.lastName,
          phone:      student.phone,
          email:      student.email,
          event:      'laundry_received',
          timestamp:  new Date().toISOString(),
        })
      })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed    = results.filter(r => r.status === 'rejected').length;

  return corsResponse({ success: true, sent: succeeded, failed }, 200);
}

// ─── OMNI SUBMIT — OMNI delivery confirmed (fires instant text) ───────────────

async function handleOmniSubmit(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return corsResponse({ error: 'Invalid JSON' }, 400); }

  const { students, group } = body;
  if (!students || !Array.isArray(students) || students.length === 0) {
    return corsResponse({ error: 'No students provided' }, 400);
  }
  if (group !== 'a' && group !== 'b') {
    return corsResponse({ error: 'group must be "a" or "b"' }, 400);
  }

  const results = await Promise.allSettled(
    students.map(student =>
      fetch(env.GHL_OMNI_DELIVERY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId:  student.id,
          firstName:  student.firstName,
          lastName:   student.lastName,
          phone:      student.phone,
          email:      student.email,
          event:      'omni_laundry_delivered',
          group:      group,
          timestamp:  new Date().toISOString(),
        })
      })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed    = results.filter(r => r.status === 'rejected').length;

  return corsResponse({ success: true, sent: succeeded, failed }, 200);
}

// ─── STRIPE SIGNATURE VERIFICATION ───────────────────────────────────────────

async function verifyStripeSignature(payload, header, secret) {
  if (!header) return false;
  const parts     = Object.fromEntries(header.split(',').map(p => p.split('=')));
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
  const mac      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

// ─── CORS HELPER ─────────────────────────────────────────────────────────────

function corsResponse(body, status) {
  const headers = {
    'Access-Control-Allow-Origin':  'https://patriotwashnfold.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}
