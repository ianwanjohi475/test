#!/usr/bin/env bash
#
# Resumable downloader for the phone image — built for unstable internet.
#
# `docker pull` throws away a partially-downloaded layer when the connection
# drops, so on a flaky line the big 1.9 GB layer can restart forever. This
# script downloads every piece with byte-level resume (curl -C -): when the
# connection drops, the next try continues from the EXACT byte it stopped at.
# Progress is saved in ~/.cloudphone-image, even across reboots.
#
#   bash windows/robust-pull.sh
#
set -uo pipefail

IMAGE="${IMAGE:-budtmo/docker-android}"
TAG="${TAG:-emulator_14.0}"
WORK="${WORK:-$HOME/.cloudphone-image}"
REG="https://registry-1.docker.io/v2/${IMAGE}"

mkdir -p "$WORK/blobs" "$WORK/img"
cd "$WORK"

command -v python3 >/dev/null || { echo "!! Need python3:  sudo apt install -y python3"; exit 1; }
if ! command -v skopeo >/dev/null; then
  echo "==> Installing skopeo (used to hand the finished image to Docker)"
  sudo apt-get update -qq && sudo apt-get install -y -qq skopeo \
    || { echo "!! Could not install skopeo. Run:  sudo apt install -y skopeo  then re-run."; exit 1; }
fi

token() {
  curl -fsSL --retry 5 --retry-all-errors \
    "https://auth.docker.io/token?service=registry.docker.io&scope=repository:${IMAGE}:pull" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}

fetch_manifest() { # $1 tag-or-digest  $2 outfile
  curl -fsSL --retry 5 --retry-all-errors -H "Authorization: Bearer $(token)" \
    -H 'Accept: application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.v2+json,application/vnd.oci.image.manifest.v1+json' \
    "$REG/manifests/$1" -o "$2"
}

echo "==> Fetching image metadata for $IMAGE:$TAG"
fetch_manifest "$TAG" top.json \
  || { echo "!! Docker Hub unreachable right now — re-run in a minute."; exit 1; }

DIGEST=$(python3 - <<'EOF'
import json
d = json.load(open('top.json'))
mt = d.get('mediaType', '')
if 'list' in mt or 'index' in mt:
    for m in d.get('manifests', []):
        p = m.get('platform', {})
        if p.get('architecture') == 'amd64' and p.get('os') == 'linux':
            print(m['digest']); break
EOF
)
if [[ -n "$DIGEST" ]]; then
  fetch_manifest "$DIGEST" manifest.json || { echo "!! Manifest fetch failed — re-run."; exit 1; }
else
  cp top.json manifest.json
fi

mapfile -t BLOBS < <(python3 - <<'EOF'
import json
m = json.load(open('manifest.json'))
print(m['config']['digest'])
for l in m['layers']:
    print(l['digest'])
EOF
)
TOTAL_MB=$(python3 - <<'EOF'
import json
m = json.load(open('manifest.json'))
print((m['config'].get('size',0) + sum(l.get('size',0) for l in m['layers'])) // 1048576)
EOF
)
echo "==> ${#BLOBS[@]} pieces to download, ~${TOTAL_MB} MB total (resume-safe)"

fetch_blob() { # $1 = sha256:<hex>
  local digest=$1 try=0 stalls=0 prev_size=-1 size rc kept
  local hex=${digest#sha256:}
  local out="blobs/$hex"
  [[ -f "$out.ok" ]] && return 0
  while :; do
    try=$((try + 1))
    # --speed-*: give up on a stalled connection after 60s so we can resume;
    # -C - : continue from the byte where the last try stopped.
    curl -fL -# -C - --speed-time 60 --speed-limit 1024 \
         -H "Authorization: Bearer $(token)" \
         "$REG/blobs/$digest" -o "$out"
    rc=$?
    if [[ -f "$out" ]] && [[ "$(sha256sum "$out" | awk '{print $1}')" == "$hex" ]]; then
      touch "$out.ok"
      return 0
    fi
    if [[ $rc -eq 0 || $rc -eq 22 ]]; then
      # download "finished" (or server refused the range) but checksum is
      # wrong -> corrupted or an error page got saved; start this piece over
      rm -f "$out"
    fi
    # abort if we're not gaining any bytes at all (permanent error, not a
    # flaky line) — resumed progress is kept for the next run
    size=$(stat -c%s "$out" 2>/dev/null || echo 0)
    if [[ "$size" -le "$prev_size" ]]; then stalls=$((stalls + 1)); else stalls=0; fi
    prev_size=$size
    if [[ $stalls -ge 12 ]]; then
      echo "!! 12 tries in a row with zero progress — this isn't a flaky line," >&2
      echo "!! something is blocking the download. Check your internet/VPN/firewall" >&2
      echo "!! and re-run:  bash windows/quickstart.sh   (progress so far is saved)" >&2
      exit 1
    fi
    kept=$(du -h "$out" 2>/dev/null | cut -f1); kept=${kept:-0}
    echo "    connection dropped — kept $kept, resuming from that point in 10s (try $try)"
    sleep 10
  done
}

i=0
for d in "${BLOBS[@]}"; do
  i=$((i + 1))
  echo "==> Piece $i/${#BLOBS[@]}  ($d)"
  fetch_blob "$d"
done

echo "==> All pieces verified — assembling the image"
# skopeo 'dir:' layout: version file + manifest.json + blobs named by hex digest
printf 'Directory Transport Version: 1.1\n' > img/version
cp manifest.json img/manifest.json
for d in "${BLOBS[@]}"; do
  hex=${d#sha256:}
  ln -f "blobs/$hex" "img/$hex" 2>/dev/null || cp -f "blobs/$hex" "img/$hex"
done

echo "==> Handing the image to Docker (takes a minute, no network needed)"
if ! skopeo copy --insecure-policy "dir:$WORK/img" "docker-daemon:${IMAGE}:${TAG}"; then
  echo "!! skopeo could not talk to Docker. If your docker needs sudo, run:" >&2
  echo "     sudo skopeo copy --insecure-policy dir:$WORK/img docker-daemon:${IMAGE}:${TAG}" >&2
  exit 1
fi

echo "==> Cleaning up download cache (freeing ~${TOTAL_MB} MB)"
cd / && rm -rf "$WORK"

echo "✅ Image ${IMAGE}:${TAG} is now in Docker — no more downloading needed, ever."
