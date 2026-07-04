#!/usr/bin/env bash
#
# Fix "SIGILL in libndk_translation" crashes: install an app's 32-bit ARM
# (armeabi-v7a) build instead of the arm64 one Aurora Store always picks.
#
# WHY: this phone is x86_64. ARM-only apps run through the emulator's ARM
# translator, and its 64-bit half is incomplete — modern arm64 instructions
# (used by ML/camera libs, e.g. in identity apps) kill the app with SIGILL
# at launch. The 32-bit translation path is older and far more complete,
# so the armeabi-v7a build of the same app usually just works.
#
#   bash windows/install-32bit.sh com.withpersona.app.reusablepersonas
#   bash windows/install-32bit.sh <package> <file.xapk-or-apk>   (offline: use a
#       file you downloaded yourself from apkcombo.com / apkpure.net)
#
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")"

[[ $# -ge 1 ]] || { echo "Usage: bash windows/install-32bit.sh <package> [file.xapk|file.apk]"; exit 1; }
pkg=$1
srcfile="${2:-}"

command -v adb   >/dev/null || { echo "!! adb missing:  sudo apt install -y adb"; exit 1; }
command -v unzip >/dev/null || { echo "==> Installing unzip (one time)"; sudo apt-get install -y -qq unzip; }

export ADB_SERVER_SOCKET=tcp:localhost:5038
serial=$(adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}' || true)
if [[ -z "$serial" ]]; then
  echo "!! The phone isn't reachable. Is it running and booted?" >&2
  echo "     cd windows && docker compose up -d     (then wait ~1 min)" >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ---- get the app package (with ALL architecture variants inside) ----------
if [[ -z "$srcfile" ]]; then
  # apkeep (by the EFF) downloads Play-catalog apps from the APKPure mirror,
  # including every split — so the armeabi_v7a piece Aurora never gives us.
  APKEEP="$HOME/.cloudphone-tools/apkeep"
  if ! command -v apkeep >/dev/null && [[ ! -x "$APKEEP" ]]; then
    echo "==> Downloading the apkeep fetch tool (one time)..."
    mkdir -p "$(dirname "$APKEEP")"
    curl -fL --retry 3 -o "$APKEEP" \
      https://github.com/EFForg/apkeep/releases/latest/download/apkeep-x86_64-unknown-linux-gnu \
      || curl -fL --retry 3 -o "$APKEEP" \
      https://github.com/EFForg/apkeep/releases/latest/download/apkeep-x86_64-unknown-linux-musl \
      || { echo "!! Couldn't download apkeep. Download the app yourself instead:" >&2
           echo "     1. On Windows, get the XAPK from https://apkcombo.com or https://apkpure.net" >&2
           echo "        (search: $pkg — choose armeabi-v7a if asked)" >&2
           echo "     2. bash windows/install-32bit.sh $pkg /mnt/c/Users/<You>/Downloads/<file>.xapk" >&2
           exit 1; }
    chmod +x "$APKEEP"
  fi
  command -v apkeep >/dev/null && APKEEP=apkeep
  echo "==> Downloading $pkg from the APKPure mirror (all variants)..."
  if ! "$APKEEP" -a "$pkg" -d apk-pure "$TMP"; then
    echo "!! Download failed (mirror busy or app not there). Manual route:" >&2
    echo "     1. On Windows, get the XAPK from https://apkcombo.com or https://apkpure.net" >&2
    echo "     2. bash windows/install-32bit.sh $pkg /mnt/c/Users/<You>/Downloads/<file>.xapk" >&2
    exit 1
  fi
  srcfile=$(ls "$TMP"/*.xapk "$TMP"/*.apk 2>/dev/null | head -1)
  [[ -n "$srcfile" ]] || { echo "!! Download produced no file — re-run in a minute." >&2; exit 1; }
else
  [[ -f "$srcfile" ]] || { echo "!! File not found: $srcfile" >&2; exit 1; }
fi
echo "    Got: $(basename "$srcfile")"

# ---- pick the 32-bit pieces ------------------------------------------------
apks=()
case "${srcfile,,}" in
  *.xapk|*.zip)
    unzip -q -o "$srcfile" -d "$TMP/x" || { echo "!! Couldn't unpack $srcfile" >&2; exit 1; }
    # base + every config split EXCEPT other architectures
    while IFS= read -r f; do apks+=("$f"); done < <(
      find "$TMP/x" -name '*.apk' \
        ! -iname '*arm64*' ! -iname '*x86*' ! -iname '*mips*')
    if ! printf '%s\n' "${apks[@]}" | grep -qi 'armeabi\|v7a'; then
      # no explicit v7a split: fine only if the base apk has the libs itself
      echo "    (no armeabi-v7a split found — trying the base APK directly)"
    fi
    ;;
  *.apk)
    apks=("$srcfile")
    ;;
  *) echo "!! Unsupported file type: $srcfile (need .apk or .xapk)" >&2; exit 1 ;;
esac
[[ ${#apks[@]} -gt 0 ]] || { echo "!! No installable APKs found inside $srcfile" >&2; exit 1; }
echo "==> Installing ${#apks[@]} piece(s) as 32-bit ARM:"
printf '      %s\n' "${apks[@]##*/}"

# ---- replace the broken arm64 install with the 32-bit one ------------------
if adb -s "$serial" shell pm list packages 2>/dev/null | grep -q "^package:$pkg$"; then
  echo "==> Removing the crashing arm64 install first..."
  adb -s "$serial" uninstall "$pkg" >/dev/null 2>&1 || true
fi
# --abi pins the app to the 32-bit ARM translator even if other libs exist
if ! adb -s "$serial" install-multiple --abi armeabi-v7a "${apks[@]}"; then
  echo "!! Install failed — see adb's message above." >&2
  echo "   If it says INSTALL_FAILED_NO_MATCHING_ABIS, this app has no 32-bit" >&2
  echo "   build after all; see the fallbacks printed by app-crash.sh." >&2
  exit 1
fi

# ---- moment of truth: launch it and watch for a crash ----------------------
echo "==> Installed. Launching and watching for a crash (12s)..."
adb -s "$serial" logcat -b crash -c 2>/dev/null
adb -s "$serial" shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 12
alive=$(adb -s "$serial" shell pidof "$pkg" 2>/dev/null | tr -d '\r')
crash=$(adb -s "$serial" logcat -b crash -d 2>/dev/null | tr -d '\r')

if [[ -n "$alive" && -z "$crash" ]]; then
  echo
  echo "✅ The app is running (pid $alive) with no crash — check the phone window!"
elif [[ -n "$crash" ]]; then
  echo
  echo "!! Still crashing — the 32-bit path didn't save it. Last resort options:"
  echo "   - the app's own website flow in the phone's browser (identity apps"
  echo "     like Persona fully support the browser flow)"
  echo "   - a newer Android image translates more instructions: in"
  echo "     windows/docker-compose.yml switch emulator_11.0 -> emulator_13.0,"
  echo "     then  bash windows/factory-reset.sh  (heavier, but its arm64"
  echo "     translator is much newer)"
  echo
  echo "$crash" | tail -n 25
else
  echo
  echo "?? No crash captured but the app isn't running either — it closed itself."
  echo "   That's the app's own emulator/integrity check, not a crash: use its"
  echo "   website flow in the phone's browser instead."
fi
