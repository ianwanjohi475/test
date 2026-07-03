#!/usr/bin/env bash
#
# Cloud Phone — Windows setup. Run this INSIDE your Ubuntu (WSL2) terminal:
#
#   cd cloud-phone/windows
#   bash setup-windows.sh
#
# When it finishes, open  http://localhost:6080  in your Windows browser.
#
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

echo "==> [1/4] Checking Docker"
if ! docker info >/dev/null 2>&1; then
  echo "!! Docker isn't reachable from this terminal." >&2
  echo "   - If you use Docker Desktop: open Docker Desktop on Windows, then" >&2
  echo "     Settings > Resources > WSL Integration > enable your Ubuntu distro." >&2
  echo "   - If Docker is installed inside Ubuntu:  sudo service docker start" >&2
  exit 1
fi

echo "==> [2/4] Checking virtualization (/dev/kvm)"
if [[ ! -e /dev/kvm ]]; then
  cat >&2 <<'EOF'
!! /dev/kvm is missing — the phone needs hardware virtualization to run
!! smoothly. Fix (takes 2 minutes):

   1. On Windows, create/edit the file:   C:\Users\<YourName>\.wslconfig
      with this content:

         [wsl2]
         nestedVirtualization=true

   2. In PowerShell run:   wsl --shutdown
   3. Reopen this Ubuntu terminal and run this script again.

   (Needs Windows 11, or a recent Windows 10 build. Also make sure
   "Virtualization" shows Enabled in Task Manager > Performance > CPU;
   if not, enable Intel VT-x / AMD SVM in your BIOS.)
EOF
  exit 1
fi
echo "    /dev/kvm found — hardware acceleration OK"

echo "==> [3/4] Checking ports 6080 and 5557 are free"
for p in 6080 5557; do
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$"; then
    echo "!! Port $p is already in use." >&2
    echo "   Either stop whatever uses it, or edit windows/docker-compose.yml" >&2
    echo "   and change \"$p:...\" to another free port, then re-run." >&2
    exit 1
  fi
done
echo "    Ports are free"

echo "==> [4/4] Downloading the phone image (~3 GB)"
if docker image inspect budtmo/docker-android:emulator_14.0 >/dev/null 2>&1; then
  echo "    Image already downloaded — skipping."
elif ! docker compose pull; then
  cat <<'EOF'
    ------------------------------------------------------------------
    Your connection dropped mid-download. Plain `docker pull` restarts
    unfinished pieces from ZERO, so on an unstable line the big 1.9 GB
    piece can loop forever. Switching to the RESUMABLE downloader:
    it continues each piece from the exact byte where it stopped, so
    drops only cost seconds. Progress survives reboots too.
    ------------------------------------------------------------------
EOF
  bash robust-pull.sh
fi

echo "==> Starting the phone"
docker compose up -d

echo
echo "Waiting for Android to boot — first boot takes 2-5 minutes..."
for i in $(seq 1 60); do
  if docker exec cloudphone sh -c 'adb shell getprop sys.boot_completed 2>/dev/null' 2>/dev/null | grep -q 1; then
    booted=1; break
  fi
  sleep 10
done

echo "==> Installing app stores (Aurora Store = full Play catalog) if missing"
if docker exec cloudphone adb shell pm list packages 2>/dev/null | grep -q com.aurora.store; then
  echo "    Already installed."
elif ! bash ../scripts/install-appstore.sh; then
  echo "    (Couldn't install right now — run later:  bash scripts/install-appstore.sh)"
fi

cat <<'EOF'

==========================================================
  📱 Your cloud phone is ready!

  In your browser:        http://localhost:6080
  As a desktop window:    bash windows/phone-window.sh   (scrcpy)
  (both work at the same time)

  Install apps: open "Aurora Store" on the phone -> Anonymous
  login -> search anything from the Play catalog.
  Sideload any APK:  bash scripts/install-apk.sh some-app.apk

  Camera works (virtual scene / test video) in camera apps.

  Phone survives restarts:  docker compose restart cloudphone
  Power off (keeps data):   docker compose down
==========================================================
EOF
