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

# ---- get a stable, ONLINE adb connection -------------------------------
# "state=offline" happens when the emulator's adb (v39) and your adb (v41)
# disagree and the device needs a moment to re-authorize. The fix is to use
# ONE adb (the container's own, so versions always match) and wait until the
# device reports "device", not "offline".
echo "==> Connecting to the phone..."
adb kill-server >/dev/null 2>&1 || true
adb start-server >/dev/null 2>&1 || true

online=""
for i in $(seq 1 30); do
  adb disconnect localhost:5557 >/dev/null 2>&1 || true
  adb connect localhost:5557 >/dev/null 2>&1 || true
  state=$(adb -s localhost:5557 get-state 2>/dev/null | tr -d '\r' || true)
  if [[ "$state" == "device" ]]; then online=1; break; fi
  # nudge the emulator's adbd from inside the container (fixes offline state)
  docker exec cloudphone adb devices >/dev/null 2>&1 || true
  echo "    device is '$state' — waiting for it to come online ($i/30)..."
  sleep 3
done

if [[ -z "$online" ]]; then
  cat >&2 <<'EOF'
!! The phone is still 'offline' after 90s. Usually it just hasn't finished
   booting, or the emulator's adb got wedged. Fix it with:

     docker restart cloudphone      # wait ~40s for it to boot
     bash windows/phone-window.sh   # then try again

   If it keeps happening, run this once (matches adb versions):
     docker exec cloudphone adb kill-server
EOF
  exit 1
fi
echo "    Phone is online ✅"

# Borderless = no window frame, just the phone screen floating on your
# desktop like a real device. (Run with  PLAIN=1 bash phone-window.sh
# if you prefer a normal window with title bar.)
extra=(--window-borderless)
[[ -n "${PLAIN:-}" ]] && extra=()

exec scrcpy -s localhost:5557 \
  --window-title "Cloud Phone" \
  --stay-awake --no-audio --max-fps 60 \
  "${extra[@]}"