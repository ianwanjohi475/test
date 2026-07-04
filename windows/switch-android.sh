#!/usr/bin/env bash
#
# Switch the phone to another Android version. Newer Android ships a much
# newer ARM->x86 translator, which fixes apps whose native code crashes
# inside libndk_translation on Android 11 (SIGILL / SIGSEGV right at
# launch — ML-heavy apps like identity wallets).
#
#   bash windows/switch-android.sh 13     (newer translator, still quick)
#   bash windows/switch-android.sh 11     (back to the light default)
#
# The phone's data is tied to its Android version, so switching WIPES
# apps & data (same as factory-reset.sh). Downloaded images are kept,
# so switching back later costs no re-download.
#
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

ver="${1:-13}"
case "$ver" in
  11|12|13|14) ;;
  *) echo "Usage: bash windows/switch-android.sh 11|12|13|14"; exit 1 ;;
esac
tag="emulator_${ver}.0"

current=$(grep -oE 'budtmo/docker-android:emulator_[0-9.]+' docker-compose.yml | head -1)
if [[ "$current" == "budtmo/docker-android:$tag" ]]; then
  echo "Already on Android $ver ($current) — nothing to do."
  echo "If the phone is misbehaving, try:  bash windows/factory-reset.sh"
  exit 0
fi

echo "!! Switching from $current to Android $ver wipes the phone's apps &"
echo "   data (data written by one Android version can't boot another)."
read -r -p "   Type yes to continue: " answer
[[ "$answer" == "yes" ]] || { echo "Aborted."; exit 1; }

sed -i -E "s|(budtmo/docker-android:)emulator_[0-9.]+|\1$tag|" docker-compose.yml
# newer Android needs more RAM to boot without ANRs; 11/12 stay light
mem=2560; [[ "$ver" -ge 13 ]] && mem=3584
sed -i -E "s|-memory [0-9]+|-memory $mem|" docker-compose.yml
echo "==> docker-compose.yml: image $tag, phone RAM ${mem} MB"

echo "==> Stopping the phone and wiping its old-version data..."
docker compose down -v

if ! docker image inspect "budtmo/docker-android:$tag" >/dev/null 2>&1; then
  echo "==> Downloading the Android $ver image (~3 GB, one time)..."
  if ! docker compose pull; then
    echo "    Connection dropped — switching to the resumable downloader..."
    TAG="$tag" bash robust-pull.sh
  fi
fi

echo "==> Booting Android $ver (first boot takes 2-5 minutes)..."
docker compose up -d

cat <<EOF

Done. Android $ver is booting — watch it at http://localhost:6080

Next:
  bash windows/phone-window.sh      (waits for the full boot and
                                     reinstalls Aurora Store automatically)
then install your app from Aurora Store again. If it STILL crashes:
  bash windows/app-crash.sh <app name>
EOF
