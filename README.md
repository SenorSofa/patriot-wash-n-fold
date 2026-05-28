# Patriot Wash N Fold — Website

**Live site:** https://patriotwashnfold.com  
**Repo:** SenorSofa/patriot-wash-n-fold  
**Hosting:** GitHub Pages (main branch)

---

## Stack

Pure HTML / CSS / JavaScript — no build tools, no frameworks. Any agent or developer can open any file and edit it directly.

```
patriot-wash-n-fold/
├── index.html          ← Homepage
├── pricing.html        ← Plan wizard + checkout form
├── contact.html        ← Contact info + message form
├── terms.html          ← Terms & Conditions (updated with annual sub language)
├── privacy.html        ← Privacy Policy
├── css/
│   └── styles.css      ← All styles (mobile-first, CSS custom properties at top)
├── js/
│   └── main.js         ← Nav, FAQ accordion, plan wizard, GHL webhook, Stripe redirect
├── assets/
│   └── logo.webp       ← Patriot Wash N Fold logo
└── CNAME               ← Custom domain for GitHub Pages
```

---

## To Change Colors / Theme

Open `css/styles.css` and edit the `:root` block at the very top. Every color on the site flows from those variables.

---

## To Update Stripe Payment Links

Open `js/main.js` and find the `CONFIG` block at the top. Replace the `STRIPE_LINKS` values with your actual Stripe Payment Link URLs.

See `STRIPE_SETUP.md` for full instructions on creating products, enabling Stripe Tax, and generating Payment Links.

---

## To Update the GHL Webhook URL

Open `js/main.js` and find `GHL_WEBHOOK_URL` in the `CONFIG` block. Replace with your actual GHL inbound webhook URL.

---

## Custom Domain Setup (DNS)

Point `patriotwashnfold.com` to GitHub Pages:
1. In your DNS provider, add an A record pointing to GitHub Pages IPs:
   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153
2. Add a CNAME record: `www` → `senorsofa.github.io`
3. In GitHub repo Settings → Pages → Custom domain: enter `patriotwashnfold.com`
4. Enable "Enforce HTTPS"

---

## Editing Content

- **Pricing / plan names / prices:** Edit `pricing.html` and `js/main.js` (CONFIG block)
- **FAQ answers:** Edit the `.faq-answer__inner` divs in `index.html`
- **Contact info:** Edit footer sections in any page and `contact.html`
- **Terms:** Edit `terms.html` directly
- **Logo:** Replace `assets/logo.webp` (keep the same filename)

---

*Separate from PVB projects. Owned by Evan & Eric.*
