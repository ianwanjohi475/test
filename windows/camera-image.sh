#!/usr/bin/env bash
#
# Make the phone's CAMERA LIVE FEED show your own image — a photo, a QR
# code, a document... Works in ANY app that opens the camera (WhatsApp,
# browser camera, scanner apps): the image is placed inside the emulator's
# virtual camera scene itself, so every app sees it in the viewfinder.
#
#   bash windows/camera-image.sh path/to/image.png     (or .jpg)
#   bash windows/camera-image.sh --reset               (normal scene again)
#
# Tip: a Windows file is reachable from Ubuntu as /mnt/c/..., e.g.
#   bash windows/camera-image.sh "/mnt/c/Users/You/Pictures/qr.png"
#
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

if [[ $# -ne 1 ]]; then
  echo "Usage: bash windows/camera-image.sh <image.png|image.jpg>  |  --reset"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx cloudphone; then
  echo "!! The phone container isn't running. Start it first:" >&2
  echo "     cd windows && docker compose up -d" >&2
  exit 1
fi

# the camera scene config shipped inside the emulator
posters=$(docker exec cloudphone sh -c 'find /opt /home/androidusr /usr/local -name "Toren1BD.posters" 2>/dev/null | head -1' || true)
if [[ -z "$posters" ]]; then
  echo "!! Couldn't find the camera scene config (Toren1BD.posters) in the container." >&2
  exit 1
fi
resdir=$(dirname "$posters")

if [[ "$1" == "--reset" ]]; then
  docker exec -u root cloudphone sh -c \
    "sed -i '/^poster custom/,/^default custom-poster.png/d' '$posters'; rm -f '$resdir/custom-poster.png'"
  echo "==> Camera restored to the normal virtual scene."
else
  img=$1
  [[ -f "$img" ]] || { echo "!! File not found: $img" >&2; exit 1; }
  case "${img,,}" in
    *.png|*.jpg|*.jpeg) ;;
    *) echo "!! Use a PNG or JPG image." >&2; exit 1 ;;
  esac
  docker cp "$img" cloudphone:"$resdir/custom-poster.png"
  docker exec -u root cloudphone chmod 644 "$resdir/custom-poster.png"
  # place the image right in front of the camera's starting viewpoint
  if ! docker exec cloudphone grep -q '^poster custom' "$posters"; then
    docker exec -u root cloudphone sh -c \
      "printf '\nposter custom\nsize 1.9 1.4\nposition 0 0.4 -1.2\nrotation 0 0 0\ndefault custom-poster.png\n' >> '$posters'"
  fi
  echo "==> The camera live feed will now show: $img"
fi

echo "==> Rebooting the phone to apply (your apps & data are kept)..."
docker restart cloudphone >/dev/null
echo "Done. Give it ~1 min to boot, then:  bash windows/phone-window.sh"
