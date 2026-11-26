#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for MAXMIND_LICENSE_KEY
if [ -z "$MAXMIND_LICENSE_KEY" ]; then
  # Try to source from .env
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
  fi
fi

if [ -z "$MAXMIND_LICENSE_KEY" ]; then
  echo -e "${RED}Error: MAXMIND_LICENSE_KEY is not set.${NC}"
  echo "Please set it in your environment or .env file."
  exit 1
fi

echo -e "${BLUE}--- Setting up Local Data Environment ---${NC}"

# 1. Update Database (skips if key missing, but we checked)
echo -e "${BLUE}1. Updating Databases...${NC}"
npm run update-db

# 2. Upload to Local R2
echo -e "${BLUE}2. Seeding Local R2 Bucket...${NC}"

# Ensure wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "npx could not be found"
    exit 1
fi

FILES=(
  "data/GeoLite2-City.mmdb"
  "data/GeoLite2-ASN.mmdb"
  "data/cloud.json"
  "data/reputation.json"
  "data/insight.bin"
)

# Create bucket if it doesn't exist? (wrangler creates on demand usually for local?)
# npx wrangler r2 bucket create oct8-data --local || true

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    BASENAME=$(basename "$FILE")
    echo "Uploading $BASENAME..."
    npx wrangler r2 object put "oct8-data/$BASENAME" --file="$FILE" --local
  else
    echo -e "${RED}Warning: $FILE not found. Skipping.${NC}"
  fi
done

echo -e "${GREEN}--- Local Setup Complete ---${NC}"
echo "You can now run 'npm run dev' to start the worker locally with data."
