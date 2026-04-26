#!/bin/sh
set -eu

CONFIG_DIR="${CONFIG_DIR:-/app/config}"
DEFAULT_CONFIG_DIR="${DEFAULT_CONFIG_DIR:-/app/default-config}"

copy_missing() {
  source_dir="$1"
  target_dir="$2"

  mkdir -p "$target_dir"

  for source_path in "$source_dir"/*; do
    [ -e "$source_path" ] || continue

    name="$(basename "$source_path")"
    target_path="$target_dir/$name"

    if [ -d "$source_path" ]; then
      copy_missing "$source_path" "$target_path"
    elif [ ! -e "$target_path" ]; then
      cp "$source_path" "$target_path"
    fi
  done
}

if [ -d "$DEFAULT_CONFIG_DIR" ]; then
  copy_missing "$DEFAULT_CONFIG_DIR" "$CONFIG_DIR"
fi

exec "$@"
