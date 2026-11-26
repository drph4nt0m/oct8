---
name: Performance Patterns
description: Best practices for optimizing latency and resource usage in oct8.
---

# Performance Patterns Skill

## Overview

`oct8` runs on the edge, where latency is king. Every millisecond counts. This skill outlines patterns to ensure maximum performance.

## 1. Binary Data Handling

We serve IP intelligence. The raw data is large (hundreds of MBs). We cannot load this into JSON arrays.

- **Pattern**: Use binary formats (`.mmdb`, `.bin`) and seek specific offsets.
- **Pattern**: Use `maxmind` library with a buffer, or custom binary readers.
- **Anti-Pattern**: `JSON.parse()` on large datasets.

## 2. Minimal Dependencies

- **Pattern**: Use native Web Standard APIs (`fetch`, `Request`, `Response`, `URL`).
- **Pattern**: Tree-shakeable libraries.
- **Anti-Pattern**: Importing massive utility libraries like `lodash` when a native function suffices.

## 3. Edge Caching

- **Pattern**: Use `Cache-Control` headers intelligently.
- **Pattern**: Use the Cloudflare Cache API (`caches.default`) to programmatically cache responses.

```typescript
// Cache for 1 hour at the edge, 1 minute in the browser
c.header('Cache-Control', 'public, max-age=60, s-maxage=3600');
```

## 4. Asynchronous Non-Blocking

- **Pattern**: Use `ctx.waitUntil()` for logging, analytics, and non-critical updates.
- **Anti-Pattern**: Awaiting a database write for a simple analytics counter before returning the response to the user.
