#!/bin/bash
# PII redaction smoke test.
#
# POSTs an event with known PII in every text-bearing field, reads it back,
# and asserts that no original PII string survived. Defense-in-depth: even if
# the SDK is bypassed (curl, custom client) the server scrubs before INSERT.
#
# Usage: BASE=http://localhost:3030 ./scripts/pii-smoke.sh
#        BASE=https://whoopsie.dev  ./scripts/pii-smoke.sh
set -euo pipefail

BASE=${BASE:-http://localhost:3030}
PROJ="ws_pii_smoke_$(date +%s)"
NOW=$(python3 -c 'import time; print(int(time.time()*1000))')
TRACE="trace-pii-$NOW"

EMAIL="alice.victim@example.com"
PHONE="+1 (415) 555-1234"
SSN="123-45-6789"
JWT="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSIsInVzZXIiOiJhbGljZSJ9.abc123"
OPENAI="sk-abcdefghijklmnopqrstuvwxyz0123456789"
ANTHROPIC="sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAA"
AWS="AKIAIOSFODNN7EXAMPLE"
GHPAT="ghp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
CARD="4242 4242 4242 4242"

echo "=== POST event with PII in every text field ==="
curl -fsS -X POST "$BASE/api/v1/spans" \
  -H "Content-Type: application/json" \
  -H "X-Whoopsie-Project-Id: $PROJ" \
  -d "$(cat <<JSON
{
  "events": [{
    "projectId": "$PROJ",
    "traceId": "$TRACE",
    "spanId": "span-pii",
    "startTime": $NOW,
    "endTime": $((NOW+250)),
    "model": "gpt-4o",
    "prompt": "User $EMAIL called from $PHONE about card $CARD. Token: $JWT",
    "completion": "Confirmed account for $EMAIL. Internal key $OPENAI used; aws $AWS pat $GHPAT",
    "toolCalls": [{
      "toolCallId": "tc1",
      "toolName": "lookup_user",
      "args": { "email": "$EMAIL", "ssn": "$SSN", "auth": "$ANTHROPIC" },
      "result": { "phone": "$PHONE", "card": "$CARD" },
      "startTime": $NOW
    }],
    "inputTokens": 30,
    "outputTokens": 18,
    "finishReason": "stop",
    "metadata": { "note": "contact $EMAIL for follow-up" }
  }]
}
JSON
)" | python3 -m json.tool

echo ""
echo "=== Read trace back via /api/v1/traces ==="
sleep 1
RESPONSE=$(curl -fsS "$BASE/api/v1/traces?projectId=$PROJ&limit=10")
echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "=== Assert no PII strings survived ==="
LEAKS=0
check() {
  local label="$1" needle="$2"
  if echo "$RESPONSE" | grep -qF "$needle"; then
    echo "  [LEAK] $label: '$needle' present in stored trace"
    LEAKS=$((LEAKS+1))
  else
    echo "  [ok]   $label scrubbed"
  fi
}
check "email"          "$EMAIL"
check "phone"          "$PHONE"
check "ssn"            "$SSN"
check "jwt"            "$JWT"
check "openai key"     "$OPENAI"
check "anthropic key"  "$ANTHROPIC"
check "aws key"        "$AWS"
check "github pat"     "$GHPAT"
check "card number"    "4242 4242 4242 4242"

echo ""
if [ "$LEAKS" -eq 0 ]; then
  echo "PASS: no PII leaked into stored trace ($PROJ)"
else
  echo "FAIL: $LEAKS PII string(s) leaked — check redaction"
  exit 1
fi
