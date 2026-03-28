#!/bin/bash

# Brave Search skill script
# Requires BRAVE_API_KEY environment variable

set -e

# Default settings
RESULTS_COUNT=${RESULTS_COUNT:-5}
OUTPUT_FORMAT=${OUTPUT_FORMAT:-json}  # json, text, urls
CACHE_DIR="${HOME}/.cache/brave-search"
CACHE_TTL=300  # 5 minutes

show_help() {
    cat << EOF
Usage: ./search.sh [options] "<query>"

Options:
    -n, --count N      Number of results (default: 5)
    -f, --format FMT   Output format: json, text, urls (default: json)
    --no-cache         Disable caching
    -h, --help         Show this help

Examples:
    ./search.sh "React hooks tutorial"
    ./search.sh -n 10 -f text "latest Python features"
    ./search.sh --urls "Rust documentation"
EOF
}

# Parse arguments
NO_CACHE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--count)
            RESULTS_COUNT="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            QUERY="$1"
            shift
            ;;
    esac
done

# Validate
if [ -z "$BRAVE_API_KEY" ]; then
    echo '{"error": "BRAVE_API_KEY environment variable is not set"}' >&2
    exit 1
fi

if [ -z "$QUERY" ]; then
    echo '{"error": "No query provided"}' >&2
    exit 1
fi

# Create cache key and check cache
CACHE_KEY=$(echo -n "$QUERY" | shasum -a 256 | cut -d' ' -f1)
CACHE_FILE="$CACHE_DIR/$CACHE_KEY.json"

if [ "$NO_CACHE" = false ] && [ -f "$CACHE_FILE" ]; then
    CACHE_AGE=$(( $(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE") ))
    if [ "$CACHE_AGE" -lt "$CACHE_TTL" ]; then
        RAW_JSON=$(cat "$CACHE_FILE")
    fi
fi

# Fetch from API if not cached
if [ -z "$RAW_JSON" ]; then
    RAW_JSON=$(curl -s -G "https://api.search.brave.com/res/v1/web/search" \
        -H "Accept: application/json" \
        -H "X-Subscription-Token: $BRAVE_API_KEY" \
        --data-urlencode "q=$QUERY" \
        --data-urlencode "count=$RESULTS_COUNT")
    
    # Cache the result
    if [ "$NO_CACHE" = false ]; then
        mkdir -p "$CACHE_DIR"
        echo "$RAW_JSON" > "$CACHE_FILE"
    fi
fi

# Output based on format
case $OUTPUT_FORMAT in
    json)
        echo "$RAW_JSON"
        ;;
    text)
        echo "$RAW_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
results = data.get('web', {}).get('results', [])
for i, r in enumerate(results, 1):
    print(f\"{i}. {r.get('title', 'No title')}\")
    print(f\"   {r.get('description', '')[:150]}\")
    print(f\"   {r.get('url', '')}\")
    print()
"
        ;;
    urls)
        echo "$RAW_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('web', {}).get('results', []):
    print(r.get('url', ''))
"
        ;;
    *)
        echo "{\"error\": \"Unknown format: $OUTPUT_FORMAT\"}" >&2
        exit 1
        ;;
esac
