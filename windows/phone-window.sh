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

adb connect localhost:5557 >/dev/null

# Borderless = no window frame, just the phone screen floating on your
# desktop like a real device. (Run with  PLAIN=1 bash phone-window.sh
# if you prefer a normal window with title bar.)
extra=(--window-borderless)
[[ -n "${PLAIN:-}" ]] && extra=()

exec scrcpy -s localhost:5557 \
  --window-title "Cloud Phone" \
  --stay-awake --no-audio --max-fps 60 \
  "${extra[@]}"