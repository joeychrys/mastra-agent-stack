#!/bin/sh
set -e

# Replace NEXT_PUBLIC_* placeholder URLs with runtime environment variables
# These were baked in as https://PLACEHOLDER_REPLACE_ME_* during build
# and are now replaced with actual values from Dokploy environment variables

if [ -n "$NEXT_PUBLIC_BASE_URL" ]; then
  find /app/.next -type f \( -name '*.js' -o -name '*.json' \) -exec sed -i "s~https://PLACEHOLDER_REPLACE_ME_BASE_URL~${NEXT_PUBLIC_BASE_URL}~g" {} +
fi

if [ -n "$NEXT_PUBLIC_LANGGRAPH_URL" ]; then
  find /app/.next -type f \( -name '*.js' -o -name '*.json' \) -exec sed -i "s~https://PLACEHOLDER_REPLACE_ME_LANGGRAPH_URL~${NEXT_PUBLIC_LANGGRAPH_URL}~g" {} +
fi

# Start the Next.js server
exec node server.js
