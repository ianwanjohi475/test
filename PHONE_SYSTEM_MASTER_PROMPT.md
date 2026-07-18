# MASTER BUILD PROMPT — "SimuPBX" Cloud Phone System

> Copy everything below this line and paste it to your AI builder (Claude Code, etc.).
> Fill in the few `<PLACEHOLDERS>` first. Build it in phases — tell the AI to
> complete Phase 1 fully before touching Phase 2.

---

## THE PROMPT

You are a senior VoIP/telephony engineer and full-stack architect. Build me a
complete, production-grade business phone system called **SimuPBX** — a modern
alternative to 3CX with full feature parity on the core PBX, plus unique
AI-powered and Africa-first features 3CX does not have. I am in **Kenya** and
will test live with my **+254 mobile number**.

Do not build a toy or a mockup. Every feature must actually work end-to-end
with real calls. Where a feature needs a paid provider account (SIP trunk,
DID number), stub it behind a clean config file and tell me exactly what to
buy and where to paste the credentials.

### 0. My context (fill these in)

- Test phone number: `+254 7XX XXX XXX` (Safaricom/Airtel)
- Voice provider for Kenyan numbers: **Africa's Talking** (primary) with the
  design abstracted so I can swap in Twilio or a raw SIP trunk later.
- Deployment target: a single Ubuntu 22.04+ VPS with Docker (4 GB RAM min).
- Budget mindset: cheap to run — one VPS + per-minute provider charges only.

### 1. Tech stack (use exactly this unless you have a strong reason)

- **Telephony engine:** FreeSWITCH (preferred) or Asterisk 20+, in Docker.
- **Call control / provider bridge:** Node.js (TypeScript) service using
  Africa's Talking Voice API callbacks + FreeSWITCH ESL for on-prem control.
- **Web app:** Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui.
- **Softphone:** browser WebRTC client using SIP.js over secure WebSocket
  (WSS) to FreeSWITCH — works on desktop and mobile browsers, no app install.
- **Database:** PostgreSQL 16 (users, CDRs, recordings metadata, contacts).
- **Cache/realtime:** Redis + WebSocket (or Supabase Realtime) for live
  wallboards and presence.
- **AI layer:** Anthropic Claude API for the AI receptionist, call summaries,
  and transcript intelligence; Whisper (self-hosted faster-whisper) or
  provider transcription for speech-to-text.
- **Infra:** Docker Compose for everything, Caddy or Traefik for automatic
  HTTPS, one `.env` file for all secrets, `make up` starts the whole stack.

### 2. Core PBX — full 3CX feature parity (Phase 1 & 2)

Build all of the following as real, working features:

1. **Extensions & users** — create/manage users, each gets an extension
   (100, 101…), SIP credentials, and a browser softphone login.
2. **Inbound calls** — my Kenyan DID rings a configurable destination:
   extension, ring group, queue, or IVR.
3. **Outbound calls** — from the web softphone to any Kenyan/international
   number through the provider, with per-user outbound permissions and a
   dialing rules table (least-cost routing ready).
4. **IVR / auto-attendant** — multi-level menus ("Press 1 for Sales…"),
   configurable in the web UI with drag-and-drop or a simple tree editor,
   custom greeting upload AND text-to-speech greeting generation.
5. **Ring groups** — ring-all, round-robin, and sequential strategies.
6. **Call queues** — hold music, queue position announcements, agent
   login/logout, wrap-up time, overflow rules, max-wait timeout actions.
7. **Call recording** — automatic and on-demand (press-to-record), stored as
   MP3 with retention policy, searchable and playable in the web UI, with a
   per-call legal notice option ("this call may be recorded" prompt).
8. **Voicemail** — per-extension boxes, custom greetings, voicemail-to-email
   with the audio attached, and message-waiting indicator in the softphone.
9. **Call handling** — blind transfer, attended transfer, hold with music,
   3-way conference, call parking (park/retrieve slots), call pickup.
10. **Conference rooms** — dial-in rooms with PINs, mute controls, and a web
    view of who's in the room.
11. **Presence / BLF** — see colleagues' live status (available, ringing,
    on a call, DND) in the web client.
12. **Business hours & holiday routing** — day/night modes, Kenyan public
    holidays preloaded, timezone Africa/Nairobi.
13. **CDR & reporting** — every call logged (direction, parties, duration,
    outcome, recording link, cost estimate); filterable history, CSV export,
    per-agent and per-queue stats, wallboard with live calls-waiting count.
14. **Multi-number support** — attach multiple DIDs (e.g. a Nairobi line and
    a Mombasa line) simultaneously, each with its own inbound route, and
    caller-ID selection per outbound call.
15. **Contacts/CRM-lite** — shared phonebook, caller-ID name lookup on ring,
    click-to-call from any contact, call notes attached to contacts.
16. **Admin console** — a single clean dashboard to manage all of the above:
    users, trunks, numbers, routes, queues, IVRs, recordings, reports, and
    live system health (registered extensions, active calls, trunk status).

### 3. Unique features — where SimuPBX beats 3CX (Phase 3)

These are my differentiators. Build them as first-class features:

1. **AI Receptionist ("Zuri")** — an LLM-powered virtual receptionist that
   ANSWERS calls in natural conversation (speech-to-text → Claude →
   text-to-speech), understands **English and Swahili**, can answer FAQs from
   a knowledge base I edit in the dashboard, take messages, and transfer to
   the right human by intent ("nataka kuongea na sales" → Sales queue).
2. **Live transcription & AI call summaries** — every recorded call gets a
   searchable transcript, a 3-bullet AI summary, action items, and a
   sentiment score, shown in the call detail page. Search across ALL past
   calls by what was said, not just who called.
3. **M-Pesa integration** — (unique to Kenya) an IVR payment flow: caller
   presses "pay", system triggers an M-Pesa STK push to their number via
   Daraja API, confirms payment on-call, and logs it against the contact.
4. **WhatsApp + SMS in the same inbox** — missed call → automatic WhatsApp/
   SMS follow-up ("Sorry we missed you, reply here or tap to call back");
   two-way SMS via Africa's Talking in a unified conversation view per
   contact alongside their call history.
5. **Smart callback queue** — instead of holding, callers press 1 to keep
   their place in line and get an automatic callback when an agent frees up.
6. **Spam/robocall shield** — unknown callers can be screened: AI asks who's
   calling and why, transcribes the answer, and rings the agent with a
   whisper announcement so they can accept or send to voicemail.
7. **Voicemail transcription + smart notify** — voicemails arrive as text in
   email/WhatsApp with urgency detection ("caller sounds like an existing
   customer with a billing complaint — high priority").
8. **AI agent assist (live)** — during a call, a side panel shows the live
   transcript plus AI suggestions (answers from the knowledge base, next-best
   action), visible only to the agent.
9. **Offline-resilience mode** — if the VPS or internet drops, inbound calls
   automatically fail over at the provider level to designated mobile numbers
   (my +254 number), so the business never goes dark.
10. **Personal call links** — every user gets a public `call.me/<name>` page
    where a visitor can call their extension from the browser for free
    (WebRTC), like a personal phone booth — no number needed.

### 4. Security & quality requirements (non-negotiable)

- All SIP over TLS + SRTP where the provider supports it; WSS only for the
  browser client; fail closed, never plaintext by default.
- Fail2ban-style protection on SIP registration attempts; strong random SIP
  passwords generated per extension; admin 2FA.
- Rate-limit and allowlist outbound international dialing (toll-fraud is the
  #1 way PBXes get robbed — protect me from this explicitly).
- Secrets only in `.env`, never committed. Provide `.env.example`.
- Recordings and transcripts access-controlled per role (admin/manager/agent).
- Everything reproducible: `git clone && cp .env.example .env && make up`
  brings the whole system to life.

### 5. Build order — work in phases, verify each before the next

- **Phase 1 (MVP, prove the pipes):** Docker stack up; one Kenyan DID from
  Africa's Talking answers with a TTS greeting; inbound call to my +254
  number rings the web softphone; outbound call from softphone to my +254
  number works; calls recorded and listed with playback in a minimal
  dashboard. ← STOP here and give me a live test script.
- **Phase 2 (3CX parity):** everything in section 2.
- **Phase 3 (differentiators):** section 3, in this order: transcripts &
  summaries → AI receptionist → missed-call WhatsApp/SMS → callback queue →
  M-Pesa → the rest.
- **Phase 4 (polish):** mobile-responsive softphone PWA (installable, push
  notifications for incoming calls), branding, onboarding wizard.

For every phase deliver: working code, a `TESTING.md` with exact steps I
follow with my real +254 phone, and a short demo checklist. If something
cannot work in this environment (needs the live VPS), say so explicitly and
give me the exact deploy + test commands instead of pretending.

### 6. What success looks like

I dial my SimuPBX number from my Safaricom line: Zuri answers in Swahili,
routes me to "Sales", my browser softphone rings with the caller's name and
an AI screening note, I answer, the live transcript scrolls beside the call,
I transfer it, hang up — and 30 seconds later the call appears in the
dashboard with recording, transcript, summary, and a WhatsApp follow-up
already queued. That is the bar. Build to that bar.

---

## END OF PROMPT

### Quick notes for you (not part of the prompt)

- **Buy first:** Africa's Talking account (voice number + SMS) — start in
  their sandbox for free; Daraja (Safaricom) sandbox for M-Pesa is also free.
- **VPS:** any 4 GB Ubuntu box (Contabo/Hetzner/DigitalOcean, ~$6–15/mo).
- **Legal:** using this for your own business is fine in Kenya; reselling
  phone service to others needs a Communications Authority licence.
- Give the AI ONE phase at a time. "Build Phase 1" → test with your phone →
  then "Build Phase 2". You'll get dramatically better results than asking
  for everything at once.
