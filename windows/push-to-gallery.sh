#!/usr/bin/env bash
#
# Put photos / videos / files INTO the phone, so any app or browser can
# pick them via "upload from gallery" / "choose file" (they land in the
# phone's Download folder and are registered with the gallery).
#
#   bash windows/push-to-gallery.sh photo.jpg video.mp4 doc.pdf ...
#
# Tip: Windows files are reachable from Ubuntu as /mnt/c/..., e.g.
#   bash windows/push-to-gallery.sh "/mnt/c/Users/You/Pictures/photo.jpg"
#
set -euo pipefail

[[ $# -ge 1 ]] || { echo "Usage: bash windows/push-to-gallery.sh <file> [more files...]"; exit 1; }

command -v adb >/dev/null || { echo "!! adb missing:  sudo apt install -y adb"; exit 1; }

# talk to the phone through the container's adb server (same as phone-window.sh)
export ADB_SERVER_SOCKET=tcp:localhost:5038
serial=$(adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}' || true)
if [[ -z "$serial" ]]; then
  echo "!! The phone isn't reachable. Is it running and booted?" >&2
  echo "     cd windows && docker compose up -d     (then wait ~1 min)" >&2
  exit 1
fi

pushed=0
for f in "$@"; do
  if [[ ! -f "$f" ]]; then
    echo "!! Not found, skipping: $f" >&2
    continue
  fi
  name=$(basename "$f")
  adb -s "$serial" push "$f" "/sdcard/Download/$name" >/dev/null
  # let the gallery/media indexer know immediately
  adb -s "$serial" shell am broadcast \
    -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
    -d "file:///sdcard/Download/$name" >/dev/null 2>&1 || true
  echo "    ✅ $name  ->  phone's Download folder"
  pushed=$((pushed + 1))
done

[[ $pushed -gt 0 ]] || exit 1
echo
echo "Done. In any app/browser: 'Upload' -> 'Files' or 'Gallery' -> Downloads."
