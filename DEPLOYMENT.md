# Deployment Guide

This guide covers how to deploy the Oct8 IP Service to various environments.

## 1. Docker (Recommended)

The project includes a multi-stage `Dockerfile` optimized for production.

### Build the Image

```bash
docker build -t oct8-service .
```

### Run the Container

```bash
docker run -p 3000:3000 \
  -e MAXMIND_LICENSE_KEY=your_key_here \
  -e MODE=auto \
  -v $(pwd)/data:/usr/src/app/data \
  oct8-service
```

### Environment Variables

- `PORT`: Service port (default: 3000)
- `LOG_LEVEL`: Logging level (default: info)
- `DATA_DIR`: Path to data directory (default: data)
- `MODE`: Operation mode (`auto`, `binary`, `legacy`)

### Data Persistence

Mount the `/usr/src/app/data` volume to persist downloaded databases (MaxMind MMDBs, Reputation lists).

---

## 2. Cloudflare Workers (Serverless)

The service is compatible with Cloudflare Workers.

### Setup

1. Install Wrangler:

   ```bash
   npm install -g wrangler
   ```

2. Login:

   ```bash
   wrangler login
   ```

### Configuration

Configure `wrangler.toml`:

- `MODE`: Set to `binary` for best performance.
- `INSIGHT_BINARY_FILE`: Name of the binary file.

### Data Management (Workers)

Since Workers have a size limit (1MB - 10MB depending on plan), you should use the **Binary Mode** with **Cloudflare R2**.

1. **Create R2 Bucket**:

   ```bash
   wrangler r2 bucket create oct8-data
   ```

2. **Upload Initial Data**:

   ```bash
   # Generate/Download all data (MaxMind + Insight Binary)
   # Requires MAXMIND_LICENSE_KEY
   export MAXMIND_LICENSE_KEY=your_key
   npm run update-db

   # Upload to R2
   wrangler r2 object put oct8-data/insight.bin --file data/insight.bin
   wrangler r2 object put oct8-data/GeoLite2-City.mmdb --file data/GeoLite2-City.mmdb
   wrangler r2 object put oct8-data/GeoLite2-ASN.mmdb --file data/GeoLite2-ASN.mmdb
   wrangler r2 object put oct8-data/reputation.json --file data/reputation.json
   ```

3. **Automated Updates**:
   A GitHub Action (`.github/workflows/update-db.yml`) is provided to automate this weekly.
   - Set `MAXMIND_LICENSE_KEY` in GitHub Secrets.
   - Set `CLOUDFLARE_API_TOKEN` in GitHub Secrets (needs R2 write permissions).

### Deploy

```bash
wrangler deploy
```

> **Note**: Standard `env` vars can be set via `wrangler secret put KEY`.

---

## 3. Manual / Bare Metal

### Prerequisites

- Node.js 20+
- NPM

### Steps

1. **Build**:

   ```bash
   npm run build
   ```

2. **Prepare Data**:

   ```bash
   # Create data directory
   mkdir -p data

   # Download initial databases (requires license key)
   export MAXMIND_LICENSE_KEY=your_key
   npm run update-db
   ```

3. **Start**:

   ```bash
   npm start
   ```

4. **Process Management**:
   Use `pm2` or `systemd` to keep the process running.

   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name oct8
   ```
