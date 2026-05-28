# Patriot Wash N Fold — Setup & Integration Guide

This document covers the exact steps required to finalize the new Patriot Wash N Fold website. It is broken into three parts: **Stripe Tax Setup**, **Stripe Payment Links**, and **GHL Webhook Integration**.

---

## Part 1: Stripe Tax Setup (8.25% Texas Sales Tax)

The website displays clean, pre-tax prices (e.g., $600). Stripe will automatically calculate and add the 8.25% Texas sales tax at checkout.

**Prerequisites:** You need the legal business info and the Texas Sales Tax Permit number (which Joe is providing).

1. Log in to your Stripe Dashboard.
2. Go to **Settings > Tax** (or search "Tax" in the top bar).
3. **Set Origin Address:** Ensure your business address is set to the Carrollton, TX office.
4. **Add Registration:** Under "Registrations", click "Add registration".
   - Select **United States** > **Texas**.
   - Select **State Sales Tax**.
   - Enter your Texas Sales Tax Permit number.
5. **Set Default Tax Behavior:**
   - In Tax settings, set the default tax behavior to **Exclusive** (this means tax is added *on top* of the price, not included in it).
   - Set the default product tax code to **General - Services** (or the specific code for laundry services if advised by your CPA).

---

## Part 2: Creating Stripe Products & Payment Links

You need to create 5 specific Payment Links in Stripe and paste their URLs into the website code.

### Step 1: Create the Products
Go to **Products** in Stripe and create the following:

| Product Name | Pricing Model | Price | Billing Period | Tax Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Red Plan — Upfront** | Standard pricing | $600.00 | One-time | Exclusive |
| **Red Plan — Weekly** | Standard pricing | $40.00 | Recurring: Weekly | Exclusive |
| **White Plan — Upfront** | Standard pricing | $300.00 | One-time | Exclusive |
| **White Plan — Bi-Weekly** | Standard pricing | $40.00 | Recurring: Custom (Every 2 weeks) | Exclusive |
| **Blue Plan** | Standard pricing | $50.00 | One-time | Exclusive |

*Note on Tax Behavior: Ensure "Collect tax automatically" is checked for each product if prompted.*

### Step 2: Create the Payment Links
For each product, click **Create payment link**:
1. Select the product.
2. **Options to check:**
   - "Collect tax automatically" MUST be enabled.
   - "Collect customers' addresses" → Set to Billing address only (required for tax calculation).
   - "Require customers to provide a phone number" → Optional, since GHL captures it.
3. **Post-payment:** Set the confirmation page to redirect back to `https://patriotwashnfold.com` (or show a custom success message).
4. Click **Create link** and copy the URL.

### Step 3: Add Links to the Website
Once you have the 5 URLs, you (or Steve) need to add them to the website code:
1. Open the GitHub repository: `SenorSofa/patriot-wash-n-fold`
2. Open the file `js/main.js`.
3. At the very top of the file, find the `CONFIG` block.
4. Replace the placeholder URLs in `STRIPE_LINKS` with your actual Stripe URLs.
5. Commit the changes.

*Note on Recurring Billing:* Stripe Payment Links for subscriptions will charge indefinitely until canceled. Because these are semester-based plans (16 weeks / 8 payments), you will need to either manually cancel the subscriptions in Stripe at the end of the semester, or set up a Zapier/Make automation to cancel them after a specific number of charges.

---

## Part 3: GHL Webhook Integration (For Steve)

The website captures student info *before* sending them to Stripe, ensuring you get the lead even if they abandon checkout. This is done via a GHL Inbound Webhook.

### Step 1: Create the Webhook in GHL
1. Go to **Automation > Workflows** in GHL.
2. Create a new workflow: `WF - PWNF Website Checkout Capture`.
3. Add a New Trigger: **Inbound Webhook**.
4. Copy the Webhook URL provided by GHL.

### Step 2: Add Webhook URL to Website
1. Open `js/main.js` in the GitHub repo.
2. In the `CONFIG` block at the top, replace the `GHL_WEBHOOK_URL` placeholder with the URL you just copied.
3. Commit the changes.

### Step 3: Map the Fields in GHL
The website sends a JSON payload to the webhook. You need to map these incoming fields to GHL Contact Fields.

**The JSON payload looks exactly like this:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jsmith@dbu.edu",
  "phone": "(214) 555-0100",
  "dormRoom": "Crowley 214",
  "parentEmail": "parent@email.com",
  "selectedPlan": "Red Plan — Pay Upfront ($600/semester)",
  "detergentPref": "standard",
  "specialNotes": "Allergic to fabric softener",
  "source": "patriotwashnfold.com",
  "tags": ["pwnf-signup", "dbu-student"]
}
```

**Mapping Instructions for Steve:**
1. Send a test payload from the live website (fill out the form and click submit).
2. In the GHL Webhook trigger, click "Fetch Sample Requests" and select the test payload.
3. Map `firstName`, `lastName`, `email`, and `phone` to standard GHL contact fields.
4. Map `dormRoom`, `parentEmail`, `selectedPlan`, `detergentPref`, and `specialNotes` to **Custom Fields** in GHL. *(You may need to create these custom fields in GHL Settings > Custom Fields first).*
5. Add an action in the workflow to **Add Contact Tag**: `pwnf-signup`.
6. Save and publish the workflow.

*(Note: The Contact page form sends a similar payload but with a `message` field instead of plan details, and uses the tag `pwnf-contact-form`. You can route both to the same webhook and use an IF/ELSE branch based on the tags, or create a separate webhook for the contact page.)*

---

## Part 4: Finalizing GitHub Pages Hosting

The repository is live at `https://github.com/SenorSofa/patriot-wash-n-fold`.

To make the site public on your custom domain:
1. Go to the repo on GitHub.
2. Click **Settings** > **Pages** (on the left sidebar).
3. Under "Build and deployment", set Source to **Deploy from a branch**.
4. Select the **main** branch and **/(root)** folder, then click Save.
5. Under "Custom domain", enter `patriotwashnfold.com` and click Save.
6. Ensure your DNS records (in GoDaddy/Cloudflare) point to GitHub:
   - A Records pointing to: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - CNAME record for `www` pointing to `senorsofa.github.io`
7. Check the "Enforce HTTPS" box in GitHub Pages settings once the DNS propagates.
