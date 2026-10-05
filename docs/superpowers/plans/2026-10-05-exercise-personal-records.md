# Exercise Personal Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recomputed personal-record evidence and compact exercise-specific History statistics.

**Architecture:** A pure domain module derives immutable evidence from completed session records, frozen session-exercise snapshots, and active set-result fields. History selects one exercise deterministically and renders that module's compact output without changing progression or persistence.

**Tech Stack:** TypeScript, React 19, Dexie live queries, Vitest, Testing Library.

---

### Task 1: Pure performance evidence

**Files:**
- Create: `src/domain/exercisePerformance.ts`
- Test: `src/domain/exercisePerformance.test.ts`

- [ ] **Step 1: Write failing domain tests** for explicit load-only repetition PRs, duration PRs, non-work/legacy filtering, deterministic ties, mixed loads, and immutability.
- [ ] **Step 2: Run `npm test -- src/domain/exercisePerformance.test.ts`** and confirm the missing module failure.
- [ ] **Step 3: Implement `deriveExercisePerformance`** using completed sessions and frozen snapshots only.
- [ ] **Step 4: Run the focused domain test** and confirm all tests pass.

### Task 2: History summary integration

**Files:**
- Modify: `src/features/history/HistoryPage.tsx`
- Modify: `src/features/history/HistoryPage.test.tsx`

- [ ] **Step 1: Write failing UI tests** for explicit/exact filter selection, ambiguous filter suppression, load summary, and duration summary.
- [ ] **Step 2: Run `npm test -- src/features/history/HistoryPage.test.tsx`** and confirm the summary assertions fail.
- [ ] **Step 3: Build the immutable history input and render the compact panel** only for a uniquely resolved exercise.
- [ ] **Step 4: Run the focused History test** and confirm it passes.

### Task 3: Correction-derived regression

**Files:**
- Modify: `src/db/progressionRecompute.test.ts`

- [ ] **Step 1: Write a failing integration test** that derives a PR, applies `correctHistoricalSetResult`, and derives the changed PR from the same live Dexie data.
- [ ] **Step 2: Run `npm test -- src/db/progressionRecompute.test.ts`** and confirm it fails for the missing summary integration.
- [ ] **Step 3: Add only the required test fixtures/imports; do not add persistence code.**
- [ ] **Step 4: Run the focused correction test** and confirm it passes.

### Task 4: Verification and integration

**Files:**
- Verify: intended source, test, and documentation files only

- [ ] **Step 1: Run focused domain, History, and correction tests.**
- [ ] **Step 2: Run `npm test`, `npm run lint`, `npx tsc -b`, `npm run build`, and `git diff --check`.**
- [ ] **Step 3: Inspect the diff, commit the intended files, fast-forward `main`, push normally, and verify deployed production.**
