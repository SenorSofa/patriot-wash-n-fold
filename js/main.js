/* ============================================================
   PATRIOT WASH N FOLD — Main JavaScript
   ============================================================ */

/* -------------------------------------------------------
   CONFIGURATION — Update these values for your setup
   ------------------------------------------------------- */
const CONFIG = {
  // GHL Webhook URL — Replace with your actual GHL webhook URL
  // Steve: go to GHL > Settings > Integrations > Webhooks and create
  // a new inbound webhook, then paste the URL here.
  GHL_WEBHOOK_URL: 'https://services.leadconnectorhq.com/hooks/YOUR_WEBHOOK_ID/webhook-trigger/YOUR_TRIGGER_ID',

  // Stripe Payment Links — Replace with your actual Stripe Payment Link URLs
  // See STRIPE_SETUP.md for instructions on creating these in Stripe Dashboard
  STRIPE_LINKS: {
    red_upfront:   'https://buy.stripe.com/REPLACE_RED_UPFRONT',
    red_weekly:    'https://buy.stripe.com/REPLACE_RED_WEEKLY',
    white_upfront: 'https://buy.stripe.com/REPLACE_WHITE_UPFRONT',
    white_biweekly:'https://buy.stripe.com/REPLACE_WHITE_BIWEEKLY',
    blue:          'https://buy.stripe.com/REPLACE_BLUE',
  },

  // Plan display names for the checkout form
  PLAN_NAMES: {
    red_upfront:   'Red Plan — Pay Upfront ($600/semester)',
    red_weekly:    'Red Plan — Weekly Payments ($40/week × 16)',
    white_upfront: 'White Plan — Pay Upfront ($300/semester)',
    white_biweekly:'White Plan — Bi-Weekly Payments ($40/2wks × 8)',
    blue:          'Blue Plan — Single Wash ($50)',
  }
};

/* -------------------------------------------------------
   NAVIGATION — Mobile hamburger toggle
   ------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      const isOpen = mobileNav.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
  }

  // Active nav link highlighting
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Close mobile nav on link click
  document.querySelectorAll('.nav__mobile a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
    });
  });

  /* -------------------------------------------------------
     FAQ ACCORDION
     ------------------------------------------------------- */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all open items
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Open clicked item if it was closed
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* -------------------------------------------------------
     SCROLL FADE-IN ANIMATIONS
     ------------------------------------------------------- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  /* -------------------------------------------------------
     PLAN WIZARD — Smart Plan Selector
     ------------------------------------------------------- */
  initPlanWizard();

  /* -------------------------------------------------------
     CHECKOUT FORM
     ------------------------------------------------------- */
  initCheckoutForm();

  /* -------------------------------------------------------
     CONTACT FORM
     ------------------------------------------------------- */
  initContactForm();

});

/* -------------------------------------------------------
   PLAN WIZARD
   ------------------------------------------------------- */
function initPlanWizard() {
  const wizard = document.getElementById('plan-wizard');
  if (!wizard) return;

  let selectedFrequency = null; // 'weekly' | 'biweekly' | 'once'
  let selectedPayment   = null; // 'upfront' | 'split'
  let selectedPlanKey   = null;

  const step1 = document.getElementById('wizard-step-1');
  const step2 = document.getElementById('wizard-step-2');
  const step3 = document.getElementById('wizard-step-3');

  const dot1 = document.getElementById('wizard-dot-1');
  const dot2 = document.getElementById('wizard-dot-2');
  const dot3 = document.getElementById('wizard-dot-3');
  const line1 = document.getElementById('wizard-line-1');
  const line2 = document.getElementById('wizard-line-2');

  // Step 1: Frequency selection
  document.querySelectorAll('[data-frequency]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedFrequency = btn.dataset.frequency;

      if (selectedFrequency === 'once') {
        // Blue plan — skip to step 3 directly
        selectedPlanKey = 'blue';
        showStep3('blue');
        return;
      }

      // Advance to step 2
      dot1.classList.remove('active');
      dot1.classList.add('done');
      dot1.innerHTML = '✓';
      line1.classList.add('done');
      dot2.classList.add('active');

      step1.classList.add('hidden');
      step2.classList.remove('hidden');

      // Populate step 2 with correct plan data
      populatePaymentStep(selectedFrequency);
    });
  });

  // Step 2: Payment method selection
  document.querySelectorAll('[data-payment]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPayment = btn.dataset.payment;

      if (selectedFrequency === 'weekly') {
        selectedPlanKey = selectedPayment === 'upfront' ? 'red_upfront' : 'red_weekly';
      } else {
        selectedPlanKey = selectedPayment === 'upfront' ? 'white_upfront' : 'white_biweekly';
      }

      dot2.classList.remove('active');
      dot2.classList.add('done');
      dot2.innerHTML = '✓';
      line2.classList.add('done');
      dot3.classList.add('active');

      step2.classList.add('hidden');
      showStep3(selectedPlanKey);
    });
  });

  // Back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.back;
      if (target === '1') {
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        step1.classList.remove('hidden');

        dot1.classList.add('active');
        dot1.classList.remove('done');
        dot1.innerHTML = '1';
        dot2.classList.remove('active', 'done');
        dot2.innerHTML = '2';
        dot3.classList.remove('active', 'done');
        dot3.innerHTML = '3';
        line1.classList.remove('done');
        line2.classList.remove('done');
      } else if (target === '2') {
        step3.classList.add('hidden');
        step2.classList.remove('hidden');

        dot3.classList.remove('active', 'done');
        dot3.innerHTML = '3';
        dot2.classList.add('active');
        dot2.classList.remove('done');
        dot2.innerHTML = '2';
        line2.classList.remove('done');
      }
    });
  });

  function showStep3(planKey) {
    const planName = CONFIG.PLAN_NAMES[planKey];
    const stripeLink = CONFIG.STRIPE_LINKS[planKey];

    // Update step 3 display
    const planDisplay = document.getElementById('wizard-plan-display');
    const proceedBtn  = document.getElementById('wizard-proceed-btn');

    if (planDisplay) planDisplay.textContent = planName;
    if (proceedBtn) {
      proceedBtn.href = '#checkout-form';
      proceedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Store selected plan for checkout form
        window._selectedPlanKey  = planKey;
        window._selectedPlanName = planName;
        window._selectedStripeLink = stripeLink;

        // Update checkout form display
        const formPlanDisplay = document.getElementById('checkout-plan-name');
        if (formPlanDisplay) formPlanDisplay.textContent = planName;

        // Smooth scroll to checkout form
        const checkoutSection = document.getElementById('checkout-form');
        if (checkoutSection) {
          checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    step1.classList.add('hidden');
    step2.classList.add('hidden');
    step3.classList.remove('hidden');
  }

  function populatePaymentStep(frequency) {
    const isWeekly = frequency === 'weekly';
    const planLabel     = document.getElementById('payment-plan-label');
    const upfrontPrice  = document.getElementById('payment-upfront-price');
    const upfrontSub    = document.getElementById('payment-upfront-sub');
    const upfrontSaving = document.getElementById('payment-upfront-saving');
    const splitPrice    = document.getElementById('payment-split-price');
    const splitSub      = document.getElementById('payment-split-sub');
    const splitTotal    = document.getElementById('payment-split-total');
    const splitLabel    = document.getElementById('payment-split-label');

    if (planLabel)     planLabel.textContent = isWeekly ? 'Red Plan — Weekly Service (16 Washes)' : 'White Plan — Bi-Weekly Service (8 Washes)';
    if (upfrontPrice)  upfrontPrice.textContent = isWeekly ? '$600' : '$300';
    if (upfrontSub)    upfrontSub.textContent = 'per semester, paid in full';
    if (upfrontSaving) upfrontSaving.textContent = isWeekly ? 'Save $40 vs. weekly payments' : 'Save $20 vs. bi-weekly payments';
    if (splitPrice)    splitPrice.textContent = '$40';
    if (splitSub)      splitSub.textContent = isWeekly ? 'per week × 16 weeks' : 'every 2 weeks × 8 payments';
    if (splitTotal)    splitTotal.textContent = isWeekly ? 'Total: $640/semester' : 'Total: $320/semester';
    if (splitLabel)    splitLabel.textContent = isWeekly ? 'Weekly Payments' : 'Bi-Weekly Payments';
  }
}

/* -------------------------------------------------------
   CHECKOUT FORM — Capture info, POST to GHL, redirect to Stripe
   ------------------------------------------------------- */
function initCheckoutForm() {
  const form = document.getElementById('checkout-form-el');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const errorEl   = document.getElementById('form-submit-error');
    const successEl = document.getElementById('form-submit-success');

    // Clear previous messages
    if (errorEl)   { errorEl.classList.remove('visible'); errorEl.textContent = ''; }
    if (successEl) { successEl.classList.remove('visible'); }

    // Validate required fields
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#e74c3c';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });

    if (!valid) {
      if (errorEl) {
        errorEl.textContent = 'Please fill out all required fields.';
        errorEl.classList.add('visible');
      }
      return;
    }

    // Gather form data
    const data = {
      firstName:      form.querySelector('#field-first-name')?.value.trim() || '',
      lastName:       form.querySelector('#field-last-name')?.value.trim() || '',
      email:          form.querySelector('#field-email')?.value.trim() || '',
      phone:          form.querySelector('#field-phone')?.value.trim() || '',
      dormRoom:       form.querySelector('#field-dorm-room')?.value.trim() || '',
      parentEmail:    form.querySelector('#field-parent-email')?.value.trim() || '',
      selectedPlan:   window._selectedPlanName || form.querySelector('#field-plan')?.value || '',
      detergentPref:  form.querySelector('#field-detergent')?.value || 'standard',
      specialNotes:   form.querySelector('#field-notes')?.value.trim() || '',
      source:         'patriotwashnfold.com',
      tags:           ['pwnf-signup', 'dbu-student'],
    };

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
      // POST to GHL webhook
      const response = await fetch(CONFIG.GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      // Success — redirect to Stripe
      const stripeLink = window._selectedStripeLink || CONFIG.STRIPE_LINKS.blue;
      window.location.href = stripeLink;

    } catch (err) {
      console.error('GHL webhook error:', err);
      // Even if webhook fails, we still redirect to Stripe
      // (contact capture is best-effort; payment must not be blocked)
      const stripeLink = window._selectedStripeLink || CONFIG.STRIPE_LINKS.blue;
      window.location.href = stripeLink;
    }
  });
}

/* -------------------------------------------------------
   CONTACT FORM — Simple mailto / GHL webhook
   ------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form-el');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    const successEl = document.getElementById('contact-success');

    const data = {
      firstName: form.querySelector('#contact-first-name')?.value.trim() || '',
      lastName:  form.querySelector('#contact-last-name')?.value.trim() || '',
      email:     form.querySelector('#contact-email')?.value.trim() || '',
      phone:     form.querySelector('#contact-phone')?.value.trim() || '',
      message:   form.querySelector('#contact-message')?.value.trim() || '',
      source:    'patriotwashnfold.com/contact',
      tags:      ['pwnf-contact-form'],
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await fetch(CONFIG.GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error('Contact form webhook error:', err);
    }

    // Show success regardless
    form.style.display = 'none';
    if (successEl) successEl.classList.add('visible');
  });
}
