#!/usr/bin/env bash
#
# Open the cloud phone in its OWN WINDOW on your desktop (scrcpy) —
# an alternative to the browser at http://localhost:6080. You can use both
# at the same time. Run inside your Ubuntu (WSL2) terminal:
#
#   bash windows/phone-window.sh
#
set -euo pipefail

# ---- command line: friendly flags + FULL scrcpy pass-through --------------
# Anything this script doesn't recognize goes straight to scrcpy, so every
# scrcpy option works here too (see: scrcpy --help).
usage() {
  cat <<'EOF'
Usage: bash windows/phone-window.sh [options]

Friendly options:
  --borderless    bare phone screen, no frame (looks real; not draggable)
  --top           keep the phone above all other windows
  --fullscreen    start fullscreen (Alt+F toggles any time)
  -h, --help      show this help

EVERYTHING else is passed straight to scrcpy — all its options work:
  bash windows/phone-window.sh --show-touches --always-on-top
  bash windows/phone-window.sh --record=my-session.mp4
  bash windows/phone-window.sh --max-size=0 --max-fps=60 --video-bit-rate=8M
  bash windows/phone-window.sh --window-x=1400 --window-y=40 --window-height=900
Full list:  scrcpy --help

Env shortcuts still work too:  TOP=1 W=380 SIZE=0 FPS=60 BITRATE=8M
EOF
}

user_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --borderless) user_args+=(--window-borderless) ;;
    --top)        user_args+=(--always-on-top) ;;
    --fullscreen) user_args+=(--fullscreen) ;;
    -h|--help)    usage; exit 0 ;;
    *)            user_args+=("$1") ;;   # raw scrcpy option
  esac
  shift
done

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  cat >&2 <<'EOF'
!! No graphical display available in WSL (WSLg missing).
   Fix: in PowerShell run  wsl --update  then  wsl --shutdown , reopen
   Ubuntu and try again. (WSLg comes with Windows 11 / updated Windows 10.)

   Or use scrcpy natively on Windows instead:
     1. Download https://github.com/Genymobile/scrcpy/releases (scrcpy-win64 zip)
     2. Unzip, open a terminal in that folder, run:
          adb connect localhost:5557
          scrcpy -s localhost:5557
EOF
  exit 1
fi

if ! command -v scrcpy >/dev/null || ! command -v adb >/dev/null; then
  echo "==> Installing scrcpy + adb (one time)"
  sudo apt-get update -qq && sudo apt-get install -y -qq scrcpy adb
fi

# ---- connect via the emulator's OWN adb server (inside the container) ----
# Connecting host-adb to a forwarded emulator port fails when the host adb
# (v41) and emulator adb (v39) versions differ (device shows offline/empty).
# Instead we point scrcpy at the adb SERVER that already runs inside the
# container: same version as the emulator, and the phone is already a known
# online device there. No version mismatch, no flaky handshake.

if ! docker ps --format '{{.Names}}' | grep -qx cloudphone; then
  echo "!! The phone container isn't running. Start it first:" >&2
  echo "     cd windows && docker compose up -d" >&2
  exit 1
fi

# The emulator can only run if the container can OPEN /dev/kvm. On WSL the
# permissions on /dev/kvm often reset to root-only (e.g. after wsl --shutdown),
# and then Android silently never boots: adb shows no device and the browser
# at :6080 shows only the wallpaper. Detect and fix that here.
kvm_mode=$(stat -c %a /dev/kvm 2>/dev/null || echo missing)
if [[ "$kvm_mode" == "missing" ]]; then
  echo "!! /dev/kvm is missing — virtualization is off. Run:" >&2
  echo "     bash windows/quickstart.sh" >&2
  exit 1
fi
case "$kvm_mode" in
  *6|*7) ;;  # world read+write — the emulator can open it
  *)
    echo "==> /dev/kvm is mode $kvm_mode — the phone can't open it. Fixing (sudo)..."
    sudo chmod 666 /dev/kvm
    echo "==> Restarting the phone so it boots with working acceleration..."
    docker restart cloudphone >/dev/null
    ;;
esac

# scrcpy needs its tunnel port (27183) published from the container (see
# docker-compose.yml). If the running container predates that mapping, the
# stream can never reach your desktop — recreate the container first.
if ! docker port cloudphone 27183/tcp >/dev/null 2>&1; then
  cat >&2 <<'EOF'
!! The phone container was started without the scrcpy tunnel port (27183).
   Apply the updated docker-compose.yml (your apps/data are kept):

     cd windows && docker compose up -d

   then run this script again once the phone has rebooted (~1 min).
EOF
  exit 1
fi

echo "==> Starting the phone's adb server (inside the container)..."
# (Re)start the container's adb server listening on all interfaces so your PC
# can reach it via the forwarded 127.0.0.1:5037. Serves localhost too, so the
# container's own tooling keeps working.
docker exec cloudphone adb kill-server >/dev/null 2>&1 || true
docker exec -d cloudphone adb -a nodaemon server >/dev/null 2>&1 || true

# From now on, host adb + scrcpy talk to THAT server (published on host
# port 5038, so it doesn't collide with your PC's own adb on 5037).
export ADB_SERVER_SOCKET=tcp:localhost:5038

# Right after "docker compose up -d" the freshly (re)started adb server needs
# a few seconds before it accepts connections. Until then every adb call
# exits non-zero — and with `set -e` that used to kill this script silently.
echo "==> Waiting for the container's adb server to answer (localhost:5038)..."
adb_up=""
for i in $(seq 1 30); do
  if adb devices >/dev/null 2>&1; then adb_up=1; break; fi
  sleep 1
done
if [[ -z "$adb_up" ]]; then
  cat >&2 <<'EOF'
!! Can't reach the adb server on localhost:5038 after 30s. Fix:

     cd windows && docker compose up -d     # (re)applies the 5038 port mapping
     docker restart cloudphone
     bash windows/phone-window.sh           # try again in ~1 min
EOF
  exit 1
fi

echo "==> Waiting for the phone to come online (first boot can take ~3 min)..."
serial=""
for i in $(seq 1 60); do
  # first online/device-state entry from the container's adb server
  # ("|| true" so one flaky adb call can't abort the script under set -e)
  serial=$(adb devices 2>/dev/null | awk '$2=="device"{print $1; exit}' || true)
  if [[ -n "$serial" ]]; then break; fi
  echo "    still booting... ($i/60)"
  # every 30s, show what adb actually sees so a stuck boot is visible
  if (( i % 10 == 0 )); then
    echo "    -- adb device list right now (empty = emulator not started yet):"
    adb devices 2>/dev/null | sed 's/^/       /' || true
  fi
  sleep 3
done

if [[ -z "$serial" ]]; then
  {
    echo "!! The phone didn't come online after ~3 minutes. Diagnostics:"
    echo
    echo "---- adb devices (via container's adb server) ----"
    adb devices 2>&1 | sed 's/^/   /' || true
    echo "---- emulator health inside the container ----"
    docker inspect --format 'container status: {{.State.Status}}, health: {{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' cloudphone 2>/dev/null || true
    docker exec cloudphone sh -c 'ls -l /dev/kvm 2>&1' | sed 's/^/   /' || true
    echo "---- last 40 lines of container logs ----"
    docker logs --tail 40 cloudphone 2>&1 | sed 's/^/   /' || true
    echo "---- emulator launcher log (the REAL crash reason) ----"
    docker exec cloudphone sh -c 'tail -n 40 "$LOG_PATH"/device.stdout.log 2>/dev/null || tail -n 40 /home/androidusr/logs/device.stdout.log 2>/dev/null || echo "(no device.stdout.log)"' 2>&1 | sed 's/^/   /' || true
    echo
    echo "   Usual fixes:"
    echo "     - '/dev/kvm: No such file' above  ->  virtualization is off:"
    echo "         run  bash windows/quickstart.sh  and follow its steps"
    echo "     - launcher log shows a crash/traceback -> wipe the phone's data:"
    echo "         bash windows/factory-reset.sh"
    echo "     - otherwise:  docker restart cloudphone  , wait ~1 min, re-run:"
    echo "         bash windows/phone-window.sh"
    echo "   Send this whole output if you need help."
  } >&2
  exit 1
fi
echo "    Phone is online as '$serial' ✅"

# adb saying "device" only means adbd is up — Android itself may still be
# booting. Starting scrcpy during boot gets its server killed by the
# kernel (boot-time memory crunch) and ends in "Server connection failed",
# with a cleanup-thread NullPointerException because system services
# aren't registered yet. Wait for the real end of boot.
echo "==> Waiting for Android to finish booting (adb is up, system isn't yet)..."
echo "    (a FIRST boot after a reset can take up to ~10 min — that's normal)"
booted=""
for i in $(seq 1 200); do
  if adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q 1; then
    booted=1; break
  fi
  echo "    Android starting... ($i/200)"
  sleep 3
done
if [[ -z "$booted" ]]; then
  echo "!! Android still hadn't finished booting after ~10 minutes." >&2
  echo "   The phone may keep booting in the background — check" >&2
  echo "   http://localhost:6080 and re-run this script if it comes up." >&2
  echo "   If it's clearly stuck, run:  bash windows/diagnose.sh" >&2
  echo "   and send the output." >&2
  exit 1
fi
# let the just-booted system settle (launcher/services grab RAM at boot)
sleep 5
echo "    Android is fully booted ✅"

# Quality-of-life, reapplied each run (instant, idempotent):
# - classic 3-button navigation (back/home/recents) — much easier with a
#   mouse than Android's swipe gestures
# - animations off — the single biggest "feels faster" switch on a
#   software-rendered phone
adb -s "$serial" shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton >/dev/null 2>&1 || true
adb -s "$serial" shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
adb -s "$serial" shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
adb -s "$serial" shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true

# ---- window style --------------------------------------------------------
# Default: a NORMAL window — title bar, so you can move it, resize it,
# minimize it like any app. Options (combine freely):
#   BORDERLESS=1   bare phone screen, no frame (looks real, but can't be
#                  dragged — it has no title bar to grab)
#   TOP=1          keep the phone above all other windows
#   FULLSCREEN=1   start fullscreen (Alt+F toggles any time)
#   X=100 Y=50     initial position;  W=400 H=850  initial size
# Example:  TOP=1 W=380 bash windows/phone-window.sh
extra=()
[[ -n "${BORDERLESS:-}${PLAIN_BORDERLESS:-}" ]] && extra+=(--window-borderless)
[[ -n "${TOP:-}"        ]] && extra+=(--always-on-top)
[[ -n "${FULLSCREEN:-}" ]] && extra+=(--fullscreen)
[[ -n "${X:-}" ]] && extra+=(--window-x="$X")
[[ -n "${Y:-}" ]] && extra+=(--window-y="$Y")
[[ -n "${W:-}" ]] && extra+=(--window-width="$W")
[[ -n "${H:-}" ]] && extra+=(--window-height="$H")

cat <<'EOF'
    ── Phone window tips ─────────────────────────────────────────
    Move/resize: drag the title bar / edges, like any window.
    Shortcuts (hold left Alt):
      Alt+F fullscreen   Alt+W fit window    Alt+G 1:1 size
      Alt+H home         Alt+B back          Alt+S app switch
      Alt+P power        Alt+↑/↓ volume      Alt+N notifications
    ──────────────────────────────────────────────────────────────
EOF

# ---- tunnel mode: required because the adb server is REMOTE (in Docker) ----
# By default scrcpy uses "adb reverse": the phone connects BACK to the machine
# running the adb server — i.e. INTO the container, where no scrcpy client is
# listening. So we force "adb forward" instead. But adb binds forward sockets
# to the container's LOOPBACK only, where Docker's published port can't reach
# them ("Server connection failed"). Same problem the image itself has with
# the emulator's ports — and we use its own solution: a socat relay that
# bridges container-external traffic to the loopback socket.
#
#   scrcpy client -> localhost:27183 (published) -> socat (container 0.0.0.0)
#     -> 127.0.0.1:27184 (adb forward) -> adbd -> scrcpy server on the phone
echo "==> Starting the tunnel relay inside the container..."
if ! docker exec cloudphone sh -c 'command -v socat' >/dev/null 2>&1; then
  echo "!! socat not found in the container (image changed?) — can't relay." >&2
  exit 1
fi
docker exec cloudphone sh -c "pkill -f 'TCP-LISTEN:27183' 2>/dev/null" >/dev/null 2>&1 || true
docker exec -d cloudphone socat TCP-LISTEN:27183,bind=0.0.0.0,fork,reuseaddr TCP:127.0.0.1:27184

# ---- performance: the emulator renders in software, don't stream more ----
# pixels than the eye needs. Defaults favor smoothness; override per run:
#   SIZE=0 FPS=60 BITRATE=8M bash windows/phone-window.sh   (max quality)
size="${SIZE:-1200}"      # cap the streamed longer side (0 = native)
fps="${FPS:-30}"          # 30 fps looks fluid and halves the encode work
bitrate="${BITRATE:-4M}"

# wake the screen so the window never opens onto a black, sleeping phone
adb -s "$serial" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true

# command-line args go LAST so they override any default set above
exec scrcpy -s "$serial" \
  --force-adb-forward --port=27184 --tunnel-port=27183 \
  --window-title "Cloud Phone" \
  --stay-awake --no-audio \
  --max-size="$size" --max-fps="$fps" --video-bit-rate="$bitrate" \
  "${extra[@]}" \
  "${user_args[@]+"${user_args[@]}"}"