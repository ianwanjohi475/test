#!/usr/bin/env bash
# Fix "Device is not certified by Google" in the Play Store.
#
# Google requires unofficial devices to be registered once. This prints your
# phone's GSF (Google Services Framework) ID and tells you where to paste it.
set -euo pipefail
adb connect localhost:5557 >/dev/null

GSF_HEX=$(adb -s localhost:5557 shell 'sqlite3 /data/data/com.google.android.gsf/databases/gservices.db \
  "select value from main where name = \"android_id\";"' 2>/dev/null | tr -d '\r')

if [[ -z "$GSF_HEX" ]]; then
  echo "Could not read the GSF ID yet. Open the Play Store once (let it error), then re-run." >&2
  exit 1
fi

echo
echo "Your GSF ID (decimal): $GSF_HEX"
echo
echo "1. Go to  https://www.google.com/android/uncertified/"
echo "2. Sign in with the same Google account you use on the phone."
echo "3. Paste the ID above and click Register."
echo "4. Wait ~5-10 minutes, then on the phone:"
echo "     Settings > Apps > Google Play Store > Storage > Clear data"
echo "   and reopen the Play Store. Certification warning is gone."
