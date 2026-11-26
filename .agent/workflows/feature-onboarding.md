---
description: Guide for adding new API features while maintaining Edge compatibility.
---

# Feature Onboarding Workflow

Use this checklist when implementing any new API feature in oct8.

## 1. API Design

- [ ] **OpenAPI Spec**: Define the route in `src/api/routes` using strict Zod schemas.
- [ ] **Validation**: Ensure all path params, query params, and body are validated.
- [ ] **Responses**: Define success (200) and error (4xx/5xx) schemas.

## 2. Core Logic

- [ ] **Controller**: Implement the handler using the Hono factory pattern.
- [ ] **Service Layer**: Keep business logic separate from the HTTP handler.
- [ ] **Edge Safe**: Verify no Node.js-only dependencies are used.

## 3. Data Integrity

- [ ] **Binary Reads**: If accessing MMDB/Binary data, use the `InsightService` abstraction.
- [ ] **KV/R2**: Use proper bindings for any ephemeral or blob storage.

## 4. Observability

- [ ] **Logging**: Use `c.var.logger` for structural logs.
- [ ] **Metrics**: Add relevant metrics if this is a high-traffic endpoint.

## 5. Verification

- [ ] **Unit Tests**: Test the service logic in isolation.
- [ ] **Integration Tests**: Use `app.request()` to test the full Hono route.
