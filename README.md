# ☁️📱 Cloud Phone

A **real Android phone running in Docker** that you use **in your web
browser** — real phone dimensions, install apps (Chrome, WhatsApp, games…),
and they stay installed and don't crash. Two ways to run it:

| | Where it runs | Android | App store | Screen |
|---|---|---|---|---|
| **Option A — your Windows PC** (`windows/`) | Docker + Ubuntu (WSL2) — your setup | Android 14 emulator, KVM-accelerated | Aurora Store (full Play catalog) + F-Droid | Samsung Galaxy S10 profile — real phone dimensions |
| **Option B — a Linux VPS** (root folder) | Any cheap cloud server | Android 13 (Redroid) | Real Google Play Store baked in | 720×1600 @ 320 dpi (real 20:9 phone panel) |

Ports used: **6080** (browser phone screen), **8000** (VPS browser screen),
**5557** (ADB). Ports 5555/5556 are deliberately **not** used since they're
often taken.

---

## 🅰️ Option A — Run on YOUR Windows PC (Docker + Ubuntu/WSL2)

### 1. Start it (one command — it configures Windows for you)

In your **Ubuntu (WSL2) terminal**:

```bash
git clone -b claude/cloud-phone-apps-hupje2 https://github.com/ianwanjohi475/test.git cloud-phone
cd cloud-phone
bash windows/quickstart.sh
```

`quickstart.sh` **writes `C:\Users\<You>\.wslconfig` for you** (turns on
nested virtualization and picks a RAM size that fits your PC), then boots the
phone. If Windows needs one WSL restart first, it prints the exact two
commands — run `wsl --shutdown` in PowerShell, reopen Ubuntu, run
`bash windows/quickstart.sh` again, and the second run boots the phone.

It also pre-checks Docker, `/dev/kvm`, and that ports 6080/5557 are free —
with the exact fix printed for anything that's missing. First run downloads
~1.5 GB and boots in 2–5 minutes.

*(Hardware note: "Virtualization" must show **Enabled** in Task Manager →
Performance → CPU. If it says Disabled, enable Intel VT-x / AMD SVM in your
BIOS — that's the only thing no script can do for you.)*

### 2. Use it

Three screens, one phone — use any or all at the same time:

- **In the browser**: **http://localhost:6080** → the phone, Galaxy S10
  shape, click = touch, type with your keyboard.
- **Hardware look 📱**: **http://localhost:6081** → the live screen inside a
  realistic device body (bezel, punch-hole camera, side buttons) on a dark
  backdrop — press F11 and it looks like a physical phone on your monitor.
- **As a desktop window** (scrcpy — smoothest, real H.264 video up to
  60 fps): `bash windows/phone-window.sh` opens the bare phone screen
  **borderless** on your desktop, like the device's own display floating
  there. Prefer a normal window? `PLAIN=1 bash windows/phone-window.sh`.
- **Install apps — the "Play Store" of this phone is Aurora Store** (installed
  automatically by setup): open Aurora Store on the phone → *Anonymous* login
  (or your Google account) → search and install anything from the Google Play
  catalog: Chrome, WhatsApp, YouTube updates, games. F-Droid is included too.
  *Why not the actual Play Store app? This emulator image ships Google APIs
  but not the Play Store package; Aurora Store talks to the same Play servers
  and serves the identical catalog — that's the reliable way here. The VPS
  stack (Option B) has the real Play Store app.*
- **Sideload any APK**: `bash scripts/install-apk.sh app.apk`
- **Storage**: 8 GB app partition (configured in `windows/docker-compose.yml`,
  `EMULATOR_DATA_PARTITION` — the docker-android default is a uselessly small
  550 MB). Raise it if you install lots of big games.
- **Camera**: works — back camera shows an explorable 3D virtual scene, front
  camera an emulated video feed, so camera apps, QR scanners, and video calls
  function instead of crashing. (A *real* webcam passthrough is not possible
  on the stock WSL2 kernel; that limitation is Windows', not this project's.)
- Apps/data persist across restarts (`docker compose restart` / reboot).

---

## 🅱️ Option B — Run on a Linux VPS (phone in the cloud 24/7)

Use this when you want the phone reachable from anywhere, always on.
You need a VPS (Ubuntu 22.04/24.04 or Debian 12, x86_64, ~4 vCPU / 8 GB —
Hetzner ~€7/mo, Contabo, DigitalOcean…). Then:

```bash
git clone https://github.com/ianwanjohi475/test.git cloud-phone
cd cloud-phone
sudo bash setup-host.sh
```

This builds a Redroid Android 13 image with the **real Google Play Store**
and **libndk ARM translation** baked in, and streams it to your browser at
**http://YOUR_SERVER_IP:8000** (ws-scrcpy → add device `cloudphone`, port
`5555`; from your PC ADB is `YOUR_SERVER_IP:5557`).

First steps: sign into the Play Store; if it says *"device not certified"*,
run `bash scripts/certify-play.sh` (one-time, ~5 min). Then install Chrome
and anything else normally.

> ⚠️ Option B needs the Android *binder* kernel module, which standard cloud
> VPS kernels have but the stock WSL2 kernel does **not** — that's exactly
> why Option A exists for your Windows machine.

---

## Why apps won't crash — what's handled for you

| Usual crash cause | How this project handles it |
|---|---|
| No hardware acceleration → laggy, ANRs | KVM acceleration (A) / native container (B) |
| Not enough RAM → Android kills apps | 10 GB WSL memory hint (A), 6 GB container reservation (B), 2 GB shm |
| ARM-only apps on x86 → instant crash | Android 14 x86_64+ARM images (A), libndk translation (B) |
| Apps needing Google services crash | Aurora Store + microG-free anonymous installs (A), full GApps (B) |
| Data wiped on restart → broken apps | Persistent volumes in both stacks, `restart: unless-stopped` |
| Wrong screen size → broken layouts | Real phone profiles: Galaxy S10 (A), 720×1600/320dpi 20:9 (B) |
| Port conflicts on your PC | Everything moved off 5555/5556; setup script pre-checks ports |

If something still crashes: `docker logs cloudphone` shows why — 9 times out
of 10 it's RAM (close other things or raise the memory limits).

## Everyday commands

```bash
docker compose ps           # is the phone up?
docker compose restart      # reboot the phone
docker compose down         # power off (data kept)
docker compose logs -f      # watch what Android is doing
```

## Security (Option B / anything internet-facing)

- Never expose port 5557 (ADB) to the internet — firewall it
  (`ufw allow from YOUR_IP to any port 8000; ufw deny 5557; ufw enable`)
  or use an SSH tunnel: `ssh -L 8000:localhost:8000 user@server`.
- On Windows (Option A) everything binds to localhost, so you're fine.

## Multiple phones

Duplicate the `cloudphone` service with a new name, its own volume, and
different host ports (e.g. `6081:6080`, `5558:5555`) — each copy is an
independent phone.
