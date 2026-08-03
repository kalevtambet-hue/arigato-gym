# Gym Progression V1 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist auditable V1 progression data and evaluate all agreed primary-group progression rules without changing the workout UI flow.

**Architecture:** Preserve legacy fields used by React while adding explicit V1 target, set-assessment, revision, and audit types. Put all eligibility, clamping, and streak decisions in a pure domain evaluator so Dexie and UI consumers cannot duplicate policy.

**Tech Stack:** TypeScript, Dexie 4, Vitest, fake-indexeddb.

---

### Task 1: Specify and test V1 progression decisions

**Files:**
- Modify: `src/domain/progressionPolicy.test.ts`
- Modify: `src/domain/progressionPolicy.ts`

- [ ] **Step 1: Write failing policy tests** for neutral skips, partial failures, planned-minimum failure, qualifying extras, insufficient load, zero-step manual mode, assisted-load direction, and ceiling clamping.
- [ ] **Step 2: Run the focused test** with `npm test -- src/domain/progressionPolicy.test.ts`; confirm assertions fail because the current evaluator cannot accept V1 set inputs.
- [ ] **Step 3: Implement the minimal pure evaluator** using `PrimarySetAttempt`, `ProgressionTargetV1`, and `evaluatePrimaryProgression` to return a derived assessment plus a next-target/streak decision.
- [ ] **Step 4: Re-run the focused test** with `npm test -- src/domain/progressionPolicy.test.ts`; confirm it passes.

### Task 2: Persist V1 records and migrate existing data

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/appDb.ts`
- Modify: `src/db/appDb.test.ts`

- [ ] **Step 1: Write failing migration assertions** proving v9 creates V1 tables and fills target-group, session, and set defaults without dropping legacy fields.
- [ ] **Step 2: Run the focused test** with `npm test -- src/db/appDb.test.ts`; confirm the v9 assertions fail.
- [ ] **Step 3: Add V1 record types and the Dexie v9 migration**, retaining legacy tables and indexes.
- [ ] **Step 4: Re-run the focused test** with `npm test -- src/db/appDb.test.ts`; confirm it passes.

### Task 3: Verify and publish

**Files:**
- Modify: files from Tasks 1 and 2

- [ ] **Step 1: Run** `npm test`, `npm run lint`, and `npm run build`.
- [ ] **Step 2: Inspect** `git diff --check` and `git status -sb`; stage only the V1 core docs, tests, and source files.
- [ ] **Step 3: Commit** with `feat: expand progression v1 core`.
- [ ] **Step 4: Push** `agent/gym-progression-v1` and open a draft PR against `main`.
