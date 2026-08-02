# Default Rest Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user choose a default rest duration in Settings and use it only when adding new exercises to a workout day.

**Architecture:** Add a small settings preference helper beside the theme helper, backed by `localStorage` with a 60-second fallback. `WorkoutDayDetailPage` reads the preference at the moment it creates a new `DayExerciseRecord`; existing persisted records and their per-exercise editor remain unchanged.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library.

---

### Task 1: Persist and validate the default-rest preference

**Files:**
- Create: `src/features/settings/restDuration.ts`
- Test: `src/features/settings/restDuration.test.ts`

- [ ] **Step 1: Write failing tests for fallback, valid persistence, and invalid storage.**

```ts
expect(getDefaultRestSeconds()).toBe(60);
setDefaultRestSeconds(90);
expect(getDefaultRestSeconds()).toBe(90);
localStorage.setItem('treeninguabiline-default-rest-seconds', '-1');
expect(getDefaultRestSeconds()).toBe(60);
```

- [ ] **Step 2: Run `npm test -- src/features/settings/restDuration.test.ts` and verify the test fails because the module does not exist.**

- [ ] **Step 3: Implement the smallest safe helper.**

```ts
export const DEFAULT_REST_SECONDS = 60;

export function getDefaultRestSeconds(): number { /* non-negative integer or fallback */ }
export function setDefaultRestSeconds(seconds: number): void { /* valid value only */ }
```

The helper must tolerate unavailable/throwing `localStorage` and must not persist negative or fractional values.

- [ ] **Step 4: Run the focused test and verify it passes. Commit:**

```powershell
git add src/features/settings/restDuration.ts src/features/settings/restDuration.test.ts
git commit -m "feat: persist default rest duration"
```

### Task 2: Expose the setting and consume it for newly added exercises

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/SettingsPage.test.tsx`
- Modify: `src/features/plans/WorkoutDayDetailPage.tsx`
- Modify: `src/features/plans/KavadPage.test.tsx`

- [ ] **Step 1: Write failing UI tests.**

```tsx
render(<SettingsPage />);
expect(screen.getByLabelText('Vaikimisi puhkeaeg (sek)')).toHaveValue(60);
await user.clear(screen.getByLabelText('Vaikimisi puhkeaeg (sek)'));
await user.type(screen.getByLabelText('Vaikimisi puhkeaeg (sek)'), '90');
expect(localStorage.getItem('treeninguabiline-default-rest-seconds')).toBe('90');
```

```tsx
setDefaultRestSeconds(90);
await user.click(screen.getByRole('button', { name: 'Lisa päeva' }));
expect((await db.dayExercises.toArray())[0].restSeconds).toBe(90);
```

- [ ] **Step 2: Run the two focused test files and verify both fail for the missing setting/control behavior.**

- [ ] **Step 3: Add a Settings `Treening` panel with a numeric, non-negative seconds field. Keep the previous valid value visible when the draft is empty or invalid.**

- [ ] **Step 4: Replace only the hard-coded `restSeconds: 60` used while adding a new day exercise with `getDefaultRestSeconds()`. Do not change existing records or the per-exercise editor.**

- [ ] **Step 5: Run focused tests, then full verification.**

```powershell
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit:**

```powershell
git add src/features/settings/SettingsPage.tsx src/features/settings/SettingsPage.test.tsx src/features/plans/WorkoutDayDetailPage.tsx src/features/plans/KavadPage.test.tsx
git commit -m "feat: use default rest duration for new exercises"
```

## Self-review

- Settings stay device-local, matching the approved scope; they are not added to CSV or JSON backup formats.
- The only creation path changed is a new day exercise; existing day exercises keep their own rest duration.
- The helper uses the same local-preference boundary as theme settings and has a deterministic 60-second fallback.
