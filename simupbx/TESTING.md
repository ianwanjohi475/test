# TESTING.md — Live test script with your +254 number

Work through these in order. Each phase proves one layer of the system.

## Phase 0 — Prerequisites (15 min)

1. A VPS (Ubuntu 22.04+, 4 GB RAM) with ports 80, 443, 5060/udp, 7443, and
   16384–32768/udp (RTP) open.
2. A domain with two A records → your VPS IP: `pbx.yourdomain` and
   `sip.pbx.yourdomain`.
3. Africa's Talking account: create a **sandbox app**, note the API key.
   In the sandbox, use their simulator; for real +254 calls, buy a voice
   number (KES ~1,000/mo) and set its **callback URL** to
   `https://pbx.yourdomain/webhooks/at/voice`.
4. `cp .env.example .env`, fill everything in, then `make up`.

## Phase 1 — Dashboard & softphone register (5 min)

- [ ] Open `https://pbx.yourdomain` → login page loads with valid HTTPS.
- [ ] Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- [ ] Phone tab shows **“Ext 100 · Registered”** (green pill). If it shows
      demo mode, check `SIP_WSS_URL` and that `sip.` DNS resolves.
- [ ] Settings → add a second user (ext 101). Open an incognito window, log
      in as them — presence for both should show in Team.

## Phase 2 — Internal calls + recording (5 min)

- [ ] From ext 100's softphone dial `101` → the other browser rings.
- [ ] Answer, talk, hold/resume, then hang up.
- [ ] Calls tab → the internal call appears with duration.
- [ ] Recording player streams the MP3.

## Phase 3 — Real inbound from your Safaricom/Airtel phone (10 min)

- [ ] Dial your Africa's Talking number from your +254 phone.
- [ ] You hear the greeting; press **1** for Sales.
- [ ] Your browser softphone rings — answer and confirm two-way audio.
- [ ] Hang up. The call appears in Calls with the recording.
- [ ] Call again and don't answer → within a minute your phone receives the
      **missed-call SMS follow-up**.
- [ ] Press **9** on the IVR, leave a voicemail → it appears in Voicemail
      with an AI urgency badge (transcript requires the STT hook or provider
      transcription enabled).

## Phase 4 — Outbound to your +254 number (5 min)

- [ ] In Contacts, add yourself with your real number.
- [ ] Click the call button → your softphone rings first, then your mobile
      rings; answer both, confirm audio.
- [ ] Try an international number (e.g. +44…) → blocked with the toll-fraud
      message. Flip `ALLOW_INTERNATIONAL=true` only if you need it.

## Phase 5 — M-Pesa on the IVR (10 min, Daraja sandbox)

- [ ] Call in, press **3** (Lipa na M-Pesa), key in `100#`.
- [ ] Sandbox: Daraja simulator confirms the STK push; the payment row flips
      to **paid** in the dashboard and the receipt SMS goes out.
- [ ] Production: your phone shows the real STK prompt for KES 100.

## Phase 6 — Zuri AI (5 min)

- [ ] Zuri tab → add a knowledge-base answer, e.g. “What are your opening
      hours?”.
- [ ] Test console: ask it in English, then in Swahili (“Mko wapi?”) —
      grounded answers both times, and “nataka kuongea na sales” should route
      to Sales.
- [ ] With `ANTHROPIC_API_KEY` set, calls answered by Zuri get transcripts,
      summaries, and sentiment on the call detail page.

## What can't be tested without a paid account

| Feature | Needs |
|---|---|
| Real +254 inbound/outbound | AT voice number (paid) — sandbox uses simulator |
| WhatsApp follow-ups | WhatsApp Business API sender (AT or Meta BSP) |
| Live speech conversation with Zuri | STT hook (faster-whisper container or provider streaming STT) |
| Production M-Pesa | Daraja go-live (own Paybill/Till) |

## When something fails

- `make logs` — all services.
- `docker compose exec freeswitch fs_cli -x "sofia status"` — trunk + WSS state.
- `curl -s localhost:4000/health` — API + ESL connectivity.
- AT dashboard → Voice → Logs shows every webhook request/response.
