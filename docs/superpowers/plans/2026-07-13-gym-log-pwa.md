# Gym Log PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first Estonian-language gym workout log PWA with day templates, per-set workout logging, progression rules, history, and import/export.

**Architecture:** Scaffold a Vite React TypeScript app, store all data in IndexedDB through Dexie, isolate progression and import/export logic in testable domain modules, and build four mobile-first views around a persistent bottom navigation. PWA installability and offline behavior are handled with `vite-plugin-pwa`.

**Tech Stack:** Vite, React, TypeScript, React Router, Dexie, vite-plugin-pwa, Vitest, Testing Library, ESLint

---

### Task 1: Scaffold project and tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig*.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/*`

- [ ] **Step 1: Scaffold the Vite React TypeScript project**

Run: `npm create vite@latest . -- --template react-ts`
Expected: Vite app files created in the workspace root

- [ ] **Step 2: Install runtime and test dependencies**

Run: `npm install react-router-dom dexie dexie-react-hooks`
Run: `npm install -D vite-plugin-pwa vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`
Expected: dependencies installed without unresolved peer dependency errors

- [ ] **Step 3: Add PWA and test config**

Code to add:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Jousaali Logi',
        short_name: 'JLogi',
        theme_color: '#111827',
        background_color: '#0b1220',
        display: 'standalone',
        start_url: '/',
        lang: 'et',
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Verify the scaffold builds before feature work**

Run: `npm run build`
Expected: production build succeeds

### Task 2: Write failing domain tests for progression and session snapshots

**Files:**
- Create: `src/domain/progression.test.ts`
- Create: `src/domain/session.test.ts`
- Create: `src/domain/export.test.ts`

- [ ] **Step 1: Write the failing progression tests**

```ts
import { describe, expect, it } from 'vitest';
import { computeNextTarget } from './progression';

describe('computeNextTarget', () => {
  it('raises weight for range mode when every set reaches the max reps', () => {
    const result = computeNextTarget(
      { repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 50, weightStep: 5, targetSets: 3 },
      [15, 15, 15],
    );

    expect(result.currentWeight).toBe(55);
    expect(result.targetRepsMin).toBe(10);
    expect(result.targetRepsMax).toBe(15);
  });
});
```

- [ ] **Step 2: Verify the progression tests fail**

Run: `npm run test -- src/domain/progression.test.ts`
Expected: FAIL because `./progression` does not exist yet

- [ ] **Step 3: Write failing snapshot and export tests**

```ts
import { describe, expect, it } from 'vitest';
import { buildSessionExercises } from './session';
import { serializeBackup } from './backup';

describe('buildSessionExercises', () => {
  it('copies day exercise data into immutable session snapshots', () => {
    const snapshots = buildSessionExercises([
      {
        id: 'de1',
        exerciseId: 'e1',
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 45,
        weightStep: 5,
        sortOrder: 0,
      },
    ]);

    expect(snapshots[0].dayExerciseId).toBe('de1');
    expect(snapshots[0].exerciseName).toBe('Chest Press');
  });
});

describe('serializeBackup', () => {
  it('exports all table collections into a portable backup payload', () => {
    const payload = serializeBackup({
      exercises: [{ id: 'e1', name: 'Chest Press', machineNumber: '12' }],
      workoutDays: [],
      dayExercises: [],
      sessions: [],
      sessionExercises: [],
      setResults: [],
    });

    expect(payload.exercises).toHaveLength(1);
  });
});
```

- [ ] **Step 4: Verify the snapshot and export tests fail**

Run: `npm run test -- src/domain/session.test.ts src/domain/export.test.ts`
Expected: FAIL because the domain modules do not exist yet

### Task 3: Implement domain modules to satisfy tests

**Files:**
- Create: `src/domain/progression.ts`
- Create: `src/domain/session.ts`
- Create: `src/domain/backup.ts`
- Create: `src/domain/types.ts`

- [ ] **Step 1: Implement shared domain types and minimal progression logic**

```ts
export type RepMode = 'fixed' | 'range';

export type ProgressionTarget = {
  repMode: RepMode;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
};
```

```ts
export function computeNextTarget(target: ProgressionTarget, reps: number[]) {
  const allSetsAtMax = reps.length === target.targetSets && reps.every((value) => value >= target.targetRepsMax);
  const allSetsAtFixed = reps.length === target.targetSets && reps.every((value) => value >= target.targetRepsMin);

  if (target.repMode === 'range' && allSetsAtMax) {
    return { ...target, currentWeight: target.currentWeight + target.weightStep };
  }

  if (target.repMode === 'fixed' && allSetsAtFixed) {
    return { ...target, currentWeight: target.currentWeight + target.weightStep };
  }

  return { ...target };
}
```

- [ ] **Step 2: Implement session snapshot creation and backup serialization**

```ts
export function buildSessionExercises(dayExercises: SessionSeed[]) {
  return dayExercises.map((item, index) => ({
    dayExerciseId: item.id,
    exerciseName: item.exerciseName,
    machineNumber: item.machineNumber,
    targetSets: item.targetSets,
    repMode: item.repMode,
    targetRepsMin: item.targetRepsMin,
    targetRepsMax: item.targetRepsMax,
    currentWeight: item.currentWeight,
    weightStep: item.weightStep,
    orderIndex: index,
  }));
}

export function serializeBackup(data: BackupData) {
  return structuredClone(data);
}
```

- [ ] **Step 3: Verify the domain tests pass**

Run: `npm run test -- src/domain/progression.test.ts src/domain/session.test.ts src/domain/export.test.ts`
Expected: PASS

### Task 4: Add IndexedDB schema and repository helpers

**Files:**
- Create: `src/db/appDb.ts`
- Create: `src/db/repositories.ts`
- Create: `src/db/types.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, it } from 'vitest';
import { createInMemorySeed } from './repositories';

describe('createInMemorySeed', () => {
  it('creates starter workout days for a new user', () => {
    const seed = createInMemorySeed();
    expect(seed.workoutDays.map((day) => day.name)).toEqual(['Paev 1', 'Paev 2']);
  });
});
```

- [ ] **Step 2: Verify the repository test fails**

Run: `npm run test -- src/db/repositories.test.ts`
Expected: FAIL because repository helpers do not exist yet

- [ ] **Step 3: Implement Dexie schema and seed helpers**

Code to include:

```ts
export class AppDb extends Dexie {
  exercises!: Table<ExerciseRecord, string>;
  workoutDays!: Table<WorkoutDayRecord, string>;
  dayExercises!: Table<DayExerciseRecord, string>;
  sessions!: Table<WorkoutSessionRecord, string>;
  sessionExercises!: Table<WorkoutSessionExerciseRecord, string>;
  setResults!: Table<SetResultRecord, string>;

  constructor() {
    super('gym-log-db');
    this.version(1).stores({
      exercises: 'id, name, machineNumber, updatedAt',
      workoutDays: 'id, sortOrder, isArchived, updatedAt',
      dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
      sessions: 'id, workoutDayId, status, performedAt',
      sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex',
      setResults: 'id, workoutSessionExerciseId, setNumber',
    });
  }
}
```

- [ ] **Step 4: Verify the repository test passes**

Run: `npm run test -- src/db/repositories.test.ts`
Expected: PASS

### Task 5: Build the app shell and navigation

**Files:**
- Modify: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Write the failing shell test**

```ts
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('shows the four main navigation tabs in Estonian', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: 'Harjutused' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tanane treening' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ajalugu' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Seaded' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the shell test fails**

Run: `npm run test -- src/App.test.tsx`
Expected: FAIL because the app shell has not been built yet

- [ ] **Step 3: Implement the shell, routes, and dark mobile layout**

Code to include:

```tsx
<Routes>
  <Route element={<Layout />}>
    <Route index element={<Navigate to="/harjutused" replace />} />
    <Route path="/harjutused" element={<ExercisesPage />} />
    <Route path="/treening" element={<WorkoutPage />} />
    <Route path="/ajalugu" element={<HistoryPage />} />
    <Route path="/seaded" element={<SettingsPage />} />
  </Route>
</Routes>
```

- [ ] **Step 4: Verify the shell test passes**

Run: `npm run test -- src/App.test.tsx`
Expected: PASS

### Task 6: Build exercises and workout day management

**Files:**
- Create: `src/features/exercises/ExercisesPage.tsx`
- Create: `src/features/exercises/ExerciseForm.tsx`
- Create: `src/features/exercises/WorkoutDayEditor.tsx`
- Create: `src/features/exercises/useExercisesPage.ts`

- [ ] **Step 1: Write the failing exercises page test**

```ts
test('allows creating an exercise and assigning it to a workout day', async () => {
  render(<ExercisesPage />);

  await user.click(screen.getByRole('button', { name: 'Lisa harjutus' }));
  await user.type(screen.getByLabelText('Harjutuse nimi'), 'Leg Press');
  await user.type(screen.getByLabelText('Masina number'), '17');
  await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

  expect(await screen.findByText('Leg Press')).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the exercises test fails**

Run: `npm run test -- src/features/exercises/ExercisesPage.test.tsx`
Expected: FAIL because the page does not exist yet

- [ ] **Step 3: Implement exercise CRUD and day configuration UI**

Implementation must include:

```tsx
<button type="button">Lisa harjutus</button>
<button type="button">Lisa treeningpaev</button>
```

And a day exercise editor with fields:

```tsx
['Seeriate arv', 'Korduste mood', 'Min kordused', 'Max kordused', 'Raskus (kg)', 'Raskuse samm (kg)']
```

- [ ] **Step 4: Verify the exercises test passes**

Run: `npm run test -- src/features/exercises/ExercisesPage.test.tsx`
Expected: PASS

### Task 7: Build today’s workout flow

**Files:**
- Create: `src/features/workout/WorkoutPage.tsx`
- Create: `src/features/workout/WorkoutCard.tsx`
- Create: `src/features/workout/FailureRepInput.tsx`
- Create: `src/features/workout/useWorkoutSession.ts`

- [ ] **Step 1: Write the failing workout flow test**

```ts
test('records a failed set with actual reps and shows the generated next target', async () => {
  render(<WorkoutPage />);

  await user.click(screen.getByRole('button', { name: 'Alusta Paev 1' }));
  await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
  await user.click(screen.getByRole('button', { name: 'Ei tulnud tais' }));
  await user.type(screen.getByLabelText('Tegelikud kordused'), '12');
  await user.click(screen.getByRole('button', { name: 'Salvesta seeria' }));

  expect(await screen.findByText(/Jargmine siht/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the workout flow test fails**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because workout flow is not implemented yet

- [ ] **Step 3: Implement active session creation, per-set logging, and completion summary**

Implementation must include:

```tsx
<button type="button">Tehtud</button>
<button type="button">Ei tulnud tais</button>
<label htmlFor="completedReps">Tegelikud kordused</label>
```

- [ ] **Step 4: Verify the workout flow test passes**

Run: `npm run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

### Task 8: Build history and settings with import/export

**Files:**
- Create: `src/features/history/HistoryPage.tsx`
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/settings/exportCsv.ts`

- [ ] **Step 1: Write the failing settings export test**

```ts
import { describe, expect, it } from 'vitest';
import { toCsv } from './exportCsv';

describe('toCsv', () => {
  it('serializes row objects into CSV text with a header row', () => {
    expect(toCsv([{ name: 'Leg Press', machineNumber: '17' }])).toContain('name,machineNumber');
  });
});
```

- [ ] **Step 2: Verify the export test fails**

Run: `npm run test -- src/features/settings/exportCsv.test.ts`
Expected: FAIL because the export utility does not exist yet

- [ ] **Step 3: Implement history listing and settings import/export controls**

Implementation must include buttons:

```tsx
['Ekspordi CSV', 'Ekspordi varundus', 'Impordi varundus']
```

- [ ] **Step 4: Verify the export test passes**

Run: `npm run test -- src/features/settings/exportCsv.test.ts`
Expected: PASS

### Task 9: Finish docs and run full verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README with setup and build instructions**

README must cover:

```md
- npm install
- npm run dev
- npm run test
- npm run lint
- npm run build
- PWA install note
- CSV and backup note
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: PASS
