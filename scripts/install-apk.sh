#!/usr/bin/env bash
# Sideload an APK onto the cloud phone:  bash scripts/install-apk.sh app.apk
# Works with both the Windows (docker-android) and VPS (redroid) stacks.
set -euo pipefail
APK="${1:?usage: install-apk.sh <file.apk>}"
NAME=$(basename "$APK")

if docker exec cloudphone which adb >/dev/null 2>&1; then
  docker cp "$APK" cloudphone:/tmp/"$NAME"
  docker exec cloudphone adb install -r /tmp/"$NAME"
elif docker exec cloudphone sh -c 'command -v pm' >/dev/null 2>&1; then
  docker cp "$APK" cloudphone:/data/local/tmp/"$NAME"
  docker exec cloudphone sh -c "pm install -r /data/local/tmp/$NAME && rm /data/local/tmp/$NAME"
else
  adb connect localhost:5557 >/dev/null
  adb -s localhost:5557 install -r "$APK"
fi
echo "Installed: $NAME"
