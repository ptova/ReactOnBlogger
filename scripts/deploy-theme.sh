#!/bin/bash

# ===== CONFIGURATION SECTION =====
# File paths and line numbers
EXTRACT_LINE_START=8
EXTRACT_LINE_END=9
REPLACE_LINE_START=23
REPLACE_LINE_END=24
INPUT_FILE="dist/index.html"
TEMPLATE_FILE="resources/template.html"
OUTPUT_FILE="resources/toDeploy.html"
ENV_FILE_PATH=".env"

# API configuration
API_ENDPOINT="https://draft.blogger.com/_/BloggerUi/data/batchexecute"
COOKIE_NAME="__Secure-1PSID"
USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (Chrome/147.0.0.0 Safari/537.36)"

# Processing configuration
TAIL_SKIP_LINES=3


# Extract lines from input file
lines=$(sed -n "${EXTRACT_LINE_START},${EXTRACT_LINE_END}p" "$INPUT_FILE")

# Create a temporary file
temp_file=$(mktemp)

# Replace lines in template with extracted lines
awk -v new_lines="$lines" "NR==${REPLACE_LINE_START} {print new_lines; next} NR==${REPLACE_LINE_END} {next} 1" "$TEMPLATE_FILE" > "$temp_file"

# Move the temporary file back to the original location
mv "$temp_file" "$OUTPUT_FILE"

source "$ENV_FILE_PATH"

# Validate required environment variables
if [ -z "$BLOG_ID" ] || [ -z "$AT_SECRET" ] || [ -z "$SECURE_1PSID" ]; then
    echo "Error: BLOG_ID, AT_SECRET, and SECURE_1PSID must be set in .env file"
    exit 1
fi

# Process templates in memory and execute curl in one pipeline
HTML_CONTENT=$(cat "$OUTPUT_FILE")
ESCAPED_CONTENT=$(printf '%s' "$HTML_CONTENT" | python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))')

# Build the nested JSON
NESTED_JSON=$(jq -n \
   --arg blog_id "$BLOG_ID" \
   --argjson content "$ESCAPED_CONTENT" \
   '[$blog_id, [$blog_id, $content, 1], 0, 1, 1]')

# Build the final JSON and URL-encode it
F_REQ_JSON=$(jq -n \
   --argjson nested "$(echo "$NESTED_JSON" | jq -R -s '.')" \
   '[[["/BloggerTemplateDataService.BlogTemplateContentUpdate", $nested, null, "generic"]]]' \
   | jq -c '.' | jq -sRr @uri)


# URL-encode the secret
AT_ENCODED=$(printf '%s' "$AT_SECRET" | jq -sRr @uri)

# Execute curl and save output to a temporary file
RESPONSE=$(curl -s "$API_ENDPOINT" \
  -b "${COOKIE_NAME}=${SECURE_1PSID}" \
  -H "user-agent: ${USER_AGENT}" \
  --data-raw "f.req=${F_REQ_JSON}&at=${AT_ENCODED}" | tail -n +${TAIL_SKIP_LINES})

# Check if curl was successful and response contains expected data
if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
    # Extract the first element of the response to check for success
    RESPONSE_TYPE=$(echo "$RESPONSE" | jq -r '.[0][2]' 2>/dev/null)

    if [ "$RESPONSE_TYPE" = null ]; then
        echo "Error: Blog template update failed - unexpected response"
        echo "Response content:"
        echo "$RESPONSE"
        exit 1
    else
        echo "Success: Blog template content updated successfully"
        exit 0
    fi
else
    echo "Error: curl command failed or produced empty output"
    exit 1
fi