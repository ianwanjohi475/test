#!/usr/bin/env bash
#
# Installs app stores on the cloud phone:
#   - F-Droid      (open-source apps)
#   - Aurora Store (the full Google Play catalog: Chrome, WhatsApp, games...
#                   sign in anonymously — no Google account needed)
#
# Works with the Windows stack (docker-android) and the VPS stack (redroid).
# Usage:  bash scripts/install-appstore.sh
set -euo pipefail

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "==> Downloading F-Droid..."
curl -fSL -o "$TMP/fdroid.apk" https://f-droid.org/F-Droid.apk

echo "==> Downloading Aurora Store..."
CODE=$(curl -fsSL https://f-droid.org/api/v1/packages/com.aurora.store \
       | grep -o '"suggestedVersionCode":[0-9]*' | grep -o '[0-9]*' | head -1)
curl -fSL -o "$TMP/aurora.apk" "https://f-droid.org/repo/com.aurora.store_${CODE}.apk"

install_one() {  # install_one <apk-path>
  local apk="$1" name; name=$(basename "$apk")
  # Path 1 (preferred): the container's own adb SERVER on host port 5038 —
  # the same one phone-window.sh uses, where the phone is a known-online
  # device. Works even when the container's default adb has no device.
  if command -v adb >/dev/null 2>&1 \
     && ADB_SERVER_SOCKET=tcp:localhost:5038 adb devices 2>/dev/null | awk '$2=="device"{f=1} END{exit !f}'; then
    local s; s=$(ADB_SERVER_SOCKET=tcp:localhost:5038 adb devices | awk '$2=="device"{print $1; exit}')
    ADB_SERVER_SOCKET=tcp:localhost:5038 adb -s "$s" install -r "$apk"
  # Path 2: Windows stack — run adb inside the docker-android container
  elif docker exec cloudphone which adb >/dev/null 2>&1; then
    docker cp "$apk" cloudphone:/tmp/"$name"
    docker exec cloudphone adb install -r /tmp/"$name"
  # Path 3: VPS/redroid stack — the container IS Android, use pm directly
  elif docker exec cloudphone sh -c 'command -v pm' >/dev/null 2>&1; then
    docker cp "$apk" cloudphone:/data/local/tmp/"$name"
    docker exec cloudphone sh -c "pm install -r /data/local/tmp/$name && rm /data/local/tmp/$name"
  # Path 4: plain adb over the remapped port
  else
    adb connect localhost:5557 >/dev/null
    adb -s localhost:5557 install -r "$apk"
  fi
}

echo "==> Installing F-Droid..."
install_one "$TMP/fdroid.apk"
echo "==> Installing Aurora Store..."
install_one "$TMP/aurora.apk"

cat <<'EOF'

Done! On the phone (http://localhost:6080):
  1. Open "Aurora Store" from the app drawer.
  2. Choose "Anonymous" login (or your Google account).
  3. Search & install anything from the Play catalog — Chrome, WhatsApp, etc.
EOF
