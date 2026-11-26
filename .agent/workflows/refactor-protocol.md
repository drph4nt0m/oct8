---
description: Analyze the codebase for oct8-specific architectural, security, and quality improvements.
---

# Refactor Suggestions Protocol

> [!IMPORTANT]
> **Refactor Protocol (Phase-Locked)**
>
> 1. **Global Scan**: Run all checks for ALL Phases to gather full context.
> 2. **Global Plan**: Create a comprehensive `implementation_plan.md` addressing all findings.
>    - **MUST** include a "Scan Results Summary" section listing high-level findings per phase.
>    - **MUST** copy this exact verification plan into `implementation_plan.md`:
>
>      ```markdown
>      ## Verification Plan
>
>      ### Automated Tests
>
>      - `npm run lint` (Static Analysis)
>      - `npm run test` (Unit, Integration)
>      - `npm run deploy --dry-run` (Build Verification)
>      ```
>
> 3. **Phase Execution**: For each Phase with findings:
>    a. **Action**: Apply fixes for the Phase.
>    b. **Validate**: Run `npm run lint` and `npm run test`.
> 4. **Commit**: Only proceed if validation passes.

---

## Protocol Components

### Finding Template

When generating the "Global Plan", use this structure for each finding:

- **Location**: `[file basename](file:///absolute/path/to/file#L123)`
- **Issue**: Short description of the violation.
- **Related Skill**: `[Skill Name](../skills/skill-name/SKILL.md)`
- **Solution**: Proposed fix.

---

## Refactor Phases

### Phase 1: Edge Compatibility (Critical)

> **Goal**: Ensure pure V8 runtime. Related: [cloudflare-workers](../skills/cloudflare-workers/SKILL.md)

// turbo

- [ ] **Node.js Leakage**: `rg "import .* from ['\"](fs|child_process|path)['\"]" src -g "!*.test.ts"` - No Node.js built-ins in runtime code.
- [ ] **Global Mutation**: `rg "(window|global)\." src` - Avoid global state.

### Phase 2: Performance & Data

> **Goal**: Optimize for edge latency. Related: [performance-patterns](../skills/performance-patterns/SKILL.md)

// turbo

- [ ] **Large JSON Imports**: `rg "import .* from .*\.json" src` - Prefer runtime fetch or KV/R2 for large data.
- [ ] **Blocking Operations**: `rg "readFileSync|writeFileSync" src` - Must use async I/O only.

### Phase 3: API & Validation

> **Goal**: Type-safe boundaries. Related: [hono-api](../skills/hono-api/SKILL.md)

// turbo

- [ ] **Missing Zod**: `rg "c\.req\.json\(\)" src` - Ensure inputs are validated via Zod schemas.
- [ ] **Explicit Status**: `rg "c\.json\(.*[^,]\)$" src` - Check for missing HTTP status codes where 200 is implied but maybe incorrect.
- [ ] **Generic Errors**: `rg "throw new Error" src` - Use domain-specific errors (e.g., `InsightError`).

### Phase 4: Code Health

> **Goal**: Maintainability & Quality. Related: [knowledge-maintenance](../skills/knowledge-maintenance/SKILL.md)

// turbo

- [ ] **Lint Analysis**: `npm run lint` - Catch structural and style issues not found by regex.
- [ ] **Strictness**: `rg ": any|var " src` - No `any`, no `var`.
- [ ] **Console Logs**: `rg "console\.log" src -g "!*.test.ts"` - Use structured logger instead.
- [ ] **Unsafe Casts**: `rg "as unknown as" src -g "!*.test.ts"` - Avoid double-casting to bypass types.
- [ ] **Loose Catch**: `rg "catch \([a-z]+\) \{" src` - Ensure errors are typed as `unknown` or handled specifically.
- [ ] **Env Leakage**: `rg "process\.env" src -g "!src/infra/config/config.ts" -g "!src/api/http/app-factory.ts"` - Ensure `process.env` is not used directly in business logic.

### Phase 5: Build & Configuration

> **Goal**: Deployment readiness.

// turbo

- [ ] **Wrangler Vars**: `grep "\[vars\]" wrangler.toml` - Ensure strict env vars are defined.
