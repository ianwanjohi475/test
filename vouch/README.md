# Vouch

**Turn happy customers into reviews.** Vouch automates the ask: after a job,
it sends the customer a friendly, branded review request by email at the right
moment. Happy customers (4–5★) get routed straight to the business's Google
review page; unhappy ones (1–3★) get routed to a private feedback form so the
owner can fix the problem before it becomes a public 1-star. The owner sees
everything on a calm, credible dashboard.

Built for non-technical owners of 1–5 location local service businesses —
dentists, HVAC, salons, med-spas, contractors, auto shops.

---

## Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + custom, hand-themed shadcn-style components
- **Design system:** "Reputation, earned." — evergreen primary, gold reserved
  for stars/ratings, warm paper background (see `tailwind.config.ts` +
  `src/app/globals.css`)
- **Data + Auth:** Supabase (Postgres + Auth, RLS on) — _Phase 2_
- **Email:** Resend + React Email — _Phase 3_
- **Billing:** Stripe (Checkout + Billing Portal + webhooks) — _Phase 5_
- **Charts:** Recharts · **CSV:** PapaParse · **Validation:** Zod
- **Hosting:** Vercel · **Package manager:** pnpm

## Build phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Foundation — themed shell, routing, design system components | ✅ current |
| 2 | Auth + Supabase schema (RLS) + business creation | ⏳ |
| 3 | Core loop — send request → star-gate page → routing → recorded | ⏳ |
| 4 | CSV bulk, reminder sequences, templates, customers, metrics, trend chart | ⏳ |
| 5 | Stripe trial + subscription + Billing Portal + webhooks + gating | ⏳ |
| 6 | Polish, marketing landing page, deploy | ⏳ |

## Run locally

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # fill in as each phase's services come online
pnpm dev                     # http://localhost:3000
```

Other scripts:

```bash
pnpm build       # production build
pnpm start       # serve the production build
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
```

> Phase 1 needs no environment variables — the app shell runs as-is. Supabase,
> Resend, and Stripe keys are wired in from Phase 2 onward (see `.env.example`).

## Deploy (Vercel)

1. Import this repo into Vercel and set the **Root Directory** to `vouch/`.
2. Add the environment variables from `.env.example` (as each phase lands).
3. Every push to a branch gets a preview URL; production deploys from the
   default branch.

## Project structure

```
vouch/
├─ src/
│  ├─ app/
│  │  ├─ (app)/            # authenticated app shell + pages
│  │  │  ├─ dashboard/
│  │  │  ├─ requests/
│  │  │  ├─ customers/
│  │  │  ├─ templates/
│  │  │  ├─ settings/
│  │  │  └─ billing/
│  │  ├─ layout.tsx        # root layout + fonts
│  │  └─ globals.css       # design tokens
│  ├─ components/
│  │  ├─ ui/               # button, input, label, card, table, badge
│  │  └─ *.tsx             # app shell, sidebar, top bar, star meter, …
│  └─ lib/
├─ tailwind.config.ts      # design tokens mapped to Tailwind
└─ .env.example
```
