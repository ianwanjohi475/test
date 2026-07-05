#!/usr/bin/env bash
#
# Push your own images/videos onto the cloud phone so any Android app OR any
# website's "choose photo/video" picker on the phone can select them.
#
#   bash scripts/upload-media.sh selfie.jpg clip.mp4
#   bash scripts/upload-media.sh ~/persona/*        # a whole folder of media
#
# Files land in /sdcard/Pictures/Persona and are indexed into the gallery, so
# they show up wherever the phone lets you attach a photo or video.
# Works with both the Windows (docker-android) and VPS (redroid) stacks.
set -euo pipefail

[ "$#" -ge 1 ] || { echo "usage: upload-media.sh <image-or-video> [more...]"; exit 1; }

DEST="/sdcard/Pictures/Persona"

# Decide once how we reach the phone (same three cases as install-apk.sh).
if docker exec cloudphone which adb >/dev/null 2>&1; then
  MODE=adb            # Windows/docker-android: adb lives inside the container
elif docker exec cloudphone sh -c 'command -v am' >/dev/null 2>&1; then
  MODE=native         # redroid: the container IS Android
else
  adb connect localhost:5557 >/dev/null
  MODE=hostadb        # plain adb over the remapped host port
fi

phone_sh() {  # run a shell command line on the phone
  case "$MODE" in
    adb)     docker exec cloudphone adb shell "$*" ;;
    native)  docker exec cloudphone sh -c "$*" ;;
    hostadb) adb -s localhost:5557 shell "$*" ;;
  esac
}

push_file() {  # push_file <local> <remote-on-phone>
  local src="$1" dst="$2"
  case "$MODE" in
    adb)
      docker cp "$src" cloudphone:/tmp/_persona_push
      docker exec cloudphone adb push /tmp/_persona_push "$dst" >/dev/null
      docker exec cloudphone rm -f /tmp/_persona_push
      ;;
    native)
      # /sdcard is /data/media/0 inside the redroid container filesystem.
      docker cp "$src" cloudphone:"/data/media/0/${dst#/sdcard/}"
      ;;
    hostadb)
      adb -s localhost:5557 push "$src" "$dst" >/dev/null
      ;;
  esac
}

phone_sh "mkdir -p $DEST"

count=0
for f in "$@"; do
  if [ ! -f "$f" ]; then
    echo "skip (not a file): $f"
    continue
  fi
  base=$(basename "$f")
  remote="$DEST/$base"
  echo "==> $base"
  push_file "$f" "$remote"
  # Ask Android's media scanner to index this file so galleries/pickers see it.
  phone_sh "am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file://$remote" >/dev/null 2>&1 || true
  count=$((count + 1))
done

# Belt and braces: rescan the folder in case per-file scans were ignored.
phone_sh "am broadcast -a android.intent.action.MEDIA_MOUNTED -d file://$DEST" >/dev/null 2>&1 || true

echo
echo "Done — added $count file(s) to the phone's 'Persona' album."
echo "On the phone they now appear in Gallery/Photos and in any app or website"
echo "upload picker (\"choose photo/video\")."
