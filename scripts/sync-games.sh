#!/bin/sh
# Copies the games that are FOR SALE (with README + tools: they go into the buyer's source ZIP) into games/.
#   pack 1 (htmlgamescode.com)         from ~/Desktop/web2app/games
#   pack 2 (htmltoapk.com/html-games/) from ~/Desktop/web2app/games2
# Only the folders listed here are copied: ~/Desktop/web2app/games also holds unsold templates.
# Keep the lists in sync with htmlgames-worker/src/games.js. Then commit + push main.
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$HERE/.."
PACK1="galaxy_strike merge_fruits block_puzzle stack_tower word_connect quiz_trivia endless_runner snake_arena ball_sort knife_hit idle_tycoon"
PACK2="putt_park moon_hopper mole_patrol pixel_peak flow_works rink_rally crate_escape pixel_logic hoop_swish beat_lanes"
mkdir -p "$HERE/games"
copy() {
  [ -f "$1/$2/index.html" ] || { echo "missing $1/$2" >&2; exit 1; }
  rsync -a --delete --exclude '.*' --exclude node_modules "$1/$2/" "$HERE/games/$2/"
}
for n in $PACK1; do copy "$WEB/games" "$n"; done
for n in $PACK2; do copy "$WEB/games2" "$n"; done
ls "$HERE/games"
