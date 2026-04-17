#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 --character <character_name>"
  exit 1
}

CHARACTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --character)
      CHARACTER="${2:-}"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if [[ -z "$CHARACTER" ]]; then
  usage
fi

CHARACTER_DIR="characters/$CHARACTER"
if [[ ! -d "$CHARACTER_DIR" ]]; then
  echo "Error: character directory not found: $CHARACTER_DIR" >&2
  exit 1
fi

extract_after_heading() {
  local file="$1"
  local pattern="$2"
  awk -v pat="$pattern" '$0 ~ pat { while ((getline line) > 0) { if (line !~ /^[[:space:]]*$/) { print line; exit } } }' "$file"
}

songs=()
for dir in "$CHARACTER_DIR"/*; do
  if [[ -d "$dir" ]]; then
    readme="$dir/README.md"
    if [[ -f "$readme" ]]; then
      title=$(extract_after_heading "$readme" '^## (曲名|タイトル)')
      audience=$(extract_after_heading "$readme" '^## 対象者')
      if [[ -z "$audience" ]]; then
        audience=$(extract_after_heading "$readme" '^## テーマ')
      fi
      if [[ -z "$title" ]]; then
        title=$(basename "$dir")
      fi
      if [[ -z "$audience" ]]; then
        audience="不明"
      fi
      songs+=("$title|$audience")
    fi
  fi
done

if [[ ${#songs[@]} -eq 0 ]]; then
  echo "No songs found for character: $CHARACTER"
  exit 0
fi

printf 'Character: %s\n' "$CHARACTER"
printf 'Songs: %d\n\n' "${#songs[@]}"

idx=1
for song in "${songs[@]}"; do
  title="${song%%|*}"
  audience="${song##*|}"
  printf '%d. %s\n' "$idx" "$title"
  printf '   対象者: %s\n\n' "$audience"
  ((idx++)) || true
done
