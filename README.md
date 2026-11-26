# Oct8 IP Service

A high-performance IP address intelligence service providing geolocation, ASN, and reputation data.

## Features

- **Dual Mode Operation**:
  - **Binary Mode**: Uses a custom optimized binary format for high-speed lookups (default if `insight.bin` exists).
  - **Legacy Mode**: Fallback to standard MaxMind MMDB and JSON files.
- **Provider Abstraction**: Extensible provider system (MaxMind, FireHOL, Header-based).
- **Edge Compatible**: Designed to run in serverless/edge environments.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment:
   Create a `.env` file with the following:

   ```env
   PORT=3000
   LOG_LEVEL=info
   DATA_DIR=data
   MODE=auto # auto, binary, or legacy
   ```

## Testing

Run the full test suite (Unit + Integration + E2E):

```bash
npm test
```

### Test Structure

- **Unit Tests**: `src/**/*.test.ts` (colocated with code)
- **Integration Tests**: `src/tests/integration/` (ProviderFactory logic)
- **E2E Tests**: `src/e2e/` (API endpoints)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying with Docker, Vercel, or manually.

## API

### Get IP Details

`GET /api/v1/ip` (returns caller's IP details)
`GET /api/v1/ip/:address` (returns specific IP details)

**Response:**

```json
{
  "ip": "8.8.8.8",
  "location": {
    "country_code": "US",
    "city": "Mountain View"
  },
  "network": {
    "asn": 15169,
    "org": "Google LLC"
  }
}
```
