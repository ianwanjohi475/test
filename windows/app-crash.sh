#!/usr/bin/env bash
#
# Find out WHY an app crashes on the cloud phone — and what fixes it.
# Launches the app, captures the real crash from the phone's log, matches
# it against the failure modes of this emulator, and prints the fix.
#
#   bash windows/app-crash.sh persona          (any part of the app's name)
#   bash windows/app-crash.sh com.withpersona.app.reusablepersonas
#
# Run inside your Ubuntu (WSL2) terminal while the phone is running.
#
set -uo pipefail   # no -e: we want to reach the diagnosis even if steps fail
cd "$(dirname "$(readlink -f "$0")")"

[[ $# -eq 1 ]] || { echo "Usage: bash windows/app-crash.sh <app name or package>"; exit 1; }
query=$1

command -v adb >/dev/null || { echo "!! adb missing:  sudo apt install -y adb"; exit 1; }

# talk to the phone through the container's adb server (same as phone-window.sh)
export ADB_SERVER_SOCKET=tcp:localhost:5038
serial=$(adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}' || true)
if [[ -z "$serial" ]]; then
  echo "!! The phone isn't reachable. Is it running and booted?" >&2
  echo "     cd windows && docker compose up -d     (then wait ~1 min)" >&2
  exit 1
fi
phone() { adb -s "$serial" shell "$@" 2>/dev/null | tr -d '\r'; }

# ---- find the app ----------------------------------------------------------
pkg=$(phone pm list packages | sed 's/^package://' | grep -i -- "$query" | head -1)
if [[ -z "$pkg" ]]; then
  echo "!! No installed app matches '$query'. Installed apps containing 'wallet'/'persona':"
  phone pm list packages | sed 's/^package:/   /' | grep -Ei 'wallet|persona' || echo "   (none)"
  echo "   Install it first (Aurora Store on the phone), then re-run."
  exit 1
fi
echo "==> App: $pkg"

# ---- what did Aurora actually install? -------------------------------------
abi=$(phone dumpsys package "$pkg" | grep -m1 primaryCpuAbi | sed 's/.*=//')
splits=$(phone dumpsys package "$pkg" | grep -m1 'splits=' | sed 's/.*splits=//')
device_abis=$(phone getprop ro.product.cpu.abilist)
bridge=$(phone getprop ro.dalvik.vm.native.bridge)
echo "    app native code : ${abi:-none (pure Java — good, runs anywhere)}"
echo "    app splits      : ${splits:-none}"
echo "    phone supports  : $device_abis"
echo "    ARM translation : ${bridge:-none}"

# ---- launch it and catch the crash red-handed ------------------------------
echo "==> Launching the app and watching for a crash (10s)..."
adb -s "$serial" logcat -c 2>/dev/null
adb -s "$serial" logcat -b crash -c 2>/dev/null
phone monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 10
alive=$(phone pidof "$pkg")
crash=$(adb -s "$serial" logcat -b crash -d 2>/dev/null | tr -d '\r')
[[ -n "$crash" ]] || crash=$(adb -s "$serial" logcat -d -s AndroidRuntime:E ActivityManager:E 2>/dev/null | tr -d '\r')

if [[ -n "$alive" && -z "$crash" ]]; then
  echo "    ✅ The app is running (pid $alive) and nothing crashed."
  echo "    If its window closes by itself with NO crash below, see cause 4."
fi

echo
echo "======== crash log (this is the real reason) ========"
if [[ -n "$crash" ]]; then echo "$crash" | tail -n 60; else echo "(no crash captured)"; fi
echo "======================================================"
echo

# ---- match the crash to this stack's known failure modes -------------------
diagnosed=0
if echo "$crash" | grep -qE 'libndk_translation|SIGILL|signal 4'; then
  diagnosed=1
  if [[ "${abi:-}" == arm64* ]]; then
    cat <<EOF
DIAGNOSIS 0 — the ARM translator can't run this app's 64-bit native code.
  The app is ARM-only and this phone is x86_64, so its native code runs
  through the emulator's ARM translator — which hit a modern arm64
  instruction it doesn't know. Common with apps that do on-device ML
  (camera/ID scanning).
  FIX (try in order):
    1. the 32-bit ARM build — a different, more complete translation path:
         bash windows/install-32bit.sh $pkg
    2. a newer Android with a newer translator:
         bash windows/switch-android.sh 13
EOF
  else
    cat <<EOF
DIAGNOSIS 0 — this Android version's ARM translator can't run this app
  at all (its 32-bit path failed too). The translator is part of the
  Android image, so the fix is a newer Android with a newer translator:
      bash windows/switch-android.sh 13
  (wipes apps/data — it prints exactly what happens and asks first)
  then reinstall the app from Aurora Store and re-run this script.
EOF
  fi
fi
if echo "$crash" | grep -qE 'UnsatisfiedLinkError|dlopen failed|couldn.t find "lib|\.so" not found'; then
  diagnosed=1
  cat <<'EOF'
DIAGNOSIS 1 — wrong-architecture native code (the usual one).
  The app ships ARM-only native libraries; this phone is x86_64. Aurora
  Store sometimes downloads the ARM split because of its device spoof.
  FIX: on the phone open Aurora Store > Settings > Installation >
       untick any device/ABI spoof, then uninstall the app and reinstall.
       If "ARM translation" above says "0" or empty, this image can't run
       ARM-only apps at all — use the VPS stack (Option B), which has
       libndk translation baked in.
EOF
fi
if echo "$crash" | grep -qE 'Resources\$NotFoundException|ClassNotFoundException|Didn.t find class|split.*not.*install|MissingSplit'; then
  diagnosed=1
  cat <<'EOF'
DIAGNOSIS 2 — incomplete install (missing split APKs).
  Modern apps come in several pieces; one download piece was skipped or
  dropped. "app splits: none" above on an app that needs them = this.
  FIX: uninstall on the phone, reopen Aurora Store and reinstall in one
       go on a stable connection.
EOF
fi
if echo "$crash" | grep -qiE 'GooglePlayServices|GmsClient|SecurityException.*(gms|auth)|DEVELOPER_ERROR|API_UNAVAILABLE'; then
  diagnosed=1
  cat <<'EOF'
DIAGNOSIS 3 — Google Play Services gap.
  This image has Google APIs but is an uncertified device; identity apps
  lean hard on Play Services and some calls fail here.
  FIX: on the phone: Settings > Apps > Google Play services > Storage >
       Clear cache, reboot the phone (docker compose restart), retry.
       If it persists this app needs a certified device — VPS stack after
       running scripts/certify-play.sh is the better home for it.
EOF
fi
if echo "$crash" | grep -qE 'OutOfMemoryError|lowmemorykiller'; then
  diagnosed=1
  cat <<'EOF'
DIAGNOSIS 4 — out of memory.
  FIX: raise "-memory 2560" in windows/docker-compose.yml (e.g. 3584),
       then: bash windows/factory-reset.sh   (recreates the phone).
EOF
fi
if [[ $diagnosed -eq 0 && -z "$alive" && -z "$crash" ]]; then
  cat <<'EOF'
DIAGNOSIS — the app closed itself WITHOUT crashing.
  That's deliberate: identity/KYC apps like Persona Wallet check device
  integrity (Play Integrity / SafetyNet) and quietly exit on emulators
  and uncertified devices. No emulator setting fixes a hard integrity
  gate — that's the app refusing, not the phone failing. Your options:
    - try the VPS stack (Option B) + scripts/certify-play.sh — real
      GApps and certification pass basic (not hardware) attestation
    - or use the app's web flow in the phone's browser instead.
EOF
fi
if [[ $diagnosed -eq 0 && -n "$crash" ]]; then
  echo "No known pattern matched — send the crash log above for help."
fi
