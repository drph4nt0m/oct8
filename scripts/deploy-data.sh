#!/usr/bin/env bash
set -euo pipefail

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

upload_r2() {
  local key="$1"
  local file="$2"
  local attempt
  for attempt in 1 2 3; do
    echo "Uploading ${key} (attempt ${attempt}/3)..."
    if npx wrangler r2 object put "oct8-data/${key}" --file "${file}" --remote; then
      return 0
    fi
    if [ "${attempt}" -lt 3 ]; then
      echo "Upload failed for ${key}; retrying in $((attempt * 5))s..."
      sleep $((attempt * 5))
    fi
  done
  echo "Upload failed for ${key} after 3 attempts" >&2
  return 1
}

echo "--- Starting Data Update & Deployment ---"

# Step 1: Generate WHOIS delegations first so build-data includes them in insight.bin
echo "1. Fetching RIR delegations (whois.json)..."
./node_modules/.bin/tsx scripts/fetch-delegations.ts

# Step 2: Update the local databases and compile insight.bin
echo "2. Updating datasets and compiling insight.bin..."
npm run update-db

# Step 3: Upload to Cloudflare R2
echo "3. Uploading files to Cloudflare R2 (oct8-data bucket)..."

if ! command -v wrangler &> /dev/null && [ ! -x ./node_modules/.bin/wrangler ]; then
  echo "Wrangler could not be found. Please install dependencies with 'npm install'."
  exit 1
fi

upload_r2 "insight.bin" "data/insight.bin"

if [ -f data/reputation.json ]; then
  upload_r2 "reputation.json" "data/reputation.json"
fi

if [ -f data/whois.json ]; then
  upload_r2 "whois.json" "data/whois.json"
fi

if [ -f data/cloud.json ]; then
  upload_r2 "cloud.json" "data/cloud.json"
fi

if [ -f data/GeoLite2-City.mmdb ]; then
  upload_r2 "GeoLite2-City.mmdb" "data/GeoLite2-City.mmdb"
fi

if [ -f data/GeoLite2-ASN.mmdb ]; then
  upload_r2 "GeoLite2-ASN.mmdb" "data/GeoLite2-ASN.mmdb"
fi

echo "--- Data Deployment Complete ---"
