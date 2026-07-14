# Progressioon: järjestikused õnnestumised Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-day-exercise setting that controls how many consecutive successful completed sessions are required before the target increases.

**Architecture:** Extend day-exercise and session snapshot records with `successesRequired`, migrate existing IndexedDB data to default `1`, and move progression from “look only at the current session” to “inspect consecutive completed sessions for the same dayExerciseId and same target.” Keep the UI change local to `Kavad` and reuse the existing workout completion flow for the new progression calculation.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library

---

### Task 1: Extend persisted types and Dexie migration

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/appDb.ts`
- Test: `src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: Add the failing type/test expectations**

```ts
type DayExerciseRecord = {
  successesRequired: number;
};

type WorkoutSessionExerciseRecord = {
  successesRequired: number;
};
```

- [ ] **Step 2: Run build to verify the type graph fails**

Run: `npm run build`
Expected: FAIL because code constructing those records does not provide `successesRequired`.

- [ ] **Step 3: Add the field and IndexedDB migration**

```ts
export type DayExerciseRecord = {
  // ...
  successesRequired: number;
};
```

```ts
this.version(3)
  .stores({
    exercises: 'id, name, machineNumber, updatedAt',
    workoutDays: 'id, sortOrder, isArchived, updatedAt',
    dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
    sessions: 'id, workoutDayId, status, performedAt',
    sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex',
    setResults: 'id, workoutSessionExerciseId, setNumber',
  })
  .upgrade((tx) =>
    Promise.all([
      tx.table('dayExercises').toCollection().modify((row) => {
        row.successesRequired ??= 1;
      }),
      tx.table('sessionExercises').toCollection().modify((row) => {
        row.successesRequired ??= 1;
      }),
    ]),
  );
```

- [ ] **Step 4: Run build to verify it passes**

Run: `npm run build`
Expected: PASS or new failures only from downstream missing field writes.

- [ ] **Step 5: Commit**

```bash
git add src/db/types.ts src/db/appDb.ts
git commit -m "Add successesRequired to persisted workout records"
```

### Task 2: Thread `successesRequired` through day setup and session snapshots

**Files:**
- Modify: `src/features/exercises/ExercisesPage.tsx`
- Modify: `src/domain/types.ts`
- Modify: `src/domain/session.ts`
- Test: `src/domain/session.test.ts`
- Test: `src/features/exercises/ExercisesPage.test.tsx`

- [ ] **Step 1: Write the failing session snapshot test**

```ts
expect(snapshots[0].successesRequired).toBe(2);
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm run test -- src/domain/session.test.ts src/features/exercises/ExercisesPage.test.tsx`
Expected: FAIL because snapshot creation and UI defaults do not include the field.

- [ ] **Step 3: Add default value and wire the field through**

```ts
await db.dayExercises.add({
  // ...
  successesRequired: 1,
});
```

```ts
type SessionSeed = {
  successesRequired: number;
};
```

```ts
return dayExercises.map((item, index) => ({
  // ...
  successesRequired: item.successesRequired,
  orderIndex: index,
}));
```

- [ ] **Step 4: Add the `Kavad` editor input**

```tsx
<NumberField
  label="Õnnestumisi enne tõusu"
  value={item.successesRequired}
  onChange={(value) => void onUpdate(item.id, { successesRequired: Math.max(1, value) })}
/>
```

- [ ] **Step 5: Run targeted tests**

Run: `npm run test -- src/domain/session.test.ts src/features/exercises/ExercisesPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/exercises/ExercisesPage.tsx src/domain/types.ts src/domain/session.ts src/domain/session.test.ts src/features/exercises/ExercisesPage.test.tsx
git commit -m "Thread successesRequired through setup and session snapshots"
```

### Task 3: Extract consecutive-success progression evaluation

**Files:**
- Create: `src/domain/consecutiveProgression.ts`
- Create: `src/domain/consecutiveProgression.test.ts`
- Modify: `src/domain/progression.ts`
- Modify: `src/domain/types.ts`

- [ ] **Step 1: Write failing domain tests for consecutive success rules**

```ts
it('does not raise target with successesRequired 2 after only one successful session', () => {
  expect(shouldAdvanceTarget(/* one success */)).toBe(false);
});

it('raises target with successesRequired 2 after two consecutive successful sessions on the same target', () => {
  expect(shouldAdvanceTarget(/* two successes */)).toBe(true);
});

it('resets the streak after a failure', () => {
  expect(shouldAdvanceTarget(/* success, failure, success */)).toBe(false);
});
```

- [ ] **Step 2: Run the new domain test to verify failure**

Run: `npm run test -- src/domain/consecutiveProgression.test.ts`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement a focused evaluator**

```ts
export type HistoricalAttempt = {
  matchedTarget: boolean;
  success: boolean;
};

export function countConsecutiveSuccesses(attempts: HistoricalAttempt[]) {
  let count = 0;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (!attempt.matchedTarget || !attempt.success) {
      break;
    }
    count += 1;
  }
  return count;
}
```

- [ ] **Step 4: Keep `computeNextTarget` focused on target math only**

```ts
export function computeNextTarget(target: ProgressionTarget, shouldAdvance: boolean) {
  if (!shouldAdvance) {
    return isDurationMode(target.repMode) ? { ...target, currentWeight: 0 } : { ...target };
  }
  // existing weight/duration increment rules
}
```

- [ ] **Step 5: Run the domain tests**

Run: `npm run test -- src/domain/consecutiveProgression.test.ts src/domain/progression.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/consecutiveProgression.ts src/domain/consecutiveProgression.test.ts src/domain/progression.ts src/domain/types.ts src/domain/progression.test.ts
git commit -m "Extract consecutive success progression rules"
```

### Task 4: Apply the historical progression rule during workout completion

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] **Step 1: Write the failing workout completion tests**

```ts
it('keeps the same target when successesRequired is 2 and this is only the first successful completion', async () => {
  // seed historical sessions = none, current successful workout = one success
  // expect updated day exercise weight unchanged
});

it('raises the target on the second consecutive successful completion when successesRequired is 2', async () => {
  // seed one matching successful historical completed session
  // finish current successful workout
  // expect updated day exercise weight increased
});
```

- [ ] **Step 2: Run the workout tests to verify failure**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because completion still uses only current-session results.

- [ ] **Step 3: Build the historical attempt list from completed session snapshots**

```ts
const historicalSessionExercises = await db.sessionExercises
  .where('dayExerciseId')
  .equals(item.dayExerciseId)
  .toArray();
```

```ts
const completedSessionIds = new Set(
  (await db.sessions.where('status').equals('completed').toArray()).map((session) => session.id),
);
```

```ts
const attempts = historicalItems
  .filter((entry) => completedSessionIds.has(entry.workoutSessionId))
  .map((entry) => ({
    matchedTarget:
      entry.repMode === item.repMode &&
      entry.targetRepsMin === item.targetRepsMin &&
      entry.targetRepsMax === item.targetRepsMax &&
      entry.currentWeight === item.currentWeight,
    success: isSuccessfulAttempt(entry, resultsBySessionExercise.get(entry.id) ?? []),
  }));
```

- [ ] **Step 4: Append the current attempt and compute `shouldAdvance`**

```ts
const currentAttemptSuccess = isSuccessfulAttempt(item, reps);
const shouldAdvance =
  currentAttemptSuccess &&
  countConsecutiveSuccesses([
    ...attempts,
    { matchedTarget: true, success: currentAttemptSuccess },
  ]) >= item.successesRequired;
```

- [ ] **Step 5: Run the workout tests**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Use consecutive completed sessions for progression"
```

### Task 5: Support import/export and backward compatibility

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/db/repositories.ts`
- Test: `src/domain/backup.test.ts`

- [ ] **Step 1: Write the failing import/backward-compatibility test**

```ts
expect(importedDayExercise.successesRequired).toBe(1);
expect(importedSessionExercise.successesRequired).toBe(1);
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm run test -- src/domain/backup.test.ts`
Expected: FAIL because missing fields are not defaulted.

- [ ] **Step 3: Add import defaults**

```ts
successesRequired: Number(row.successesRequired ?? 1),
```

```ts
await db.dayExercises.bulkAdd(
  payload.dayExercises.map((item) => ({ ...item, successesRequired: item.successesRequired ?? 1 })),
);
```

- [ ] **Step 4: Run the backup/settings tests**

Run: `npm run test -- src/domain/backup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/SettingsPage.tsx src/db/repositories.ts src/domain/backup.test.ts
git commit -m "Add successesRequired to import and backup flows"
```

### Task 6: Final regression and verification

**Files:**
- Modify: `src/features/exercises/ExercisesPage.test.tsx`
- Modify: `src/features/workout/WorkoutPage.test.tsx`
- Modify: `src/domain/progression.test.ts`

- [ ] **Step 1: Add regression coverage for default value `1`**

```ts
expect(createdDayExercise.successesRequired).toBe(1);
```

- [ ] **Step 2: Add regression coverage for editable `successesRequired`**

```ts
await user.clear(screen.getByLabelText('Õnnestumisi enne tõusu'));
await user.type(screen.getByLabelText('Õnnestumisi enne tõusu'), '2');
expect(updated.successesRequired).toBe(2);
```

- [ ] **Step 3: Run targeted verification**

Run: `npm run test -- src/domain/progression.test.ts src/domain/consecutiveProgression.test.ts src/features/exercises/ExercisesPage.test.tsx src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 4: Run full verification**

Run: `npm run test`
Expected: all tests pass with `0 failed`

Run: `npm run build`
Expected: Vite production build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/domain/progression.test.ts src/features/exercises/ExercisesPage.test.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Verify consecutive success progression"
```
