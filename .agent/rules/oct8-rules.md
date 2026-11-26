# Oct8 Golden Rules

Oct8 is a high-performance, edge-native IP intelligence service. These "Golden Rules" are the high-level entry point for all development.

## 1. Edge-Native Performance (The Speed Limit)

- **The rule**: Everything must run on Cloudflare Workers (Edge).
- **The constraint**: No Node.js specific APIs (fs, child_process) unless strictly dev-only. Minimize bundle size.
- **Related Skill**: [cloudflare-workers](../skills/cloudflare-workers/SKILL.md)

## 2. Binary Efficiency (The Data Crunch)

- **The rule**: Use binary formats for IP data queries.
- **The constraint**: Avoid loading large JSONs into memory. Use buffers and binary search (mmdb, custom bin).
- **Related Skill**: [performance-patterns](../skills/performance-patterns/SKILL.md)

## 3. Type-Safe API (The Contract)

- **The rule**: All inputs and outputs must be strongly typed.
- **The constraint**: Use `zod-openapi` with Hono. No `any`.
- **Related Skill**: [hono-api](../skills/hono-api/SKILL.md), [type-safety-patterns](../skills/type-safety-patterns/SKILL.md)

## 4. Observability First (The Black Box Recorder)

- **The rule**: If it's not logged, it didn't happen.
- **The constraint**: Structured JSON logs. Trace IDs on every request.
- **Related Skill**: [error-handling](../skills/error-handling/SKILL.md)

## 5. Proactive Documentation (The Map)

- **The rule**: Keep the agentic context alive.
- **Reference**: [feature-onboarding](../workflows/feature-onboarding.md), [refactor-protocol](../workflows/refactor-protocol.md)
