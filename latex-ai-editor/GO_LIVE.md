# Vero go-live runbook

Everything to switch Vero from test mode to live, in the order that avoids breakage, then how to prove it works.
Tick items as you go. Each item says **where** to do it.

> **Current state (checked 29 Sep 2026):**
>
> - Clerk runs on **development** keys (`pk_test_…`).
> - Dodo runs in **test mode**.
> - The Gemini key is on the **free tier**.
> - The production database holds **only test data**: 14 users (6 on Pro), 25 resumes, 51 ATS reports, and 4 users linked to Dodo test subscriptions.
> - All 3 database migrations are applied.

---

## Why the order matters

- **Clerk production users are a separate pool.** Moving Clerk from development to production creates a new, empty user pool with new user IDs. Every current account is a development user and won't exist in production. Their database rows become orphans, so we **reset the test data** in step 3.
- **Dodo test and live are separate worlds.** Test subscriptions, customers and product IDs don't exist in live mode, and the 6 "Pro" test users would keep Pro for free if left in place.
- **Vercel only picks up** `NEXT_PUBLIC_`* **values at build time.** Change env vars first, then redeploy once at the end.

---



## 1. Vercel (vercel.com → each project → Settings)

- [ ] **Upgrade to the Pro plan.** Hobby is for non-commercial use only, and Vero takes payments.
- [ ] **Delete any** `NODE_ENV` **variable you added.** Vercel sets `NODE_ENV=production` on its own; a manual `NODE_ENV=development` makes the app behave like a dev build. Check: Settings → Environment Variables → search `NODE_ENV`, and delete it if present.
- [ ] Set live values for the **Production** environment only (steps 2–5 list them). Leave **Preview** and **Development** on the test keys, so preview deploys never touch real money or real users.
- [ ] Marketing project: `NEXT_PUBLIC_APP_URL=https://dashboard.withvero.app` and `NEXT_PUBLIC_SITE_URL=https://www.withvero.app`. Analytics and Speed Insights should both be enabled.



## 2. Separate your development database from production (Neon console)

Today your laptop and the live site share **one database**, so local testing writes into production.

- [ ] Neon → your project → **Branches → Create branch** named `dev`, from `main`.
- [ ] Put the `dev` branch connection string in your **local** `.env` (`DATABASE_URL`). Vercel Production keeps `main`.
- [ ] Consider a paid Neon plan for point-in-time restore (7+ days of history) now that real users' data is at stake.



## 3. Reset the test data (after step 2, before real users arrive)

- [ ] **Delete the test users from the database.** Deleting a user row cascades to their resumes, versions, AI chats, ATS reports and usage. Also clear `processed_webhooks`.
- [ ] **Delete the test files in R2:** `ats-resumes/`* and `thumbnails/`*. The bucket itself stays.

**Say "reset launch data" and I'll write a script** that shows exactly what it will delete, deletes only on your confirmation, and clears the matching R2 files. Or run SQL yourself in the Neon console on `main`: `DELETE FROM users; DELETE FROM processed_webhooks;`

## 4. Clerk production instance (dashboard.clerk.com → Vero)

- [x] Top bar: **Development → Create production instance**. Choose to **clone development settings**.
- [x] **Domain:** `withvero.app`.
- [x] **DNS:** add every record Clerk shows (Configure → Domains) in your DNS provider (Vercel → Domains → withvero.app → DNS Records). They're usually a `clerk` CNAME, an `accounts` CNAME, and 2–3 email records (`clkmail`, `clk._domainkey`, `clk2._domainkey`).
- [x] Wait for Clerk to show all of them **Verified** and the SSL certificates **Issued**. This can take minutes to a few hours.
- [ ] **Google sign-in with your own OAuth app.** Production instances can't use Clerk's shared keys.
  - [x] Google Cloud Console → APIs & Services → **OAuth consent screen**:
    - app name **Vero**, logo `public/brand/vero-icon-512.png`, support email;
    - home page `https://www.withvero.app`, privacy `https://www.withvero.app/privacy`, terms `https://www.withvero.app/terms`;
    - scopes: email, profile, openid;
    - then **Publish app** (moves it from Testing to In production).
  - [x] **Credentials → Create OAuth client ID** (Web application). Paste the **Authorized redirect URI** that Clerk shows under SSO connections → Google, which looks like `https://clerk.withvero.app/v1/oauth_callback`.
  - [x] Paste the Client ID and Secret into Clerk: production → SSO connections → Google → **Use custom credentials**.
- [ ] Customization → Branding: application name **Vero** and the logo. Check the email templates show "Vero".
- [x] Paths: sign-in `/sign-in`, sign-up `/sign-up`, after sign-out `/sign-in` (same as development).
- [x] **Webhook (production instance):** endpoint `https://dashboard.withvero.app/api/webhooks/clerk`, event `user.deleted` (the only one Vero handles). Copy its **Signing Secret**.
- [x] **Vercel dashboard project (Production):**
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_…`
  - `CLERK_SECRET_KEY` = `sk_live_…`
  - `CLERK_WEBHOOK_SIGNING_SECRET` = production signing secret



## 5. Dodo Payments live mode ([app.dodopayments.com](http://app.dodopayments.com))

- [x] Switch the dashboard toggle to **Live mode**. Everything below is done *in live mode*.
- [x] Check **payout details** (bank account) and tax information are complete.
- [ ] **Business profile:**
  - name **Vero**, logo `vero-icon-512.png`;
  - support email `sehajmakkar007@gmail.com`;
  - website `https://www.withvero.app`;
  - the statement descriptor customers will see on their bank statement.
- [x] **Products → Create:** "Vero Pro", **subscription**, **$5.99 / month**, **tax inclusive**, same settings as the test product. Copy the **live product ID**.
- [x] **Developer → API keys:** create a **live** API key.
- [x] **Developer → Webhooks:** add `https://dashboard.withvero.app/api/webhooks/dodo` with the **subscription** events (created, active, renewed, on hold, cancelled, failed, expired, plan changed). Copy its **signing key**.
- [x] Enable the **customer portal** (the Billing page's "Manage subscription" opens it).
- [ ] **Vercel dashboard project (Production):**
  - `DODO_PAYMENTS_API_KEY` = live key
  - `DODO_PAYMENTS_ENVIRONMENT` = `live_mode`
  - `DODO_PAYMENTS_WEBHOOK_KEY` = live webhook signing key
  - `DODO_PRODUCT_ID_PRO` = live product ID
  - **Delete** `DODO_PRODUCT_ID_PRO_PLUS`. It's a test-mode ID with no meaning in live mode.



## 6. Gemini: switch to the paid tier ([aistudio.google.com](http://aistudio.google.com))

- [ ] AI Studio → **Get API key** → the key's project → **Set up billing** (or Google Cloud → Billing → link the project).
  - **Why:** your Privacy Policy says Vero uses the **paid** Gemini API, so Google doesn't use prompts to improve its products. On the free tier, Google's terms allow that use, and it would cover users' resumes.
  - **Also:** the free tier's rate limits would throttle real users.
- [ ] Set a **budget alert** (Google Cloud → Billing → Budgets), for example $20/month to start.
- [ ] Confirm `GEMINI_MODEL=gemini-3.6-flash` works on the paid project. Remember that model's price doubles on 1 Jan 2027 (plan §7).



## 7. Compile service and storage

- [ ] **Railway:** the service shows **Active**, and `GET https://<railway-url>/health` returns OK. Set a **usage alert**. `LATEX_API_SECRET` must match on Railway and Vercel.
- [ ] **Cloudflare R2:** the `R2_`* keys in Vercel Production point at the bucket you want for production. After step 3 it should hold no test files.



## 8. Marketing site (content before you announce)

- [ ] **Testimonials:** the section still has invented quotes, stock photos and claims ("Senior Engineer at Google", "placement rate up 30%").
  - **Why this matters now:** the US FTC's 2024 rule bans fake testimonials, and Dodo or a user could flag them.
  - **Recommendation:** hide the section until your friends' real quotes are in. Say the word and I'll hide it.
- [ ] The **operator name** in `marketing/lib/site.ts` (`Sehaj Preet`) matches your Dodo KYC name.
- [ ] Google Search Console: add `www.withvero.app` and submit `https://www.withvero.app/sitemap.xml`.
- [ ] Check the share previews: paste both domains into [https://www.opengraph.xyz](https://www.opengraph.xyz).



## 9. Redeploy, then migrate

- [ ] Redeploy **both** Vercel projects (Deployments → latest → Redeploy, with "use existing build cache" **off**).
- [ ] Check the dashboard build log: it should show **no** "⚠ Production is missing optional environment variables" line.
- [ ] If anything changed in the schema since, run `npm run db:migrate` against `main`. Today all 3 migrations are already applied.

---



## 10. Production smoke test (do it yourself, on the live site)

Use a real Google account that has **never** signed up before.

**Account and core flow**

- [ ] `https://www.withvero.app` loads, the logo animates, and every navbar/footer link works (including Terms, Privacy, Refunds).
- [ ] **Get Started** takes you to `dashboard.withvero.app/sign-up`. Sign-up says "Vero" and has **no "Development mode" banner**, and Google sign-in works.
- [ ] Create a resume from **Jake's Resume**, compile, download the PDF.
- [ ] Create one from **Awesome CV**. It compiles with **Auto · XeLaTeX**, with no manual setting.
- [ ] ⌘K on a bullet ("add metrics"): a diff appears, and **Keep** applies it.
- [ ] Command bar: "Tailor to a job" with a pasted job post. Review the diff, then Keep all, and the PDF updates.
- [ ] **ATS check** on the resume and on an uploaded PDF, with a job description. The report opens.
- [ ] **Import** an Overleaf `.zip` (Overleaf → Menu → Download → Source), then a PDF.
- [ ] Make a copy of a resume. The dashboard shows real thumbnails.

**Billing, with real money on your own card: $5.99, refunded afterwards**

- [ ] Billing → **Upgrade to Pro**. The Dodo checkout shows **Vero**, $5.99, and the right tax. Pay with your real card.
- [ ] The success page shows **"You're on Pro"** within a few seconds. The sidebar shows Pro, and the limits change.
- [ ] Dodo live dashboard: the payment and an **active** subscription are there. Webhooks → deliveries all show **200**.
- [ ] Billing → **Manage subscription** opens the portal → **Cancel**. Vero says "you keep Pro until ".
- [ ] **Refund** the payment in the Dodo dashboard (your 7-day first-payment policy), then cancel the subscription immediately there. After the webhook, the account shows Free.
- [ ] A **declined card** (use a card with no funds, or cancel on the checkout page) shows "Payment didn't go through" and doesn't spin.

**Account deletion**

- [ ] Account → **Delete account**. You're signed out.
- [ ] The Clerk production user is gone, any Dodo subscription is cancelled, and signing in again creates a brand-new empty account.

**Mobile**

- [ ] Marketing site and dashboard on your phone: the hero, pricing, sign-in, the editor's Preview tab, and the Billing page.

---



## 11. Launch day and first week

- [ ] Post the launch video (`brag-output/brag.mp4`). **Music licence:** the soundtrack comes from the inspiration video. License it or swap it before posting publicly.
- [ ] **Check daily for the first week:**
  - Dodo webhook deliveries (all 200);
  - the Vercel logs for `billing_webhook_unmatched` or `billing_webhook_ignored`;
  - Railway health;
  - Gemini spend.
- [ ] Until the daily reconciliation job exists (plan follow-up), compare Dodo's **active subscriptions** with Vero's Pro users once a day.
- [ ] Set up a free uptime monitor (for example BetterStack or UptimeRobot) for `www.withvero.app`, `dashboard.withvero.app` and the Railway `/health`.



## If something goes wrong

- **Payments broken:** in Vercel, set `DODO_PAYMENTS_ENVIRONMENT=test_mode` with the test keys and redeploy. Checkout goes back to test mode while you debug. Real subscribers keep their Pro status in the database.
- **Bad deploy:** Vercel → Deployments → previous good deployment → **Promote to Production**. It's instant.
- **Sign-in broken after the Clerk switch:** check that the DNS records show Verified in Clerk and that the `pk_live`/`sk_live` pair is from the same instance.

---



## Code changes I recommend before launch (say the word)

1. **Make the launch config impossible to get wrong:** on Vercel Production, fail the build if the Clerk key is `pk_test_…`, Dodo isn't `live_mode`, or any billing/storage/webhook variable is missing. Today those only warn.
2. **A launch-data reset script** for step 3 that shows what it will delete and only deletes after you confirm, including the R2 files.
3. **Hide the testimonials** until there are real ones.
4. **Error monitoring** (Sentry's free tier) so you hear about failures before users email you.

