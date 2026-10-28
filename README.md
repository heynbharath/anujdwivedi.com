# anujdwivedi.com

Static site (no build step) for The Office of Anuj Dwivedi and The Anuj Dwivedi Signet.
Data and logic live in the Supabase project `anujdwivedi-office`; the browser only calls its public functions.

## Pages

| Path | What it is |
|---|---|
| `/` | The Threshold: seal, two doors |
| `/signet` | Tiers, prices (monthly, quarterly, yearly) and benefits; invitation-code entry |
| `/members` | The Members' Room (opened with the member's private link) |
| `/request` | Engagement requests, fee and courtesy waiver |
| `/dossier` | Short profile |
| `/office` | The Office panel, staff only (Office key) |
| `/privacy`, `/404` | |

## Deploy on Vercel

1. Push this folder to the private GitHub repo `anujdwivedi-site`.
2. In Vercel, import the repo. Framework preset: **Other**. No build command, output directory `.`.
3. Add the domain `anujdwivedi.com` (and `www`) to the project, then set GoDaddy's nameservers to the ones Vercel shows.

`vercel.json` sets clean URLs, the security headers and the content security policy.

## How the Signet works

- Every staff member has 30 codes per tier (Silver, Gold, Black) in the Office panel.
- A code works once. Entering it on `/signet` admits the person at once and gives them a private member link.
- Gold and Black codes are 12-month gifts by default. Anuj can turn a code into an *offer* (they enter as Silver and pay to activate the higher tier).
- Members ask to upgrade in the Members' Room. Staff paste a Razorpay payment link in *Upgrades*, send it on WhatsApp, and mark it paid; the tier opens immediately.
- Prices, benefits and wording of each tier are edited in *Tiers and prices* (admin only) and update the site live.
- Lost member link: *Members*, then *New member link*, then send it on WhatsApp.
