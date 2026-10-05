# History Set Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct completed historical set results through a compact History modal while preserving immutable historical targets.

**Architecture:** A dedicated History editor component receives frozen session-exercise context plus recorded sets and emits validated active result changes. `HistoryPage` owns modal selection and calls `correctHistoricalSetResult`; Dexie live queries render corrected History and recomputed PR evidence.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library.

---

### Task 1: Editor component and validation

**Files:**
- Create: `src/features/history/HistorySetEditor.tsx`
- Test: `src/features/history/HistorySetEditor.test.tsx`

- [x] Write tests for repetition, duration, validation, cancel, frozen context, and save errors.
- [x] Implement the modal list and editor with explicit Save/Cancel.
- [x] Re-run the focused component test.

### Task 2: History and atomic correction integration

**Files:**
- Modify: `src/features/history/HistoryPage.tsx`
- Modify: `src/features/history/HistoryPage.test.tsx`
- Modify: `src/db/progressionRecompute.test.ts`

- [x] Add integration coverage for completed-only actions, live History/PR refresh, owner isolation, immutable snapshots, and transaction rollback.
- [x] Wire the editor exclusively to `correctHistoricalSetResult`; close it after a successful save so the refreshed card remains the stable read-first view.
- [x] Re-run focused tests.

### Task 3: Verification and release

**Files:**
- Verify intended source, tests, and design documents only

- [x] Run focused tests, full suite, lint, TypeScript, production build, and `git diff --check`.
- [x] Review the diff and commit the intended source, test, and design files.
- [ ] Fast-forward main, push normally, and verify the existing Cloudflare Pages deployment.
