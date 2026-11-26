#!/usr/bin/env bash
set -euo pipefail

# Load environment variables if .env exists
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

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

echo "Uploading insight.bin..."
npx wrangler r2 object put oct8-data/insight.bin --file data/insight.bin --remote

if [ -f data/reputation.json ]; then
  echo "Uploading reputation.json..."
  npx wrangler r2 object put oct8-data/reputation.json --file data/reputation.json --remote
fi

if [ -f data/whois.json ]; then
  echo "Uploading whois.json..."
  npx wrangler r2 object put oct8-data/whois.json --file data/whois.json --remote
fi

if [ -f data/cloud.json ]; then
  echo "Uploading cloud.json..."
  npx wrangler r2 object put oct8-data/cloud.json --file data/cloud.json --remote
fi

if [ -f data/GeoLite2-City.mmdb ]; then
  echo "Uploading GeoLite2-City.mmdb..."
  npx wrangler r2 object put oct8-data/GeoLite2-City.mmdb --file data/GeoLite2-City.mmdb --remote
fi

if [ -f data/GeoLite2-ASN.mmdb ]; then
  echo "Uploading GeoLite2-ASN.mmdb..."
  npx wrangler r2 object put oct8-data/GeoLite2-ASN.mmdb --file data/GeoLite2-ASN.mmdb --remote
fi

echo "--- Data Deployment Complete ---"
