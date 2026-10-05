# Workout and History UX Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the six reviewed workout and History interaction issues without changing persistence schema, progression rules, or the training-console design.

**Architecture:** Keep all state and storage contracts intact. `WorkoutPage` owns cross-exercise transient UI state (latest undo and rest timer), `ActiveExerciseCard` only changes conditional controls, and `HistoryPage` derives presentation from stored result status rather than progression thresholds.

**Tech Stack:** React 19, TypeScript, Dexie live queries, Vitest, Testing Library, Vite.

---

## File map

- `src/features/workout/WorkoutPage.tsx` — failure-form focus/validation, global undo placement, page-level timer rendering, completion-summary order.
- `src/features/workout/WorkoutPage.test.tsx` — integration regressions for saves, undo, timer continuity/reload, and completion order.
- `src/features/workout/ActiveExerciseCard.tsx` — hide only repetition-range repetition stepper.
- `src/features/workout/ActiveExerciseCard.test.tsx` — control-mode visibility regressions.
- `src/features/history/HistoryPage.tsx` — derive History success presentation from persisted set status.
- `src/features/history/HistoryPage.test.tsx` — range-status and genuine-failure presentation coverage.
- `src/styles.css` — only if existing classes need a small scoped page-level rest panel placement adjustment.

### Task 1: Failure form focus, visibility, and validation

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx:606-610, 1361-1400, 1542-1551`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] Write a failing integration test that opens `Ei tulnud täis`, expects `Tegelikud kordused` to receive focus, spies on `scrollIntoView`, clears the input, saves, and asserts a visible text error plus no `setResults` write.
- [ ] Run `npm test -- src/features/workout/WorkoutPage.test.tsx` and confirm the new assertion fails because the input is not focused and an empty value saves as zero.
- [ ] Add an input ref and a post-open effect which calls `focus()` and `scrollIntoView({ block: 'nearest' })`; add failure-form error state; reject `reps.trim() === ''`, non-finite values, and values below zero before `handleSetSave`.
- [ ] Re-run `npm test -- src/features/workout/WorkoutPage.test.tsx` and confirm the focused test passes.

### Task 2: Latest-set undo and persistent timer panel

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx:631-640, 889-909, 1014-1072`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] Write a failing test with two active session exercises: save the final result for the first, assert the second becomes active, click `Võta tagasi`, and assert the first result is deleted and its first set is active again.
- [ ] Run the focused test and confirm the undo control is absent after the active-exercise transition.
- [ ] Render the existing undo row at page/workspace scope whenever `lastSavedSet` exists; retain its exact delete-and-clear behavior and do not add history. Render the existing `rest-timer-panel` at page/workspace scope whenever the timer belongs to the active session, preserving its existing `Jätan vahele` callback.
- [ ] Add a failing timer test that saves a set, advances to another exercise, expects `Puhkus` and `Jätan vahele`, skips, and verifies persisted timer removal; add a reload test that preloads the existing storage payload and expects it visible.
- [ ] Re-run `npm test -- src/features/workout/WorkoutPage.test.tsx` and confirm both undo and timer regressions pass.

### Task 3: Target-mode controls and completion summary order

**Files:**
- Modify: `src/features/workout/ActiveExerciseCard.tsx:44-99`
- Modify: `src/features/workout/WorkoutPage.tsx:980-1012, 1619-1660`
- Test: `src/features/workout/ActiveExerciseCard.test.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] Write a failing card test that renders repetition `range` mode and asserts no `Korduste valik` stepper, while the weight control and range action buttons remain available; add fixed-repetition and duration-range assertions retaining their current controls.
- [ ] Run `npm test -- src/features/workout/ActiveExerciseCard.test.tsx` and confirm the range stepper assertion fails.
- [ ] Add a `repetitionRangeMode` condition so the repetitions control block is omitted only when `repMode === 'range'`; retain duration-range and both fixed modes unchanged.
- [ ] Add a failing completion-flow test that completes a workout and compares document order so the completion/progression summary precedes the normal no-active-session start content.
- [ ] Move only the existing completed-summary panel above normal start-workout content; do not change its decision calculation or contents.
- [ ] Re-run the focused card and page test files and confirm all mode and ordering assertions pass.

### Task 4: History recorded-status presentation

**Files:**
- Modify: `src/features/history/HistoryPage.tsx:11-38, 92-103, 191-192`
- Test: `src/features/history/HistoryPage.test.tsx`

- [ ] Write a failing History test for a completed `range` exercise whose persisted sets are all `success` below target maximum; assert it has the success class/text and not `✕ jäi puudu`. Add a failed-result fixture that still asserts failure text.
- [ ] Run `npm test -- src/features/history/HistoryPage.test.tsx` and confirm the successful-below-maximum case fails under the current threshold-based presentation.
- [ ] Derive presentation success/failure from recorded statuses and completed session state, leaving progression requirements as the existing secondary copy only. Do not call or modify progression helpers.
- [ ] Re-run `npm test -- src/features/history/HistoryPage.test.tsx` and confirm the new presentation tests pass.

### Task 5: Integrated verification and visual validation

**Files:**
- Modify: `docs/superpowers/plans/2026-10-05-workout-history-ux-cleanup.md`

- [ ] Run focused workout, History, timer, and completion tests: `npm test -- src/features/workout/WorkoutPage.test.tsx src/features/workout/ActiveExerciseCard.test.tsx src/features/history/HistoryPage.test.tsx`.
- [ ] Run `npm test`, `npm run lint`, `npx tsc -b`, `npm run build`, and `git diff --check`.
- [ ] Use the visual companion after implementation only: render representative mobile and desktop views for failure-form focus/visibility, post-final-set undo, cross-exercise timer, range control density, History range success, and completion-summary order. Record only observed results.
- [ ] Inspect the final diff manually, request a code review, and commit intended source, tests, and design documents as `fix: polish workout and history interactions`.
- [ ] Fast-forward current `main`, re-run the root suite, push normally, wait for Cloudflare Pages success, verify the deployed SHA, and perform non-mutating production smoke checks.
