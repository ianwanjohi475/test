# ☁️📱 Cloud Phone

A **real Android 13 phone running in the cloud** that you control from any web
browser. Install apps from the **Google Play Store** (Chrome, WhatsApp,
Instagram, games…), and they keep running and stay installed — it behaves like
a physical phone, not a throwaway emulator.

Under the hood:

| Piece | What it does |
|---|---|
| [Redroid](https://github.com/remote-android/redroid-doc) | Full Android 13 in a Docker container — real Android, no VM/KVM needed |
| [redroid-script](https://github.com/ayasa520/redroid-script) | Bakes **Play Store / Google services** and **ARM app translation (libndk)** into the image |
| [ws-scrcpy](https://github.com/NetrisTV/ws-scrcpy) | Streams the screen to your browser with touch + keyboard, low latency |

## What you need

- A Linux server (VPS) — Ubuntu 22.04/24.04 or Debian 12, **x86_64**
- Recommended: **4 vCPU / 8 GB RAM / 40 GB disk** (2 vCPU / 4 GB works, but
  8 GB is what keeps heavy apps from being killed — this is the #1 "apps
  crash" cause on small servers)
- Any cheap provider works: Hetzner (~€7/mo), Contabo, DigitalOcean, OVH…
  ⚠️ The server must allow loading kernel modules — normal VPSes (KVM-based)
  do; cheap *container*-based VPSes (OpenVZ/LXC) do not.

## Quick start (one command)

SSH into your server, then:

```bash
git clone https://github.com/ianwanjohi475/test.git cloud-phone
cd cloud-phone
sudo bash setup-host.sh
```

The script installs Docker, enables the Android kernel driver, builds the
Android image with Play Store + ARM support (takes ~10 min the first time),
and boots the phone.

Then open **`http://YOUR_SERVER_IP:8000`** in a browser, add the device
(host `cloudphone`, port `5555`), and click its screen. You now have a phone.

## First steps on your new phone

1. **Sign in**: open the Play Store app and log in with a Google account.
2. **Certify the device** (one-time): if Play Store complains
   *"device is not certified"*, run `bash scripts/certify-play.sh` and follow
   the printed steps (register the ID at google.com/android/uncertified).
3. **Install apps**: Chrome, YouTube, WhatsApp — straight from the Play Store.
   ARM-only apps work thanks to the built-in libndk translation layer.
4. **Sideload APKs** (optional): `bash scripts/install-apk.sh app.apk`

Everything is stored in `./data/` on the server, so **apps, logins and files
survive restarts and server reboots** (`restart: unless-stopped` brings the
phone back up automatically).

## Keeping apps from crashing — the checklist

Crashes on cloud phones almost always come down to one of these:

| Cause | Fix (already handled here) |
|---|---|
| Not enough RAM → Android kills apps | Compose file reserves **6 GB** for the phone; use an 8 GB server |
| ARM-only app on x86 → instant crash | Image is built with **libndk** ARM translation |
| No Google services → apps that need Play Services crash | Image is built **with GApps** |
| Data wiped on restart → "corrupted" apps | Persistent `./data` volume |
| Too-high resolution → GPU/CPU overload | Sensible default: 720×1520 @ 30 fps (change in `docker-compose.yml`) |

If a specific app still misbehaves, check `docker logs cloudphone` and try
`androidboot.redroid_gpu_mode=guest` ↔ `host` (host = faster if your server
has a GPU, see below).

## Tuning

Edit `docker-compose.yml`:

- **Resolution / DPI / FPS** — `redroid_width`, `redroid_height`,
  `redroid_dpi`, `redroid_fps`. Lower = smoother on small servers.
- **GPU acceleration** — if the server has an Intel/AMD GPU, set
  `androidboot.redroid_gpu_mode=host` and add
  `devices: [/dev/dri:/dev/dri]` to the `cloudphone` service. Big speed-up
  for games and video.
- **Memory limit** — raise `memory: 6g` if you have more RAM.

## Security — do this before real use

The defaults are open for easy first-run. For anything real:

1. **Firewall**: allow port 8000 only from your own IP
   (`ufw allow from YOUR_HOME_IP to any port 8000; ufw deny 5555; ufw enable`).
   Port 5555 is unauthenticated ADB — never leave it open to the internet.
2. Better: keep both ports closed and reach them through an SSH tunnel:
   `ssh -L 8000:localhost:8000 user@server`, then browse `http://localhost:8000`.
3. Or put ws-scrcpy behind a reverse proxy (Caddy/nginx) with HTTPS + basic auth.

## Managing the phone

```bash
docker compose ps            # status
docker compose logs -f       # watch Android logs
docker compose restart       # reboot the phone
docker compose down          # power off (data is kept)
rm -rf data && docker compose up -d   # factory reset
```

## Multiple phones

Duplicate the `cloudphone` service in `docker-compose.yml` with a different
name, volume (`./data2:/data`) and ADB port (`5556:5555`) — each one is an
independent phone, all visible in the same ws-scrcpy browser page.
