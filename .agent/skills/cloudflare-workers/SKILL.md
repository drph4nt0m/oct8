---
name: Cloudflare Workers
description: Best practices and patterns for developing Cloudflare Workers in oct8.
---

# Cloudflare Workers Skill

## Overview

Cloudflare Workers provide a serverless execution environment that runs close to the user. `oct8` is built primarily for this environment.

## Key Constraints

1. **No Node.js Built-ins**: The runtime is V8, not Node.js. Avoid `fs`, `path`, `os`, etc., unless using `nodejs_compat` compatibility flag (which we do, but prefer native APIs).
2. **Execution Time**: Workers have CPU time limits. Avoid heavy sync computation.
3. **Memory**: Workers have strict memory limits (usually 128MB per request).

## Patterns

### 1. Bindings

Access environment variables and resources (KV, R2, D1) via the `env` object passed to the handler.

```typescript
interface Env {
  // KV Namespaces
  MY_KV: KVNamespace;
  // R2 Buckets
  MY_BUCKET: R2Bucket;
  // Environment Variables
  API_KEY: string;
}

app.get('/', (c) => {
  const env = c.env as Env;
  return c.text(env.API_KEY);
});
```

### 2. Context (`ctx`)

Use `ctx.waitUntil()` for background tasks that shouldn't block the response.

```typescript
app.get('/log', (c) => {
  c.executionCtx.waitUntil(logToAnalytics(c.req));
  return c.text('Logged');
});
```

### 3. Caching

Use the Cache API for edge caching.

```typescript
const cache = caches.default;
const response = await cache.match(request);
```

## Anti-Patterns

- **Global State**: Don't rely on global variables persisting between requests.
- **Heavy Blobs**: Don't try to load 100MB+ files into memory. Stream them.
