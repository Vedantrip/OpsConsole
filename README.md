# MountLift Ops

Internal console for managing Creators, Brands, Campaigns, and Finance from a single database.

## Stack

Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · Tailwind CSS

## Data model

- **Brand** — clients you run campaigns for
- **Creator** — your roster
- **Campaign** — a brand's engagement, with a budget
- **Deliverable** — a specific post/video/etc. owed by a creator on a campaign, with its own agreed rate
- **Payout** — money owed *to* a creator, tied to a deliverable
- **Invoice** — money owed *by* a brand, tied to a campaign

See `prisma/schema.prisma` for the full schema.

## Local setup

1. Install dependencies
   ```bash
   npm install
   ```

2. **Get a Postgres database.** Easiest options if you don't already have one:
   - [Neon](https://neon.tech) — free tier, ready in ~1 minute
   - [Supabase](https://supabase.com) — free tier, also gives you a hosted admin UI
   - Or run Postgres locally with Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`

3. **Configure your connection**
   ```bash
   cp .env.example .env
   # edit .env and paste in your DATABASE_URL
   ```

4. Push the schema to your database
   ```bash
   npm run db:push
   ```

5. Seed with sample data (optional, but recommended so the app isn't empty)
   ```bash
   npm run db:seed
   ```

6. Run it
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## What's built so far

- Dashboard with live counts (active campaigns, roster size, pending payouts, outstanding invoices)
- Creators — add/remove, view deliverable count per creator
- Brands — add/remove, view campaign count per brand
- Campaigns — create, view detail page per campaign, add deliverables tied to creators
- Finance — two ledgers: creator payouts (payable) and brand invoices (receivable)
- Analytics — roster audits through Apify, with saved snapshots per creator

### Instagram analytics

The audit flow runs inside this Next.js app and calls the Apify Instagram actor directly. Configure `APIFY_API_TOKEN`, optionally `APIFY_ACTOR_ID` (default: `apify~instagram-reel-scraper`), and `DEFAULT_REELS_LIMIT` in the deployment environment. The old `IG_SCRAPER_API_BASE` Render service is no longer used.

It does not provide private Instagram Insights, follower demographics, or authenticated reach data. Those require an official Meta/Instagram Graph API integration, creator authorization, and the appropriate app permissions. The existing audit UI can remain as a public-profile fallback while that connection is added.

## Suggested next steps

- Editing existing records (currently create + delete only)
- Marking payouts/invoices as paid, with a `paidAt` timestamp
- Login (recommend [Clerk](https://clerk.com) — fastest to wire up for an internal tool)
- Campaign profit view: invoice total minus payout total per campaign
- CSV export for Finance (useful at month-end)
- Filtering/search on the Campaigns and Finance list views as data grows

## Project structure

```
prisma/schema.prisma       — data model
prisma/seed.ts             — sample data
src/app/                   — pages (App Router)
  creators/                — Creators CRUD
  brands/                  — Brands CRUD
  campaigns/               — Campaigns list + detail (with deliverables)
  finance/                 — Payouts + Invoices ledgers
src/components/sidebar.tsx — nav
src/lib/prisma.ts          — Prisma client singleton
```