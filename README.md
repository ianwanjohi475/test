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

### 1. One-time Windows prep (2 minutes)

The phone needs hardware virtualization inside WSL2. On Windows:

1. Create/edit the file `C:\Users\<YourName>\.wslconfig` with:

   ```ini
   [wsl2]
   nestedVirtualization=true
   memory=10GB
   ```

2. In PowerShell: `wsl --shutdown`, then reopen your Ubuntu terminal.

*(Needs Windows 11 or a recent Windows 10 build, and "Virtualization:
Enabled" in Task Manager → Performance → CPU. If it says Disabled, turn on
Intel VT-x / AMD SVM in your BIOS.)*

### 2. Start the phone

In your **Ubuntu (WSL2) terminal**:

```bash
git clone https://github.com/ianwanjohi475/test.git cloud-phone
cd cloud-phone/windows
bash setup-windows.sh
```

The script checks Docker, checks `/dev/kvm`, checks that ports 6080/5557 are
free (and tells you exactly what to do if not), then boots the phone.
First run downloads ~1.5 GB and boots in 2–5 minutes.

### 3. Use it

- Open **http://localhost:6080** in your Windows browser → there's your
  phone, Galaxy S10 shape, click = touch, type with your keyboard.
- Install app stores: `bash ../scripts/install-appstore.sh` — this puts
  **Aurora Store** (the whole Google Play catalog, anonymous login works,
  no Google account needed) and **F-Droid** on the phone.
- Sideload any APK: `bash ../scripts/install-apk.sh app.apk`
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
