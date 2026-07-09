#!/usr/bin/env bash
set -euo pipefail
source ".env"

SCRIPT_ID="${APPS_SCRIPT_ID:?Set APPS_SCRIPT_ID}"
PSID="${COOKIE_1PSID:?Set COOKIE_1PSID}"
PSIDTS="${COOKIE_1PSIDTS:?Set COOKIE_1PSIDTS}"
AT="${APPS_AT:?Set APPS_AT (fetch from Google session)}"
IMPLEMENTATION_ID_="${IMPLEMENTATION_ID:?Set IMPLEMENTATION_ID}"

HERE="$(cd "$(dirname "$0")" && pwd)"
CODE_FILE="${APPS_CODE_FILE:-$HERE/../resources/apps-script/Code.gs}"

if [[ ! -f "$CODE_FILE" ]]; then
    echo "ERROR: $CODE_FILE not found"
    exit 1
fi

AT_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$AT")

do_rpc() {
    local rpc_id="$1"
    local rpc_args="$2"

    local payload
    payload=$(jq -cn --arg rpc "$rpc_args" "[[[\"$rpc_id\", \$rpc, null, \"generic\"]]]")
    payload=${payload//!/\\u0021}

    local payload_enc
    payload_enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$payload")

    local url="https://script.google.com/_/AppsPlatformConsoleUi/data/batchexecute"
    local freqid=$(( RANDOM % 900000 + 100000 ))
    url+="?rpcids=${rpc_id}"
    url+="&source-path=%2Fhome%2Fprojects%2F${SCRIPT_ID}%2Fedit"
    url+="&f.sid=-${RANDOM}${RANDOM}"
    url+="&bl=boq_appsplatformconsoleuiserver_20260705.09_p0"
    url+="&hl=it"
    url+="&soc-app=779"
    url+="&soc-platform=1"
    url+="&soc-device=1"
    url+="&_reqid=${freqid}"
    url+="&rt=c"

    curl -sS "$url" \
      -H "Content-Type: application/x-www-form-urlencoded;charset=UTF-8" \
      -H "Origin: https://script.google.com" \
      -H "X-Same-Domain: 1" \
      -b "__Secure-1PSID=$PSID; __Secure-1PSIDTS=$PSIDTS" \
      --data "f.req=${payload_enc}&at=${AT_ENC}"
}

# ── Step 1: Upload code ──────────────────────────────────────────────

echo "=== Step 1: Uploading code ==="

CODE_CONTENT=$(<"$CODE_FILE")

MANIFEST=$(jq -n --indent 2 '
{
  timeZone: "Europe/Rome",
  dependencies: {},
  exceptionLogging: "STACKDRIVER",
  runtimeVersion: "V8",
  webapp: {
    executeAs: "USER_DEPLOYING",
    access: "ANYONE_ANONYMOUS"
  }
}')

RPC_ARGS=$(jq -cn \
    --arg script_id "$SCRIPT_ID" \
    --arg manifest "$MANIFEST" \
    --arg code "$CODE_CONTENT" '
[
  $script_id,
  [
    ["appsscript", 3, $manifest],
    ["code", 1, $code]
  ],
  0
]')

RESPONSE=$(do_rpc "KhxE6" "$RPC_ARGS")

if grep -q '\["wrb\.fr","KhxE6","' <<<"$RESPONSE" && grep -q 'appsscript' <<<"$RESPONSE"; then
    echo "✅ Code upload succeeded."
else
    echo "❌ Code upload failed."
    echo "$RESPONSE"
    exit 1
fi

# ── Step 2: Get deploy index ─────────────────────────────────────────

echo "=== Step 2: Getting deploy index ==="

AP2HPD_ARGS=$(jq -cn --arg sid "$SCRIPT_ID" '[$sid, ""]')
RESPONSE=$(do_rpc "Ap2hpd" "$AP2HPD_ARGS")

if ! grep -q '\["wrb\.fr","Ap2hpd","' <<<"$RESPONSE"; then
    echo "❌ Ap2hpd call failed."
    echo "$RESPONSE"
    exit 1
fi

API_VALUE=$(echo "$RESPONSE" | grep 'wrb.fr.*Ap2hpd' | jq -r '.[0][2]' | jq -r '.[0][0]')
echo "✅ Deploy index: $API_VALUE"

# ── Step 3: Deploy ───────────────────────────────────────────────────

echo "=== Step 3: Deploying ==="

RZU1QB_ARGS=$(jq -cn \
    --arg sid "$SCRIPT_ID" \
    --arg token "$IMPLEMENTATION_ID_" \
    --argjson val "$API_VALUE" \
    '[$sid, $token, $val, "appsscript", [4,2], null, null, ""]')
RESPONSE=$(do_rpc "Rzu1qb" "$RZU1QB_ARGS")

if grep -q '\["wrb\.fr","Rzu1qb","' <<<"$RESPONSE" && grep -q "$IMPLEMENTATION_ID_" <<<"$RESPONSE"; then
    echo "✅ Deploy succeeded."
else
    echo "❌ Deploy failed."
    echo "$RESPONSE"
    exit 1
fi
