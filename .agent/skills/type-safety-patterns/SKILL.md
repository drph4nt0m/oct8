---
name: Type Safety Patterns
description: Patterns for ensuring end-to-end type safety in oct8.
---

# Type Safety Patterns Skill

## Overview

Type safety is our first line of defense against bugs. We aim for strictness at the boundaries and inside the core.

## 1. Zod at the Edge

- **Pattern**: Validate ALL external input (headers, query, params, body) using Zod schemas.
- **Library**: `zod` and `@hono/zod-openapi`.

```typescript
const QuerySchema = z.object({
  ip: z.string().ip(),
});
```

## 2. Branded Types

- **Pattern**: Use "branded types" for primitives that have specific semantic meaning, to prevent accidental mixing.
- _Note_: Use sparingly where confusion is likely (e.g., distinct ID types).

```typescript
type UserId = string & { __brand: 'UserId' };
type IpAddress = string & { __brand: 'IpAddress' };
```

## 3. Strict Return Types

- **Pattern**: Explicitly type (or let Hono infer via `c.json`) the return structure.
- **Anti-Pattern**: Returning `any` or `object`.

## 4. No `as` Casting

- **Pattern**: Use Type Guards or Zod parsing instead of `as MyType`.
- **Exception**: When interacting with legacy untyped libs, wrapper them in a typed adapter immediately.
