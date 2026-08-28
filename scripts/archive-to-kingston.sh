#!/usr/bin/env bash
# Archive the longitudinal tables to an external drive.
#
# localbase is the working store; this is the copy that leaves the machine. Two
# formats, on purpose:
#   - a compressed pg_dump, for restoring the database exactly as it was
#   - one CSV per table, for opening in anything at all in ten years' time
# A dump you cannot read without the original software is a hostage, not a backup.
#
# Usage:  ./scripts/archive-to-kingston.sh [/Volumes/YourDrive]
# Cron:   add to launchd alongside the collector, or run by hand before unplugging.

set -euo pipefail

DEST_VOL="${1:-}"
PGURL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TABLES=(gm_market_quotes gm_acled_events gm_firms_hotspots gm_news_items gm_sentiment_readings gm_ingestion_runs gm_region_visits)

# Pick the drive: an explicit argument wins, otherwise take the first mounted
# volume that is not the boot disk.
if [[ -z "$DEST_VOL" ]]; then
    for v in /Volumes/*; do
        [[ "$(basename "$v")" == "Macintosh HD" ]] && continue
        [[ -d "$v" && -w "$v" ]] && { DEST_VOL="$v"; break; }
    done
fi

if [[ -z "$DEST_VOL" || ! -d "$DEST_VOL" ]]; then
    echo "No external volume found. Plug the drive in, or pass the path:"
    echo "  ./scripts/archive-to-kingston.sh /Volumes/Kingston"
    exit 1
fi

if ! psql "$PGURL" -tAc 'select 1' >/dev/null 2>&1; then
    echo "localbase is not reachable on 127.0.0.1:54322."
    echo "Start it first:  cd ~/Projects/_infra/localbase && supabase start"
    exit 1
fi

STAMP="$(date +%Y-%m-%d)"
DEST="$DEST_VOL/asiawatch-archive/$STAMP"
mkdir -p "$DEST/csv"

echo "Archiving to $DEST"

# Full dump — restore with: pg_restore -d <db> asiawatch-<stamp>.dump
#
# pg_dump refuses to run against a newer server, and Homebrew here has 16 while
# localbase runs 17. The container already holds a matching binary, so use that
# and stream the dump out to the host rather than installing a second Postgres.
DB_CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -m1 '^supabase_db_' || true)"
DUMP_ARGS=(--format=custom --compress=9 $(printf -- '--table=%s ' "${TABLES[@]}"))

if [[ -n "$DB_CONTAINER" ]]; then
    echo "  using pg_dump inside $DB_CONTAINER"
    docker exec "$DB_CONTAINER" pg_dump \
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
        "${DUMP_ARGS[@]}" > "$DEST/asiawatch-$STAMP.dump"
elif pg_dump "$PGURL" "${DUMP_ARGS[@]}" --file="$DEST/asiawatch-$STAMP.dump" 2>/dev/null; then
    echo "  using local pg_dump"
else
    echo "  WARNING: no compatible pg_dump — CSV export only, no restorable dump."
    rm -f "$DEST/asiawatch-$STAMP.dump"
fi

# Plain CSV — readable without Postgres, without this repo, without me.
for t in "${TABLES[@]}"; do
    psql "$PGURL" -c "\copy $t TO '$DEST/csv/$t.csv' WITH CSV HEADER" >/dev/null
    rows=$(psql "$PGURL" -tAc "select count(*) from $t")
    printf '  %-24s %s rows\n' "$t" "$rows"
done

# A manifest, so the folder explains itself years from now.
{
    echo "AsiaWatch longitudinal archive"
    echo "Taken:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "Source:   localbase (local Supabase) on this Mac, database 'postgres'"
    echo "Restore:  pg_restore -d <target-db> asiawatch-$STAMP.dump"
    echo "CSVs are a plain-text mirror of the same tables, header row included."
    echo
    for t in "${TABLES[@]}"; do
        printf '%-24s %s rows\n' "$t" "$(psql "$PGURL" -tAc "select count(*) from $t")"
    done
} > "$DEST/MANIFEST.txt"

echo "Done. $(du -sh "$DEST" | cut -f1) written."
