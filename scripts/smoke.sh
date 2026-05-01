#!/bin/bash
set -euo pipefail
BASE=${BASE:-http://localhost:3030}
PROJ="ws_smoketest"
NOW=$(python3 -c 'import time; print(int(time.time()*1000))')

echo "=== 1. Landing page ==="
curl -s -o /dev/null -w "GET / -> %{http_code}\n" "$BASE/"

echo "=== 2. Dashboard page ==="
curl -s -o /dev/null -w "GET /live/$PROJ -> %{http_code}\n" "$BASE/live/$PROJ"

echo "=== 3. POST a clean event (no detections expected) ==="
curl -s -X POST "$BASE/api/v1/spans" \
  -H "Content-Type: application/json" \
  -H "X-Whoopsie-Project-Id: $PROJ" \
  -d "{
    \"events\": [{
      \"projectId\": \"$PROJ\",
      \"traceId\": \"trace-clean-1\",
      \"spanId\": \"span-1\",
      \"startTime\": $NOW,
      \"endTime\": $((NOW+250)),
      \"model\": \"gpt-4o\",
      \"prompt\": \"Hi, how are you?\",
      \"completion\": \"Hello! I'm doing well, thank you for asking.\",
      \"toolCalls\": [],
      \"inputTokens\": 8,
      \"outputTokens\": 12,
      \"finishReason\": \"stop\",
      \"metadata\": {}
    }]
  }" | python3 -m json.tool

echo ""
echo "=== 4. POST a loop event (should fire loop detector) ==="
curl -s -X POST "$BASE/api/v1/spans" \
  -H "Content-Type: application/json" \
  -H "X-Whoopsie-Project-Id: $PROJ" \
  -d "{
    \"events\": [{
      \"projectId\": \"$PROJ\",
      \"traceId\": \"trace-loop-1\",
      \"spanId\": \"span-2\",
      \"startTime\": $NOW,
      \"endTime\": $((NOW+1500)),
      \"model\": \"gpt-4o\",
      \"prompt\": \"search for the latest bun release notes\",
      \"completion\": \"Searching...\",
      \"toolCalls\": [
        {\"toolCallId\":\"a\",\"toolName\":\"web_search\",\"startTime\":$NOW},
        {\"toolCallId\":\"b\",\"toolName\":\"web_search\",\"startTime\":$((NOW+100))},
        {\"toolCallId\":\"c\",\"toolName\":\"web_search\",\"startTime\":$((NOW+200))},
        {\"toolCallId\":\"d\",\"toolName\":\"web_search\",\"startTime\":$((NOW+300))},
        {\"toolCallId\":\"e\",\"toolName\":\"web_search\",\"startTime\":$((NOW+400))},
        {\"toolCallId\":\"f\",\"toolName\":\"web_search\",\"startTime\":$((NOW+500))}
      ],
      \"inputTokens\": 30,
      \"outputTokens\": 4,
      \"finishReason\": \"tool_calls\",
      \"metadata\": {}
    }]
  }" | python3 -m json.tool

echo ""
echo "=== 5. POST a cost-spike event ==="
curl -s -X POST "$BASE/api/v1/spans" \
  -H "Content-Type: application/json" \
  -H "X-Whoopsie-Project-Id: $PROJ" \
  -d "{
    \"events\": [{
      \"projectId\": \"$PROJ\",
      \"traceId\": \"trace-cost-1\",
      \"spanId\": \"span-3\",
      \"startTime\": $NOW,
      \"endTime\": $((NOW+5000)),
      \"model\": \"gpt-4o\",
      \"prompt\": \"Summarize this giant pile of text...\",
      \"completion\": \"This is a very long completion that ran on and on.\",
      \"toolCalls\": [],
      \"inputTokens\": 9000,
      \"outputTokens\": 5000,
      \"costUsd\": 0.78,
      \"finishReason\": \"stop\",
      \"metadata\": {}
    }]
  }" | python3 -m json.tool

echo ""
echo "=== 6. SSE handshake (read first 2 events) ==="
timeout 3 curl -s -N "$BASE/api/sse/$PROJ" | head -40 || true
