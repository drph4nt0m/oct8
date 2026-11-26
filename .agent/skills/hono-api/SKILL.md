---
name: Hono API
description: Best practices for building APIs with Hono and Zod in oct8.
---

# Hono API Skill

## Overview

`oct8` uses [Hono](https://hono.dev/) as its web framework. It's lightweight, fast, and edge-compatible.

## Structure

We follow a controller-service pattern using Hono's factory.

```typescript
// src/api/routes/example.ts
import { createRoute, z } from '@hono/zod-openapi';
import { factory } from '../factory';

export const route = createRoute({
  method: 'get',
  path: '/items/{id}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ id: z.string(), name: z.string() }),
        },
      },
      description: 'Item details',
    },
  },
});

export const handler = factory.createHandlers(async (c) => {
  const { id } = c.req.valid('param');
  // Use service layer
  const item = await itemService.getById(id, c.env);
  return c.json(item);
});
```

## Middleware

Use Hono middleware for cross-cutting concerns (auth, logging, cors).

```typescript
app.use('*', logger());
app.use('*', prettyJSON());
app.use('/api/*', cors());
```

## Validation

Always use `zod-openapi`'s `createRoute` to define contracts. This ensures:

1. Runtime validation of inputs.
2. Auto-generated OpenAPI documentation.
3. Type safety in handlers.

## Dependency Injection

Pass `env` to services, or use a context-based DI if complexity grows. Avoid global singletons that depend on `process.env`.
