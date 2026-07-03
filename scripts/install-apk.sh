#!/usr/bin/env bash
# Sideload an APK onto the cloud phone:  bash scripts/install-apk.sh app.apk
set -euo pipefail
APK="${1:?usage: install-apk.sh <file.apk>}"
adb connect localhost:5555 >/dev/null
adb -s localhost:5555 install -r "$APK"
echo "Installed: $APK"
