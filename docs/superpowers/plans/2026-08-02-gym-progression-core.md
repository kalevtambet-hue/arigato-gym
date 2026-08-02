# Gym Progression Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phase-one progression persistence and a testable pure progression policy without UI or export changes.

**Architecture:** Keep persistent records in `src/db`; version 7 performs the Dexie upgrade. Keep policy evaluation in `src/domain/progressionPolicy.ts`, delegating target changes to the existing pure target calculator.

**Tech Stack:** TypeScript, Dexie 4, Vitest, fake-indexeddb.

---

### Task 1: Persistence schema

**Files:**
- Modify: `src/db/types.ts`, `src/db/appDb.ts`
- Test: `src/db/appDb.test.ts`

- [ ] Write migration tests for target-group defaults and v7 tables.
- [ ] Run `npm test -- src/db/appDb.test.ts` and observe the expected failing assertions.
- [ ] Add the record types and Dexie v7 migration with default values.
- [ ] Run `npm test -- src/db/appDb.test.ts` and observe passing assertions.

### Task 2: Progression policy

**Files:**
- Create: `src/domain/progressionPolicy.ts`
- Test: `src/domain/progressionPolicy.test.ts`

- [ ] Write one failing test per policy branch: full success, consecutive success, skip, partial completion, manual reset and ceiling freeze.
- [ ] Run `npm test -- src/domain/progressionPolicy.test.ts` and observe the missing-module failure.
- [ ] Add the smallest pure evaluator that returns the next target, count and reason.
- [ ] Run `npm test -- src/domain/progressionPolicy.test.ts` and observe passing assertions.

### Task 3: Final verification and publication

**Files:**
- Modify: the files from Tasks 1–2

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Stage only the tracked implementation, tests and docs; commit with `feat: add progression core`.
- [ ] Push `agent/gym-progression-core` and create a draft pull request.
