#!/usr/bin/env bash
#
# Open the cloud phone in its OWN WINDOW on your desktop (scrcpy) —
# an alternative to the browser at http://localhost:6080. You can use both
# at the same time. Run inside your Ubuntu (WSL2) terminal:
#
#   bash windows/phone-window.sh
#
set -euo pipefail

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  cat >&2 <<'EOF'
!! No graphical display available in WSL (WSLg missing).
   Fix: in PowerShell run  wsl --update  then  wsl --shutdown , reopen
   Ubuntu and try again. (WSLg comes with Windows 11 / updated Windows 10.)

   Or use scrcpy natively on Windows instead:
     1. Download https://github.com/Genymobile/scrcpy/releases (scrcpy-win64 zip)
     2. Unzip, open a terminal in that folder, run:
          adb connect localhost:5557
          scrcpy -s localhost:5557
EOF
  exit 1
fi

if ! command -v scrcpy >/dev/null || ! command -v adb >/dev/null; then
  echo "==> Installing scrcpy + adb (one time)"
  sudo apt-get update -qq && sudo apt-get install -y -qq scrcpy adb
fi

# ---- connect via the emulator's OWN adb server (inside the container) ----
# Connecting host-adb to a forwarded emulator port fails when the host adb
# (v41) and emulator adb (v39) versions differ (device shows offline/empty).
# Instead we point scrcpy at the adb SERVER that already runs inside the
# container: same version as the emulator, and the phone is already a known
# online device there. No version mismatch, no flaky handshake.

if ! docker ps --format '{{.Names}}' | grep -qx cloudphone; then
  echo "!! The phone container isn't running. Start it first:" >&2
  echo "     cd windows && docker compose up -d" >&2
  exit 1
fi

echo "==> Starting the phone's adb server (inside the container)..."
# (Re)start the container's adb server listening on all interfaces so your PC
# can reach it via the forwarded 127.0.0.1:5037. Serves localhost too, so the
# container's own tooling keeps working.
docker exec cloudphone adb kill-server >/dev/null 2>&1 || true
docker exec -d cloudphone adb -a nodaemon server >/dev/null 2>&1 || true

# From now on, host adb + scrcpy talk to THAT server, not a local one.
export ADB_SERVER_SOCKET=tcp:localhost:5037

echo "==> Waiting for the phone to come online..."
serial=""
for i in $(seq 1 40); do
  # first online/device-state entry from the container's adb server
  serial=$(adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}')
  if [[ -n "$serial" ]]; then break; fi
  echo "    still booting... ($i/40)"
  sleep 3
done

if [[ -z "$serial" ]]; then
  cat >&2 <<'EOF'
!! Couldn't reach the phone after ~2 minutes. It may still be booting, or
   the adb-server port (5037) isn't published yet. Fix:

     cd windows && docker compose up -d     # applies the new 5037 mapping
     docker restart cloudphone              # wait ~40s for it to boot
     bash windows/phone-window.sh           # try again
EOF
  exit 1
fi
echo "    Phone is online as '$serial' ✅"

# Borderless = no window frame, just the phone screen floating on your
# desktop like a real device. (Run with  PLAIN=1 bash phone-window.sh
# if you prefer a normal window with title bar.)
extra=(--window-borderless)
[[ -n "${PLAIN:-}" ]] && extra=()

exec scrcpy -s "$serial" \
  --window-title "Cloud Phone" \
  --stay-awake --no-audio --max-fps 60 \
  "${extra[@]}"