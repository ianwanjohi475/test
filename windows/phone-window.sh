#!/usr/bin/env bash
#
# Open the cloud phone in its OWN WINDOW on your desktop (scrcpy) —
# an alternative to the browser at http://localhost:6080. You can use both
# at the same time. Run inside your Ubuntu (WSL2) terminal:
#
#   bash windows/phone-window.sh
#
set -euo pipefail

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
booted=""
for i in $(seq 1 80); do
  if adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' | grep -q 1; then
    booted=1; break
  fi
  echo "    Android starting... ($i/80)"
  sleep 3
done
if [[ -z "$booted" ]]; then
  echo "!! Android didn't finish booting after ~4 minutes. Run:" >&2
  echo "     bash windows/diagnose.sh" >&2
  echo "   and send the output." >&2
  exit 1
fi
# let the just-booted system settle (launcher/services grab RAM at boot)
sleep 5
echo "    Android is fully booted ✅"

# Borderless = no window frame, just the phone screen floating on your
# desktop like a real device. (Run with  PLAIN=1 bash phone-window.sh
# if you prefer a normal window with title bar.)
extra=(--window-borderless)
[[ -n "${PLAIN:-}" ]] && extra=()

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

exec scrcpy -s "$serial" \
  --force-adb-forward --port=27184 --tunnel-port=27183 \
  --window-title "Cloud Phone" \
  --stay-awake --no-audio \
  --max-size="$size" --max-fps="$fps" --video-bit-rate="$bitrate" \
  "${extra[@]}"