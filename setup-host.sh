#!/usr/bin/env bash
#
# Cloud Phone — one-shot host setup.
#
# Run this ON YOUR SERVER (Ubuntu 22.04/24.04 or Debian 12, x86_64) as root:
#
#   git clone <this repo> cloud-phone && cd cloud-phone
#   sudo bash setup-host.sh
#
# When it finishes, open  http://YOUR_SERVER_IP:8000  in a browser.
#
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root:  sudo bash setup-host.sh" >&2
  exit 1
fi

echo "==> [1/5] Installing Docker + tools"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
apt-get update -qq
apt-get install -y -qq python3 python3-pip git adb linux-modules-extra-"$(uname -r)" || true

echo "==> [2/5] Loading Android binder kernel modules"
# Redroid needs the Android binder driver. Most stock Ubuntu/Debian kernels
# ship it as the loadable module 'binder_linux'.
if ! modprobe binder_linux devices="binder,hwbinder,vndbinder" 2>/dev/null; then
  if [[ -d /dev/binderfs ]] || grep -q binder /proc/filesystems 2>/dev/null; then
    echo "    binder is built into this kernel — OK"
  else
    echo "!! This kernel has no Android binder support." >&2
    echo "!! On Ubuntu:  apt install linux-modules-extra-\$(uname -r)  then reboot and re-run." >&2
    exit 1
  fi
fi
# Load on every boot
cat > /etc/modules-load.d/cloudphone.conf <<'EOF'
binder_linux
EOF
cat > /etc/modprobe.d/cloudphone.conf <<'EOF'
options binder_linux devices=binder,hwbinder,vndbinder
EOF

echo "==> [3/5] Building the Android image (Play Store + ARM app support baked in)"
# redroid-script patches the stock Redroid image with:
#   - OpenGApps  -> Google Play Store / Play Services
#   - libndk     -> runs ARM-only apps (WhatsApp, Instagram, most games)
if [[ ! -d /opt/redroid-script ]]; then
  git clone --depth 1 https://github.com/ayasa520/redroid-script.git /opt/redroid-script
fi
cd /opt/redroid-script
pip3 install -r requirements.txt --quiet --break-system-packages 2>/dev/null \
  || pip3 install -r requirements.txt --quiet
python3 redroid.py -a 13.0.0 -gc -n   # -gc = Google apps (core), -n = libndk ARM translation
# The script produces an image tagged like redroid/redroid:13.0.0_gapps_ndk
BUILT_IMAGE=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -m1 '^redroid/redroid:13.0.0.*gapps' || true)
if [[ -z "$BUILT_IMAGE" ]]; then
  echo "!! Image build failed — check the redroid-script output above." >&2
  exit 1
fi
docker tag "$BUILT_IMAGE" cloudphone:13.0.0-gapps
echo "    Built and tagged: cloudphone:13.0.0-gapps"

echo "==> [4/5] Starting the cloud phone"
cd "$(dirname "$(readlink -f "$0")")"
mkdir -p data
docker compose up -d

echo "==> [5/5] Waiting for Android to boot (first boot takes 1–3 minutes)..."
sleep 20
for i in $(seq 1 30); do
  if adb connect localhost:5555 >/dev/null 2>&1 && \
     [[ "$(adb -s localhost:5555 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    echo "    Android is up!"
    break
  fi
  sleep 10
done

IP=$(hostname -I | awk '{print $1}')
cat <<EOF

==========================================================
  Your cloud phone is ready.

  Browser control :  http://$IP:8000
     -> in ws-scrcpy, add device:  host "cloudphone" (or $IP), port 5555
  ADB             :  adb connect $IP:5555

  First steps on the phone:
    1. Open Play Store and sign in with a Google account.
    2. If Play Store says "device not certified", run:
         bash scripts/certify-play.sh
       and follow the printed instructions (takes ~5 min).
    3. Install Chrome & friends from the Play Store —
       or sideload:  bash scripts/install-apk.sh some-app.apk
==========================================================
EOF
