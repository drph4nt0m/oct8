---
name: Knowledge Maintenance
description: Patterns for keeping the codebase and agent documentation in sync.
---

# Knowledge Maintenance Skill

## Overview

Code rots. Documentation rots faster. This skill defines how we keep our knowledge base (and the agent's context) fresh.

## 1. Documentation as Code

- **Pattern**: Keep related docs close to the code (e.g., `README.md` in subdirectories).
- **Pattern**: Update `.agent/skills` when a new pattern emerges.

## 2. The Golden Rule of Comments: "Why, not What"

- **Pattern**: Comments should explain architectural decisions or non-obvious constraints.
- **Anti-Pattern**: `// increments i` above `i++`.
- **Anti-Pattern**: Commented out blocks of code. Delete them. Use git history if needed.

## 3. Agentic Memory

- **Pattern**: When significant refactors happen, run the `refactor-protocol` workflow. It has a step for updating Agent Skills.
- **Pattern**: If current rules are outdated, update `.agent/rules/oct8-rules.md` immediately.

## 4. Tech Debt Management

- **Pattern**: Use `TODO(User):` for items to be picked up later.
- **Anti-Pattern**: Leaving `console.log` debugging relics in the codebase.
