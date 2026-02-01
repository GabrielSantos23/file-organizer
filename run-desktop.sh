#!/bin/bash
export FILE_ORGANIZER_ENGINE="$(dirname "$(dirname "$(realpath "$0")")")/engine.py"

if [ -d "$(dirname "$FILE_ORGANIZER_ENGINE")/.venv" ]; then
    source "$(dirname "$FILE_ORGANIZER_ENGINE")/.venv/bin/activate"
fi
cd "$(dirname "$0")/file-organizer-app/apps/web"
bun run desktop:dev
