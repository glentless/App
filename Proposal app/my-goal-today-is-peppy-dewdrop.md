# Proposal Generation Platform — Implementation Plan

## Context
Build a full-stack proposal platform inspired by PandaDoc. The user provides a proven proposal template; Claude (AI) fills it intelligently from a structured form. Generated proposals are hosted as public URLs the user can send to clients for review, e-signature, and payment. Single-user (one account), deployed to Vercel.

---

## Stack Decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Static + dynamic pages, API routes, edge-ready |
| Hosting | Vercel | Zero-config Next.js deploys |
| Database + Auth | **Supabase** (PostgreSQL + Auth + Storage) | One service for DB, auth, and file storage; generous free tier; built-in row-level security |
| UI | Tailwind CSS + shadcn/ui | Fast, professional, accessible components |
| AI generation | Claude API (`claude-sonnet-4-6`) | User's template → structured proposal JSON |
| Payments | PayPal JS SDK + PayPal Orders REST API | User's preference; abstract layer for future Stripe swap |
| Email | **Resend** | Best Vercel/Next.js integration; React email templates |
| PDF export | `@react-pdf/renderer` | Server-side, no browser binary needed — Vercel-compatible |
| Validation | Zod + React Hook Form | Type-safe forms and API payloads |

**Why Supabase over alternatives:**
- Firebase: NoSQL is awkward for relational proposal/payment/analytics data
- PlanetScale: MySQL, no built-in auth or file storage
- Supabase: PostgreSQL + row-level security + built-in Auth + Storage in one dashboard, perfect for single-developer projects

---

## Database Schema

```sql
-- Proposals (core entity)
CREATE TABLE proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token  TEXT UNIQUE NOT NULL,          -- URL-safe token for /p/[token]
  title         TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  client_email  TEXT NOT NULL,
  client_company TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft|sent|viewed|signed|paid
  content       JSONB NOT NULL DEFAULT '{}',   -- AI-generated structured sections
  form_inputs   JSONB NOT NULL DEFAULT '{}',   -- raw form data for regeneration
  total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  signed_at     TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ
);

-- E-signatures
CREATE TABLE signatures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  signer_name    TEXT NOT NULL,
  signer_email   TEXT NOT NULL,
  signature_data TEXT NOT NULL,  -- base64 PNG from canvas
  ip_address     TEXT,
  user_agent     TEXT,
  signed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id      UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  paypal_order_id  TEXT,
  paypal_capture_id TEXT,
  amount           NUMERIC(10,2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  status           TEXT NOT NULL DEFAULT 'pending', -- pending|completed|failed
  metadata         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

-- Analytics events
CREATE TABLE proposal_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,  -- opened|section_viewed|signed|paid
  section_id   TEXT,
  ip_address   TEXT,
  user_agent   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   └── proposals/
│   │       ├── new/page.tsx          ← multi-step creation form
│   │       └── [id]/page.tsx         ← detail: preview, analytics, actions
│   ├── p/
│   │   └── [token]/
│   │       ├── page.tsx              ← public proposal page
│   │       ├── sign/page.tsx         ← signature step
│   │       └── pay/page.tsx          ← PayPal payment step
│   └── api/
│       ├── proposals/
│       │   ├── route.ts              ← GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts          ← GET, PATCH, DELETE
│       │       ├── generate/route.ts ← POST: call Claude, update content
│       │       ├── send/route.ts     ← POST: email client link
│       │       └── pdf/route.ts      ← GET: stream PDF
│       └── p/[token]/
│           ├── event/route.ts        ← POST: track analytics event
│           ├── sign/route.ts         ← POST: save signature
│           └── pay/
│               ├── create/route.ts   ← POST: create PayPal order
│               └── capture/route.ts  ← POST: capture PayPal payment
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 ← browser client
│   │   └── server.ts                 ← server client (cookies)
│   ├── ai/
│   │   ├── generate-proposal.ts      ← Claude API call
│   │   └── template.ts               ← THE USER'S TEMPLATE (prompt + structure)
│   ├── paypal/
│   │   └── client.ts                 ← PayPal Orders API helpers
│   ├── email/
│   │   ├── resend.ts
│   │   └── templates/                ← React Email templates
│   └── pdf/
│       └── generate.ts               ← @react-pdf/renderer
└── components/
    ├── dashboard/
    ├── proposals/
    │   ├── creation-form/            ← multi-step form steps
    │   └── detail/
    ├── public-proposal/              ← client-facing page components
    │   ├── ProposalContent.tsx
    │   ├── SignatureSection.tsx
    │   └── PaymentSection.tsx
    └── ui/                           ← shadcn/ui components
```

---

## Key Flows

### 1. Proposal Creation (multi-step form → AI generation)
1. **Step 1 — Client Info:** name, company, email
2. **Step 2 — Project Details:** scope description, deliverables (list), timeline, special notes
3. **Step 3 — Pricing:** line items (description + amount each), total auto-calculated
4. **Step 4 — Generate:** POST `/api/proposals/[id]/generate`
   - Sends form inputs + user's template to Claude
   - Claude returns structured JSON: `{ sections: [{ id, title, content }] }`
   - Stored in `proposals.content`
5. **Step 5 — Review:** rendered preview of generated content; option to regenerate or accept → status becomes `draft`

### 2. Send to Client
- Dashboard action: "Send Proposal"
- POST `/api/proposals/[id]/send`: sends Resend email to client with `/p/[token]` URL
- Updates `proposals.status = 'sent'`, `sent_at = NOW()`
- You receive a confirmation email

### 3. Client Views Proposal (`/p/[token]`)
- No gate — immediate access
- First load: POST `/api/p/[token]/event` with `event_type='opened'`; sets `first_viewed_at`, status → `viewed`
- Intersection Observer on each section → fires `section_viewed` events
- You receive email notification on first open

### 4. Client Signs
- Client clicks "Sign Proposal" → canvas signature pad + name/email + legal checkbox
- POST `/api/p/[token]/sign` → saves to `signatures`, sets `signed_at`, status → `signed`
- You receive email notification with signer name/email
- Page advances to payment step

### 5. Client Pays (PayPal)
- `/p/[token]/pay` renders PayPal SDK buttons
- "Create Order" → POST `/api/p/[token]/pay/create` → PayPal Orders API → returns `orderID`
- PayPal handles UI; on approval → POST `/api/p/[token]/pay/capture` → captures payment
- Saves to `payments` table, updates `paid_at`, status → `paid`
- You + client receive payment confirmation emails

### 6. PDF Export
- Dashboard "Download PDF" → GET `/api/proposals/[id]/pdf`
- Server renders proposal content with `@react-pdf/renderer`
- Streams back as `application/pdf`

---

## AI Template Integration

`src/lib/ai/template.ts` exports:
- The system prompt explaining the proposal format
- The user's actual template (added once user provides it)
- A `buildPrompt(formInputs)` function that composes the final Claude prompt
- Expected output schema (Zod) for Claude's JSON response

Claude is instructed to return structured JSON matching the schema, never raw HTML. The public proposal page renders each section with rich typography.

---

## Dashboard Features

- **KPI cards:** Total proposals, Total revenue collected, Awaiting signature, Awaiting payment
- **Proposal table:** Client name | Title | Amount | Status badge | Created | Actions
- **Status badges:** Draft (gray) → Sent (blue) → Viewed (yellow) → Signed (orange) → Paid (green)
- **Actions per row:** View, Copy link, Send email, Download PDF, Delete
- **Proposal detail page:** Full analytics panel (view count, time on page, section breakdown), proposal preview, and status timeline

---

## Implementation Order

1. **Project scaffold** — `create-next-app`, Tailwind, shadcn/ui, TypeScript strict
2. **Supabase setup** — project creation, schema migration, env vars
3. **Auth** — Supabase Auth email/password, middleware protecting `/dashboard` and `/proposals/*`
4. **Dashboard shell** — layout, proposal list table (empty state)
5. **Proposal creation form** — multi-step, Zod validation, saves draft to DB
6. **AI generation** — Claude API integration, template file (placeholder until user provides theirs), generation API route
7. **Public proposal page** — beautiful client-facing layout, content rendering, analytics tracking
8. **E-signature** — canvas pad, API route, status update
9. **PayPal integration** — SDK, create/capture routes, status update
10. **Email notifications** — Resend setup, React Email templates (sent, viewed, signed, paid)
11. **PDF export** — `@react-pdf/renderer` API route
12. **Polish** — loading states, error handling, empty states, mobile responsiveness

---

## Prerequisites Before Starting

**The user needs to provide:**
- Their proposal template (can be markdown, Word doc, or paste as text) — I'll adapt it into `src/lib/ai/template.ts`

**Accounts to create (all have free tiers):**
- [Supabase](https://supabase.com) — database + auth
- [Resend](https://resend.com) — email (verify your domain or use their test sender)
- [PayPal Developer](https://developer.paypal.com) — sandbox + live API credentials
- Anthropic API key (for Claude generation)

---

## Verification Plan

| Feature | How to test |
|---|---|
| Auth | Login/logout cycle; unauthenticated access to `/dashboard` redirects to `/login` |
| Proposal creation | Create proposal → verify row appears in Supabase dashboard |
| AI generation | Submit form → proposal content renders with correct client/project details |
| Public page | Open `/p/[token]` in incognito → analytics event appears in DB |
| E-signature | Sign → `signatures` row created; proposal status → `signed` |
| PayPal | Use PayPal sandbox credentials → complete test payment → status → `paid` |
| Email | Resend dashboard shows sent emails for each event |
| PDF | Download from dashboard → PDF opens correctly |
