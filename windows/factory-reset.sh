#!/usr/bin/env bash
#
# Cloud Phone — FACTORY RESET. Use when the phone no longer boots (the
# 'device' service crashes at start): wipes the phone's stored data —
# installed apps, settings, Android system state — and boots it fresh,
# exactly like the very first run. The downloaded image is kept, so no
# re-download.
#
#   bash windows/factory-reset.sh
#
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

echo "!! This wipes the phone's apps & data (like a real factory reset)."
read -r -p "   Type yes to continue: " answer
[[ "$answer" == "yes" ]] || { echo "Aborted."; exit 1; }

echo "==> Stopping the phone and deleting its data volume..."
docker compose down -v

echo "==> Booting a fresh phone (first boot takes 2-5 minutes)..."
docker compose up -d

echo
echo "Done. Watch it boot:   http://localhost:6080"
echo "Desktop window:        bash windows/phone-window.sh"
