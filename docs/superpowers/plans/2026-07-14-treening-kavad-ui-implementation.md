# Treening / Kavad UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the app into a daily-use `Treening` view and a separate `Kavad` management view, with `Treening` becoming the default landing page and showing the selected day's note plus exercise preview before starting a workout.

**Architecture:** Keep the existing Dexie data model and active-session flow, but reorganize routing and page responsibilities. `WorkoutPage` becomes a dual-state screen that shows either a day preview or the current active workout, while the current exercises management page is renamed into a dedicated `KavadPage` and keeps all setup behavior.

**Tech Stack:** React, React Router, TypeScript, Dexie, Vitest, Testing Library

---

### Task 1: Update app routing and bottom navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/BottomNav.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing navigation test**

```tsx
expect(screen.getByRole('link', { name: 'Treening' })).toBeInTheDocument();
expect(screen.getByRole('link', { name: 'Kavad' })).toBeInTheDocument();
expect(screen.queryByRole('link', { name: 'Harjutused' })).not.toBeInTheDocument();
expect(screen.queryByRole('link', { name: 'Tänane treening' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.tsx`
Expected: FAIL because the old labels and default route are still present.

- [ ] **Step 3: Update route defaults and nav labels**

```tsx
<Route index element={<Navigate to="/treening" replace />} />
<Route path="/kavad" element={<KavadPage />} />
```

```tsx
const items = [
  { to: '/treening', label: 'Treening' },
  { to: '/kavad', label: 'Kavad' },
  { to: '/ajalugu', label: 'Ajalugu' },
  { to: '/seaded', label: 'Seaded' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/BottomNav.tsx src/App.test.tsx
git commit -m "Update navigation for Treening and Kavad"
```

### Task 2: Split management UI into a dedicated `KavadPage`

**Files:**
- Create: `src/features/plans/KavadPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/exercises/ExercisesPage.test.tsx`

- [ ] **Step 1: Write the failing page-name expectations**

```tsx
expect(await screen.findByText('Kavad')).toBeInTheDocument();
expect(screen.getByText('Baasharjutused')).toBeInTheDocument();
expect(screen.getByText('Treeningpäevad')).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/exercises/ExercisesPage.test.tsx`
Expected: FAIL because the page still renders the old `Harjutused` heading or old route.

- [ ] **Step 3: Move/rename the management page without changing behavior**

```tsx
export function KavadPage() {
  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Register ja mallid</p>
          <h2>Kavad</h2>
        </div>
```

- [ ] **Step 4: Run the management tests**

Run: `npm run test -- src/features/exercises/ExercisesPage.test.tsx`
Expected: PASS after imports/test references are updated.

- [ ] **Step 5: Commit**

```bash
git add src/features/plans/KavadPage.tsx src/App.tsx src/features/exercises/ExercisesPage.test.tsx
git commit -m "Move management UI into Kavad page"
```

### Task 3: Add workout-day preview mode to the `Treening` page

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] **Step 1: Write the failing preview test**

```tsx
expect(await screen.findByRole('button', { name: 'Päev 1' })).toBeInTheDocument();
expect(screen.getByText('Õlale rahulik tempo')).toBeInTheDocument();
expect(screen.getByText('Chest Press')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Alusta treeningut' })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because inactive mode currently only shows generic start buttons.

- [ ] **Step 3: Implement selected-day preview state**

```tsx
const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
const selectedDay = (workoutDays ?? []).find((day) => day.id === selectedDayId) ?? workoutDays?.[0] ?? null;
const selectedItems = groupedDayExercises.get(selectedDay?.id ?? '') ?? [];
```

```tsx
{selectedDay?.notes ? <div className="panel"><p>{selectedDay.notes}</p></div> : null}
<ul className="stack-list">...</ul>
<button type="button" className="hero-button" onClick={() => void startWorkout(selectedDay.id)}>
  Alusta treeningut
</button>
```

- [ ] **Step 4: Run the workout tests**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Add day preview state to Treening page"
```

### Task 4: Add empty-state handling for preview mode

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] **Step 1: Write the failing empty-state tests**

```tsx
expect(await screen.findByText('Lisa esmalt treeningpäevad ja harjutused Kavad lehel.')).toBeInTheDocument();
expect(screen.queryByRole('button', { name: 'Alusta treeningut' })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because preview mode still assumes days exist.

- [ ] **Step 3: Add empty states for missing days and missing exercises**

```tsx
if (!activeSession && !workoutDays?.length) {
  return <p className="empty-card">Lisa esmalt treeningpäevad ja harjutused Kavad lehel.</p>;
}
```

```tsx
{selectedItems.length === 0 ? <p className="empty-card">Sellel päeval pole veel harjutusi.</p> : null}
```

- [ ] **Step 4: Run the workout tests**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Handle empty preview states on Treening page"
```

### Task 5: Keep preview and active-workout rendering visually distinct

**Files:**
- Modify: `src/styles.css`
- Modify: `src/features/workout/WorkoutPage.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] **Step 1: Write a structural test for preview cards**

```tsx
expect(await screen.findByText('Valitud päev')).toBeInTheDocument();
expect(screen.getByText('Päeva harjutused')).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because the preview headings/cards do not exist yet.

- [ ] **Step 3: Add preview section wrappers and compact styles**

```tsx
<div className="panel">
  <p className="eyebrow">Valitud päev</p>
  <h3>{selectedDay.name}</h3>
</div>
```

```css
.preview-list {
  display: grid;
  gap: 0.75rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles.css src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Polish Treening preview layout"
```

### Task 6: Update app-level and regression verification

**Files:**
- Modify: `src/App.test.tsx`
- Test: `src/features/exercises/ExercisesPage.test.tsx`
- Test: `src/features/workout/WorkoutPage.test.tsx`

- [ ] **Step 1: Add route/default regression coverage**

```tsx
render(
  <MemoryRouter initialEntries={['/']}>
    <App />
  </MemoryRouter>,
);
expect(await screen.findByText('Treening')).toBeInTheDocument();
```

- [ ] **Step 2: Run targeted tests**

Run: `npm run test -- src/App.test.tsx src/features/exercises/ExercisesPage.test.tsx src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 3: Run full verification**

Run: `npm run test`
Expected: `8 passed` or higher with `0 failed`

Run: `npm run build`
Expected: build completes successfully with Vite output and generated PWA files

- [ ] **Step 4: Commit**

```bash
git add src/App.test.tsx src/features/exercises/ExercisesPage.test.tsx src/features/workout/WorkoutPage.test.tsx
git commit -m "Verify Treening and Kavad UI split"
```
