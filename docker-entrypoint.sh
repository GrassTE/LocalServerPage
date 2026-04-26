#!/bin/sh
set -eu

CONFIG_DIR="${CONFIG_DIR:-/app/config}"
DEFAULT_CONFIG_DIR="${DEFAULT_CONFIG_DIR:-/app/default-config}"

copy_missing() {
  local source_dir="$1"
  local target_dir="$2"
  local source_path
  local name
  local target_path

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

restore_misplaced_config() {
  local name
  local target_path
  local misplaced_path

  mkdir -p "$CONFIG_DIR"

  for name in app.env app.env.example app.json sites.json README.md; do
    target_path="$CONFIG_DIR/$name"
    misplaced_path="$CONFIG_DIR/icons/$name"

    if [ ! -e "$target_path" ] && [ -f "$misplaced_path" ]; then
      cp "$misplaced_path" "$target_path"
    fi
  done
}

if [ -d "$DEFAULT_CONFIG_DIR" ]; then
  restore_misplaced_config
  copy_missing "$DEFAULT_CONFIG_DIR" "$CONFIG_DIR"
fi

exec "$@"
