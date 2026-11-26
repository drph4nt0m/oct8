# Technical Design Document: Oct8 IP Service

## 1. Overview

The Oct8 IP Service is a high-performance microservice designed to provide detailed information about IP addresses. It serves two primary use cases:

1. Identifying the requester's own IP address and metadata (GeoIP, ASN).
2. Looking up metadata for arbitrary IP addresses.

## 2. Goals & Non-Goals

### Goals

- **Low Latency**: Responses should be served in < 50ms (excluding network RTT).
- **Accuracy**: Integration with reliable GeoIP and ASN data sources.
- **Availability**: 99.9% uptime target.
- **Ease of Deployment**: Optimized for free/cheap serverless or container platforms.

### Non-Goals

- **User Tracking**: This service does not store logs of user activity for tracking purposes.
- **DHCP/Dynamic DNS**: Not a dynamic DNS provider.

## 3. API Specification

### 3.1. Endpoints

#### `GET /api/v1/ip`

Returns information about the underlying connection's IP address.

**Response:**

```json
{
  "ip": "203.0.113.42",
  "type": "ipv4",
  "location": {
    "country": "United States",
    "country_code": "US",
    "city": "Ashburn",
    "region": "Virginia",
    "latitude": 39.0438,
    "longitude": -77.4874
  },
  "asn": {
    "number": 15169,
    "org": "Google LLC"
  },
  "meta": {
    "is_vpn": false,
    "is_proxy": false
  }
}
```

#### `GET /api/v1/ip/{address}`

Returns information about the specified IP address.

**Parameters:**

- `address`: IPv4 or IPv6 address.

**Response:** Same as above.
**Errors:** `400 Bad Request` for invalid IP formats.

## 4. Architecture

### 4.1. Core Service

- **Language**: TypeScript (Node.js runtime).
- **Framework**: [Hono](https://hono.dev/) for high-performance HTTP handling.

### 4.2. Insight Engine Pattern

The service uses a modular **Provider Pattern** to aggregate data:

- **Coordinator**: `InsightService` initializes providers in parallel and merges their results.
- **Providers**:
  - **MaxMindProvider**: Wraps legacy GeoIP logic (Location/ASN).
  - **ReputationProvider**: Uses a custom `RadixTree` to match IPs against FireHOL blocklists (Tor/Proxy/Malware).
  - **IdentityProvider**: Uses a custom `RadixTree` to match IPs against Cloud Provider ranges (e.g., AWS).

### 4.3. Data Structures

- **Custom Radix Tree**: implemented in `src/lib/radix-tree.ts`.
  - Optimized for **binary IP matching** (using `ip-address` for parsing).
  - Replaces the need for external routing libraries.
  - Provides O(k) lookups for millions of IP ranges (FireHOL list is ~200k entries).

### 4.4. Data Pipeline

Data is updated via a unified CLI command: `npm run update-db`.

1. **Downloader**: Fetches MaxMind MMDBs.
2. **Scraper**: Fetches and parses FireHOL standard lists (`.netset`, `.ipset`).
3. **Cloud Sync**: Fetches official IP ranges from Cloud Providers (AWS, etc.).

### 4.5. Request Handling Flow

1. **Ingress**: Request hits the service.
2. **Insight Lookup**: `InsightService` queries all providers concurrently (fully in-memory).
3. **Aggregation**: Results are merged into a unified `Insight` object.
4. **Response**: JSON/XML/Text payload returned.

## 5. Deployment Strategy

### 5.1. Free / Cheap Options

1. **Vercel (Serverless)**:
   - **Cost**: Free (Hobby tier).
   - **Pros**: Zero maintenance, automatic HTTPS, git-push-to-deploy, excellent TS support.
   - **Cons**: Cold starts; MMDB file loading on every cold start can be slow (50-100ms).
2. **Render (Container)**:
   - **Cost**: Free tier available (spins down after inactivity).
   - **Pros**: Persistent container (no cold starts while active), standard Docker environment.
   - **Cons**: Free tier sleeps: first request after sleep will be very slow (~30s).
3. **Coolify (Self-Hosted)**:
   - **Cost**: Cost of the VPS ($4-5/mo).
   - **Pros**: Heroku-like experience on your own server.

**Recommendation**: Start with **Vercel** for ease of use. If cold start performance with the DB loading is an issue, switch to **Render** or a cheap VPS.

## 6. Security Considerations

- **Rate Limiting**: Use platform-level protection (Vercel Firewall) or application-level middleware (e.g., `hono-rate-limiter`).
- **Header Trust**: Critical when running behind proxies. Hono has built-in helpers for trusting proxy headers.

## 7. Future Work

- Support for `Accept: application/xml` or plaintext output.
- Integration with threat intelligence feeds.
- GraphQL interface.
