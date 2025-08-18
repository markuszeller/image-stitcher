#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

trap 'echo "Build failed (line $LINENO)"; exit 1' ERR
trap 'echo; echo "Stopped."; exit 130' INT

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT="$SCRIPT_DIR"

INPUT="$ROOT/app/css/style.css"
OUTPUT="$ROOT/app/css/output.css"
CONTENT="$ROOT/app/**/*.{html,js}"

MINIFY="--minify"
WATCH=""
SOURCEMAP=""
VERBOSE=""

usage() {
  cat <<'EOF'
Usage: ./build.sh [--dev] [--watch] [--sourcemap] [-v|--verbose] [-h|--help]

  --dev        Build without minification
  --watch      Watch for changes
  --sourcemap  Generate source maps
  -v           Verbose (print command)
  -h           Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) MINIFY="";;
    --watch) WATCH="--watch";;
    --sourcemap) SOURCEMAP="--sourcemap";;
    -v|--verbose) VERBOSE=1;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 2;;
  esac
  shift
done

[[ -f "$INPUT" ]] || { echo "Error: input CSS not found: $INPUT"; exit 1; }
mkdir -p "$(dirname "$OUTPUT")"

TW_CMD=()
if [[ -x "$ROOT/node_modules/.bin/tailwindcss" ]]; then
  TW_CMD=( "$ROOT/node_modules/.bin/tailwindcss" )
elif command -v tailwindcss >/dev/null 2>&1; then
  TW_CMD=( tailwindcss )
elif command -v npx >/dev/null 2>&1; then
  TW_CMD=( npx --yes @tailwindcss/cli@latest tailwindcss )
else
  echo "Error: tailwindcss CLI not found."
  echo "Install locally: npm i -D @tailwindcss/cli@latest"
  echo "Or globally:    npm i -g @tailwindcss/cli@latest"
  exit 1
fi

TW_VERSION_STR="$("${TW_CMD[@]}" --version 2>&1 || true)"
TW_VERSION="$(echo "$TW_VERSION_STR" | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' || true)"
if [[ -n "$TW_VERSION" ]]; then
  MAJOR="${TW_VERSION%%.*}"
  if (( MAJOR < 4 )); then
    echo "Error: Tailwind CLI v4+ required, found: $TW_VERSION_STR"
    exit 1
  fi
fi

echo "Building Tailwind CSS v4..."
CMD=( "${TW_CMD[@]}" -i "$INPUT" -o "$OUTPUT" $MINIFY $WATCH $SOURCEMAP --content "$CONTENT" )

if [[ -n "$VERBOSE" ]]; then
  printf 'Command: '; printf '%q ' "${CMD[@]}"; echo
fi

"${CMD[@]}"

if [[ -z "$WATCH" ]]; then
  if command -v stat >/dev/null 2>&1; then
    SIZE=$(stat -c %s "$OUTPUT" 2>/dev/null || stat -f %z "$OUTPUT" 2>/dev/null || echo "")
  else
    SIZE=$(wc -c < "$OUTPUT" 2>/dev/null || echo "")
  fi
  echo "Tailwind build complete."
  echo "Output: $OUTPUT${SIZE:+ ($SIZE bytes)}"
else
  echo "Watching for changes…"
fi