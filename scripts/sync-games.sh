#!/bin/sh
# Copies the 10 game templates (with README + tools: they go into the buyer's source ZIP) into games/.
# Run after changing a game in ~/Desktop/web2app/games, then commit + push main.
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$HERE/../games}"
rm -rf "$HERE/games" && mkdir -p "$HERE/games"
for d in "$SRC"/*/; do
  n=$(basename "$d")
  [ -f "$d/index.html" ] || continue
  rsync -a --exclude '.*' --exclude node_modules "$d" "$HERE/games/$n/"
done
ls "$HERE/games"
