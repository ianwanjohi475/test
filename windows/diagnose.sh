#!/usr/bin/env bash
#
# Cloud Phone — one-shot diagnosis. Collects everything needed to see WHY
# the phone isn't booting. Run inside your Ubuntu (WSL2) terminal:
#
#   bash windows/diagnose.sh
#
# then copy the WHOLE output when asking for help.
#
set -uo pipefail   # deliberately NO -e: print every section even if some fail
cd "$(dirname "$(readlink -f "$0")")"

section() { echo; echo "======== $1 ========"; }

section "Host: kernel / WSL"
uname -a

section "Host: /dev/kvm (must exist AND be mode 666 for the phone to boot)"
ls -l /dev/kvm 2>&1 || echo "MISSING — nested virtualization is off (run quickstart.sh)"

section "Host: memory"
free -h 2>&1

section "Host: disk space"
df -h / 2>&1

section "Docker: cloudphone containers"
docker ps -a --filter name=cloudphone 2>&1

section "Container: state / health"
docker inspect --format 'status={{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}} startedAt={{.State.StartedAt}} oomKilled={{.State.OOMKilled}}' cloudphone 2>&1

section "Container: /dev/kvm as the emulator user sees it"
docker exec cloudphone ls -l /dev/kvm 2>&1
docker exec cloudphone id 2>&1

section "Container: emulator / adb processes running?"
docker exec cloudphone sh -c "ps aux | grep -Ei 'emulator|qemu|adb|supervis' | grep -v grep" 2>&1

section "Container: adb devices (inside the container)"
docker exec cloudphone adb devices 2>&1

section "Container: last 80 log lines"
docker logs --tail 80 cloudphone 2>&1

section "Emulator launcher log (device.stdout.log — the REAL crash reason)"
docker exec cloudphone sh -c 'tail -n 60 "$LOG_PATH"/device.stdout.log 2>/dev/null || tail -n 60 /home/androidusr/logs/device.stdout.log 2>/dev/null || echo "(no device.stdout.log found)"' 2>&1

section "All service logs present"
docker exec cloudphone sh -c 'ls -l "$LOG_PATH" 2>/dev/null || ls -l /home/androidusr/logs 2>/dev/null' 2>&1

echo
echo "================================================================"
echo "  Done. Copy EVERYTHING above (from the first ======== line)."
echo "================================================================"
