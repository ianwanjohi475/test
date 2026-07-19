# 📞 SimuPBX — Your Business Phone, Reimagined

A modern, AI-powered cloud phone system built for Kenya (and anywhere else).
3CX-class PBX features plus things 3CX doesn't have: **Zuri**, an AI
receptionist that answers in English *and* Swahili, **M-Pesa payments on the
IVR**, missed-call **WhatsApp/SMS follow-ups**, AI **call transcripts +
summaries**, and a browser softphone with a mobile-app-grade UI.

| Layer | Tech |
|---|---|
| Telephony engine | FreeSWITCH (Docker) + Africa's Talking Voice API |
| Call control / API | Node.js 22 · TypeScript · Fastify · FreeSWITCH ESL |
| Web app + softphone | Next.js 15 · Tailwind · SIP.js over WSS · PWA |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude (Zuri, summaries, urgency) |
| Edge | Caddy (automatic HTTPS) |

## Features

**Core PBX (3CX parity)** — extensions & users, inbound/outbound calls, IVR
auto-attendant, ring groups & call queues, automatic MP3 call recording with
legal notice, voicemail (+ transcription), blind/attended transfer, hold,
3-way conference, call parking, conference rooms with PINs, live presence,
business hours (Africa/Nairobi, Kenyan holidays), CDR + reports + wallboard,
multi-number support, contacts/CRM-lite, toll-fraud protection.

**SimuPBX exclusives** — Zuri AI receptionist (EN/SW, intent routing,
knowledge base), live transcription + AI summaries + sentiment +
search-by-what-was-said, M-Pesa STK push on-call (Daraja), unified SMS/WhatsApp
inbox with missed-call auto-follow-up, smart callback queue, AI spam screening
with whisper announce, voicemail urgency detection, live agent-assist panel,
offline failover to mobile, personal `call.me/<name>` browser-call links.

## Run it on YOUR desktop first (live, real time)

```bash
cd simupbx && bash run-desktop.sh        # or:  bash run-desktop.sh --app  (native window)
```

Calls ring your softphone, transcripts stream live, missed calls drop follow-ups
into the inbox — the real engine, no telco account needed. Full guide:
**[DESKTOP.md](./DESKTOP.md)**.

## Quick start (Ubuntu 22.04+ VPS, 4 GB RAM)

```bash
git clone <this repo> && cd simupbx
cp .env.example .env        # fill in: domain, passwords, provider keys
make up                     # builds + starts postgres, freeswitch, api, web, caddy
```

Then open `https://<your-domain>` and sign in with the admin credentials from
`.env`. See **[TESTING.md](./TESTING.md)** for the step-by-step live test with
your +254 number.

## Accounts you need (all have free sandboxes)

1. **Africa's Talking** — Kenyan voice number + SMS: https://africastalking.com
2. **Safaricom Daraja** — M-Pesa STK push: https://developer.safaricom.co.ke
3. **Anthropic** — Claude API key for Zuri + summaries: https://platform.claude.com
4. *(Optional)* A SIP trunk (Telnyx / DIDWW / Safaricom) for raw SIP inbound/outbound.

## Architecture

```
Caller (+254...) ──► Africa's Talking ──► /webhooks/at/voice  ──► IVR / Zuri AI
                                              │                        │
Browser softphone ──WSS──► FreeSWITCH ◄──ESL──┤   Claude ◄─────────────┘
      ▲                        │              │
      └── Next.js dashboard ◄──┴── Fastify API ──► PostgreSQL
                                     │
                     Daraja (M-Pesa) ┴ SMS/WhatsApp follow-ups
```

- **Web app** (`web/`) — the dashboard + softphone. Mobile-first (bottom tab
  bar), desktop sidebar, installable as a PWA.
- **API** (`api/`) — auth, CDR, contacts, inbox, Zuri knowledge base, provider
  webhooks (AT voice XML, Daraja callbacks), FreeSWITCH directory via
  `mod_xml_curl` (extensions live in Postgres), realtime WebSocket.
- **FreeSWITCH** (`freeswitch/`) — SIP registration (incl. WSS for browsers),
  internal dialing, recording, parking, conferencing, trunk gateway.

## Security defaults

- International dialing **blocked** unless allow-listed (`ALLOW_INTERNATIONAL`).
- 24-char random SIP passwords per extension; never reused.
- WSS-only browser signaling; Caddy terminates TLS with auto-renewed certs.
- Recordings/transcripts behind role-based auth (admin/manager/agent).
- Secrets only in `.env` (git-ignored); `.env.example` documents every key.

## Legal (Kenya)

Recording: play the legal notice (on by default in Settings). Running this PBX
for your own business is fine; *reselling* phone service requires a
Communications Authority licence. M-Pesa collection requires your own
Paybill/Till via Daraja.
