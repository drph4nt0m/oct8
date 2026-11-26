---
name: Error Handling
description: Patterns for handling errors predictably and safely in oct8.
---

# Error Handling Skill

## Overview

We need consistent error handling to maintain observability and provide meaningful feedback to API consumers.

## 1. Structured Errors

- **Pattern**: Use a standard JSON error format.

```json
{
  "error": "not_found",
  "message": "Resource not found",
  "requestId": "abc-123"
}
```

## 2. Exceptions vs Result pattern

- **Pattern**: Hono allows returning explicit responses. Prefer explicit `c.json({ error: ... }, 400)` for business logic errors.
- **Pattern**: Use throwing `Error` only for truly unexpected situations or where bubbling up to a global handler is cleaner.

## 3. Global Error Handler

- **Pattern**: Implement `app.onError((err, c) => ...)` to catch unhandled exceptions.
- **Rules**: Log the full stack trace. Return a sanitized 500 to the client (don't leak internal details).

## 4. Logger Integration

- **Pattern**: All errors must be logged with `userId`, `requestId`, and context.
- **Anti-Pattern**: `console.error(err)` without context. Use `logger.error("Failed to fetch user", { error: err, userId })`.
