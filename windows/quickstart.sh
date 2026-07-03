#!/usr/bin/env bash
#
# Cloud Phone — ONE-COMMAND quickstart for Windows.
# Run inside your Ubuntu (WSL2) terminal:
#
#     bash windows/quickstart.sh
#
# It writes C:\Users\<You>\.wslconfig FOR YOU (nested virtualization + RAM),
# then boots the phone. If Windows needs a WSL restart first, it tells you
# the exact two commands and you just run this script once more.
#
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

changed=0

# ---------- Step 1: configure C:\Users\<You>\.wslconfig automatically -------
if grep -qi microsoft /proc/version 2>/dev/null && command -v powershell.exe >/dev/null 2>&1; then
  WINHOME_RAW=$(powershell.exe -NoProfile -Command '$env:USERPROFILE' 2>/dev/null | tr -d '\r' || true)
  if [[ -n "${WINHOME_RAW:-}" ]]; then
    CFG=$(wslpath "$WINHOME_RAW")/.wslconfig

    # Pick a sensible RAM size for the phone based on the PC's real RAM
    TOTAL_GB=$(powershell.exe -NoProfile -Command \
      '[math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB)' \
      2>/dev/null | tr -d '\r' || echo 8)
    if   [[ "$TOTAL_GB" -ge 16 ]]; then MEM=10GB
    elif [[ "$TOTAL_GB" -ge 12 ]]; then MEM=8GB
    elif [[ "$TOTAL_GB" -ge 8  ]]; then MEM=6GB
    else                                MEM=4GB
    fi

    if [[ ! -f "$CFG" ]]; then
      printf '[wsl2]\nnestedVirtualization=true\nmemory=%s\n' "$MEM" > "$CFG"
      changed=1
      echo "==> Created $CFG (nestedVirtualization=true, memory=$MEM)"
    else
      cp "$CFG" "$CFG.backup-cloudphone"
      if ! grep -q '^\[wsl2\]' "$CFG"; then
        printf '\n[wsl2]\n' >> "$CFG"; changed=1
      fi
      # Force nestedVirtualization=true (fix it if set to false)
      if grep -qiE '^[[:space:]]*nestedVirtualization[[:space:]]*=' "$CFG"; then
        if ! grep -qiE '^[[:space:]]*nestedVirtualization[[:space:]]*=[[:space:]]*true' "$CFG"; then
          sed -i -E 's|^[[:space:]]*nestedVirtualization[[:space:]]*=.*|nestedVirtualization=true|I' "$CFG"
          changed=1
        fi
      else
        sed -i '/^\[wsl2\]/a nestedVirtualization=true' "$CFG"; changed=1
      fi
      # Add a memory line only if the user doesn't already have one
      if ! grep -qiE '^[[:space:]]*memory[[:space:]]*=' "$CFG"; then
        sed -i "/^\[wsl2\]/a memory=$MEM" "$CFG"; changed=1
      fi
      [[ $changed -eq 1 ]] && echo "==> Updated $CFG (backup saved as .wslconfig.backup-cloudphone)"
    fi
  fi
else
  echo "    (Not a WSL environment or powershell.exe not found — skipping .wslconfig step)"
fi

# ---------- Step 2: restart WSL if needed, otherwise boot the phone ---------
if [[ -e /dev/kvm ]]; then
  echo "==> Virtualization is ready — starting the phone..."
  exec bash setup-windows.sh
fi

if [[ $changed -eq 1 ]]; then
  cat <<'EOF'

==========================================================
  ✅ Windows config written! One restart needed, then done:

  1. Open PowerShell (Windows) and run:      wsl --shutdown
  2. Reopen this Ubuntu terminal.
  3. Run:   cd cloud-phone && bash windows/quickstart.sh

  The second run will boot the phone automatically.
==========================================================
EOF
  exit 0
fi

# Config was already correct but /dev/kvm still missing — let setup-windows.sh
# print the detailed diagnosis (Windows version / BIOS virtualization).
exec bash setup-windows.sh
