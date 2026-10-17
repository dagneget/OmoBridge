#!/usr/bin/env bash
set -e

BACKEND_URL="${1:-http://localhost:8080/api/v1/integrations/ussd}"
PHONE_NUMBER="${2:-+251911223344}"
SESSION_ID="${3:-demo-session-$(date +%s)}"
TEXT="${4:-}"

echo "=== Simulating USSD request to: $BACKEND_URL ==="
echo "Phone: $PHONE_NUMBER"
echo "Session ID: $SESSION_ID"
echo "Input text: '$TEXT'"

curl -X POST "$BACKEND_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"phoneNumber\": \"$PHONE_NUMBER\",
    \"serviceCode\": \"*990#\",
    \"text\": \"$TEXT\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"
