# Exercise Notes And Change Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline notes panel for the active workout exercise that stores user notes and shows a date-ordered change log for notes plus target changes made by the user or workout automation.

**Architecture:** Introduce a new `exerciseEvents` Dexie table keyed by the base `exerciseId`, route all note and change-log writes through small repository helpers, and keep Workout UI responsible only for rendering the panel and invoking those helpers. Automation logging happens at the same point where next targets are computed so the persisted log reflects the exact values applied to `dayExercises`.

**Tech Stack:** React, TypeScript, Dexie, Vitest, Testing Library, oxlint, Vite PWA.

---

### Task 1: Add Exercise Event Storage

**Files:**
- Modify: `src/db/types.ts`
- Modify: `src/db/appDb.ts`
- Modify: `src/db/repositories.ts`
- Modify: `src/db/repositories.test.ts`
- Modify: `src/domain/backup.ts`
- Modify: `src/domain/backup.test.ts`

- [ ] **Step 1: Write the failing repository test for event import defaults**

Add a test to `src/db/repositories.test.ts` that imports a backup containing one `exerciseEvents` row and verifies it survives import with nullable fields defaulted correctly.

```ts
  it('imports exercise events and preserves actor metadata', async () => {
    const seed = createInMemorySeed();

    await importBackup({
      ...seed,
      exerciseEvents: [
        {
          id: 'event-1',
          exerciseId: 'exercise-1',
          sessionExerciseId: null,
          createdAt: '2026-07-27T10:00:00.000Z',
          type: 'note',
          actor: 'user',
          field: null,
          fromValue: null,
          toValue: null,
          noteText: 'Hoia küünarnukid all',
        },
      ],
    } as typeof seed & {
      exerciseEvents: Array<{
        id: string;
        exerciseId: string;
        sessionExerciseId: string | null;
        createdAt: string;
        type: 'note' | 'change';
        actor: 'user' | 'automation';
        field: 'targetSets' | 'targetReps' | 'currentWeight' | null;
        fromValue: string | null;
        toValue: string | null;
        noteText: string | null;
      }>;
    });

    const events = await db.table('exerciseEvents').toArray();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: 'user',
      noteText: 'Hoia küünarnukid all',
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/db/repositories.test.ts`
Expected: FAIL because `exerciseEvents` is missing from the types, backup payload, or Dexie schema.

- [ ] **Step 3: Add the new event record type and backup shape**

Update `src/db/types.ts` so backup payloads include `exerciseEvents`.

```ts
export type ExerciseEventField = 'targetSets' | 'targetReps' | 'currentWeight';

export type ExerciseEventRecord = {
  id: string;
  exerciseId: string;
  sessionExerciseId: string | null;
  createdAt: string;
  type: 'note' | 'change';
  actor: 'user' | 'automation';
  field: ExerciseEventField | null;
  fromValue: string | null;
  toValue: string | null;
  noteText: string | null;
};

export type BackupPayload = {
  exercises: ExerciseRecord[];
  workoutDays: WorkoutDayRecord[];
  dayExercises: DayExerciseRecord[];
  sessions: WorkoutSessionRecord[];
  sessionExercises: WorkoutSessionExerciseRecord[];
  setResults: SetResultRecord[];
  exerciseEvents: ExerciseEventRecord[];
};
```

- [ ] **Step 4: Add Dexie table and migration**

Update `src/db/appDb.ts` with a new table and schema version.

```ts
  exerciseEvents!: Table<ExerciseEventRecord, string>;

  this.version(6)
    .stores({
      exercises: 'id, name, machineNumber, updatedAt',
      workoutDays: 'id, sortOrder, isArchived, updatedAt',
      dayExercises: 'id, workoutDayId, exerciseId, sortOrder, updatedAt',
      sessions: 'id, workoutDayId, status, performedAt',
      sessionExercises: 'id, workoutSessionId, dayExerciseId, orderIndex, performedOrder',
      setResults: 'id, workoutSessionExerciseId, setNumber',
      exerciseEvents: 'id, exerciseId, createdAt, type, actor',
    });
```

- [ ] **Step 5: Add backup export/import support and repository helpers**

Extend `src/db/repositories.ts` to export/import `exerciseEvents` and add small helper APIs for creating notes and changes.

```ts
export async function addExerciseNote(input: {
  exerciseId: string;
  sessionExerciseId?: string | null;
  noteText: string;
}) {
  const noteText = input.noteText.trim();
  if (!noteText) return;

  await db.exerciseEvents.add({
    id: createId('exercise-event'),
    exerciseId: input.exerciseId,
    sessionExerciseId: input.sessionExerciseId ?? null,
    createdAt: nowIso(),
    type: 'note',
    actor: 'user',
    field: null,
    fromValue: null,
    toValue: null,
    noteText,
  });
}

export async function addExerciseChangeEvent(input: {
  exerciseId: string;
  sessionExerciseId?: string | null;
  actor: 'user' | 'automation';
  field: 'targetSets' | 'targetReps' | 'currentWeight';
  fromValue: string;
  toValue: string;
}) {
  if (input.fromValue === input.toValue) return;

  await db.exerciseEvents.add({
    id: createId('exercise-event'),
    exerciseId: input.exerciseId,
    sessionExerciseId: input.sessionExerciseId ?? null,
    createdAt: nowIso(),
    type: 'change',
    actor: input.actor,
    field: input.field,
    fromValue: input.fromValue,
    toValue: input.toValue,
    noteText: null,
  });
}
```

- [ ] **Step 6: Run focused tests to verify they pass**

Run: `npm.cmd run test -- src/db/repositories.test.ts src/domain/backup.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/db/appDb.ts src/db/repositories.ts src/db/repositories.test.ts src/domain/backup.ts src/domain/backup.test.ts
git commit -m "Add exercise event storage"
```

### Task 2: Add Backup CSV Support For Exercise Events

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/exportCsv.test.ts`

- [ ] **Step 1: Write the failing CSV coverage test**

Add a CSV round-trip test in `src/features/settings/exportCsv.test.ts` for an `exerciseEvents` row containing commas and nullable columns.

```ts
it('round-trips exercise event rows with nullable fields', () => {
  const csv = toCsv([
    {
      id: 'event-1',
      exerciseId: 'exercise-1',
      sessionExerciseId: '',
      createdAt: '2026-07-27T10:00:00.000Z',
      type: 'note',
      actor: 'user',
      field: '',
      fromValue: '',
      toValue: '',
      noteText: 'Hoia tempo, ära tõmble',
    },
  ]);

  expect(parseCsv(csv)).toEqual([
    {
      id: 'event-1',
      exerciseId: 'exercise-1',
      sessionExerciseId: '',
      createdAt: '2026-07-27T10:00:00.000Z',
      type: 'note',
      actor: 'user',
      field: '',
      fromValue: '',
      toValue: '',
      noteText: 'Hoia tempo, ära tõmble',
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails or reveals missing wiring**

Run: `npm.cmd run test -- src/features/settings/exportCsv.test.ts src/features/settings/SettingsPage.test.tsx`
Expected: FAIL after adding Settings wiring assertions, or PASS for parser but missing export/import calls in UI.

- [ ] **Step 3: Add export/import handling for `exerciseEvents`**

Modify `src/features/settings/SettingsPage.tsx` to include a new CSV file.

```ts
        case 'harjutuse-sundmused.csv':
          next.exerciseEvents = rows.map((row) => ({
            id: String(row.id ?? ''),
            exerciseId: String(row.exerciseId ?? ''),
            sessionExerciseId:
              row.sessionExerciseId === undefined || row.sessionExerciseId === ''
                ? null
                : String(row.sessionExerciseId),
            createdAt: String(row.createdAt ?? ''),
            type: row.type === 'change' ? 'change' : 'note',
            actor: row.actor === 'automation' ? 'automation' : 'user',
            field:
              row.field === 'targetSets' || row.field === 'targetReps' || row.field === 'currentWeight'
                ? row.field
                : null,
            fromValue: row.fromValue === undefined || row.fromValue === '' ? null : String(row.fromValue),
            toValue: row.toValue === undefined || row.toValue === '' ? null : String(row.toValue),
            noteText: row.noteText === undefined || row.noteText === '' ? null : String(row.noteText),
          }));
          break;
```

Also add export:

```ts
downloadText('harjutuse-sundmused.csv', toCsv(payload.exerciseEvents), 'text/csv');
```

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd run test -- src/features/settings/exportCsv.test.ts src/features/settings/SettingsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/SettingsPage.tsx src/features/settings/exportCsv.test.ts
git commit -m "Export and import exercise events"
```

### Task 3: Add Workout Notes UI And Change Logging

**Files:**
- Modify: `src/features/workout/WorkoutPage.tsx`
- Modify: `src/features/workout/WorkoutPage.test.tsx`
- Modify: `src/styles.css`
- Optional create: `src/features/workout/exerciseEventFormatting.ts`

- [ ] **Step 1: Write the failing UI test for the notes panel**

Add a WorkoutPage test that seeds one event, opens the notes panel, and asserts both history and note creation flow.

```ts
it('shows exercise notes history and lets the user add a note', async () => {
  // seed active session + session exercise + existing exerciseEvents note
  render(<WorkoutPage />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Märkmed' }));

  expect(screen.getByText('Sama harjutuse märkmed ja muudatused')).toBeInTheDocument();
  expect(screen.getByText(/Hoia küünarnukid all/)).toBeInTheDocument();

  await user.type(screen.getByLabelText('Lisa märkus'), 'Uus märkus');
  await user.click(screen.getByRole('button', { name: 'Salvesta märkus' }));

  expect(await screen.findByText(/Uus märkus/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Write the failing automation logging test**

Add a test that finishes a workout, advances weight, and verifies an `exerciseEvents` row exists with `actor: 'automation'`.

```ts
it('logs automation target changes when workout completion updates the next target', async () => {
  // seed completed + active session exactly like the progression tests
  render(<WorkoutPage />);
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
  await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
  await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
  await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

  const events = await db.exerciseEvents.toArray();
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        actor: 'automation',
        field: 'currentWeight',
        fromValue: '60 kg',
        toValue: '65 kg',
      }),
    ]),
  );
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm.cmd run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: FAIL because the `Märkmed` button, event reads, and automation logs do not exist yet.

- [ ] **Step 4: Add formatting helpers and log reads**

Add a small helper or local functions that:

```ts
function formatTargetReps(mode: RepMode, min: number, max: number) {
  return min === max ? String(min) : `${min}-${max}`;
}

function formatExerciseEvent(event: ExerciseEventRecord) {
  if (event.type === 'note') {
    return event.noteText ?? '';
  }

  const label =
    event.field === 'targetSets'
      ? 'Seeriad'
      : event.field === 'targetReps'
        ? 'Kordused'
        : 'Raskus';
  return `${label} ${event.fromValue} -> ${event.toValue}`;
}
```

- [ ] **Step 5: Add notes panel state and rendering**

Extend `WorkoutPage.tsx` to:

```ts
  const [notesOpenExerciseId, setNotesOpenExerciseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const exerciseEvents = useLiveQuery(() => db.exerciseEvents.toArray(), []);

  const activeExerciseBaseId = nextExercise?.dayExerciseId
    ? (dayExercises ?? []).find((item) => item.id === nextExercise.dayExerciseId)?.exerciseId ?? null
    : null;

  const activeExerciseEvents = useMemo(
    () =>
      activeExerciseBaseId
        ? (exerciseEvents ?? [])
            .filter((item) => item.exerciseId === activeExerciseBaseId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    [activeExerciseBaseId, exerciseEvents],
  );
```

Render:

```tsx
<button
  type="button"
  className="secondary-button"
  onClick={() => {
    setNotesOpenExerciseId((current) => (current === nextExercise.id ? null : nextExercise.id));
    setNoteDraft('');
  }}
>
  Märkmed
</button>

{notesOpenExerciseId === nextExercise.id ? (
  <div className="inline-notes-panel">
    <h4>Sama harjutuse märkmed ja muudatused</h4>
    <label htmlFor="exerciseNote">Lisa märkus
      <textarea
        id="exerciseNote"
        value={noteDraft}
        onChange={(event) => setNoteDraft(event.target.value)}
      />
    </label>
    <button
      type="button"
      className="primary-button"
      onClick={async () => {
        if (!activeExerciseBaseId) return;
        await addExerciseNote({
          exerciseId: activeExerciseBaseId,
          sessionExerciseId: nextExercise.id,
          noteText: noteDraft,
        });
        setNoteDraft('');
      }}
    >
      Salvesta märkus
    </button>
    <ul className="stack-list">
      {activeExerciseEvents.length === 0 ? (
        <li className="empty-card">Selle harjutuse kohta veel märkmeid ega muudatusi ei ole.</li>
      ) : (
        activeExerciseEvents.map((item) => (
          <li key={item.id} className={`list-card exercise-event-card event-${item.type} event-${item.actor}`}>
            <strong>{new Date(item.createdAt).toLocaleString('et-EE')}</strong>
            <span>{item.actor === 'automation' ? 'Automaatika' : 'Kasutaja'}</span>
            <span>{item.type === 'note' ? `Märkus: ${item.noteText}` : formatExerciseEvent(item)}</span>
          </li>
        ))
      )}
    </ul>
  </div>
) : null}
```

- [ ] **Step 6: Log user weight changes and automation-applied target changes**

Update the user weight save path and the workout completion path to call repository helpers.

```ts
async function updateSessionExerciseWeight(input: {
  id: string;
  exerciseId: string;
  currentWeight: number;
  previousWeight: number;
}) {
  await db.sessionExercises.update(input.id, { currentWeight: input.currentWeight });
  await addExerciseChangeEvent({
    exerciseId: input.exerciseId,
    sessionExerciseId: input.id,
    actor: 'user',
    field: 'currentWeight',
    fromValue: `${input.previousWeight} kg`,
    toValue: `${input.currentWeight} kg`,
  });
}
```

Inside `completeWorkout`, after `nextTarget` is calculated and before updating `dayExercises`:

```ts
      await addExerciseChangeEvent({
        exerciseId: dayExercise.exerciseId,
        sessionExerciseId: item.id,
        actor: 'automation',
        field: 'targetSets',
        fromValue: String(previous.targetSets),
        toValue: String(nextTarget.targetSets),
      });
```

Do the same for `targetReps` and `currentWeight`, using formatted values, but only when they differ.

- [ ] **Step 7: Add CSS for the panel and event cards**

Modify `src/styles.css`.

```css
.inline-notes-panel {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.9rem;
  border-radius: 0.95rem;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(56, 189, 248, 0.18);
}

.inline-notes-panel textarea {
  width: 100%;
  min-height: 5.5rem;
  resize: vertical;
}

.exercise-event-card.event-note.event-user {
  border-color: rgba(148, 163, 184, 0.18);
}

.exercise-event-card.event-change.event-user {
  border-color: rgba(56, 189, 248, 0.28);
}

.exercise-event-card.event-change.event-automation {
  border-color: rgba(129, 140, 248, 0.28);
}
```

- [ ] **Step 8: Run focused tests to verify they pass**

Run: `npm.cmd run test -- src/features/workout/WorkoutPage.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx src/styles.css
git commit -m "Add workout exercise notes and change log"
```

### Task 4: Final Verification And Publish

**Files:**
- Modify: none expected

- [ ] **Step 1: Run the full verification suite**

Run: `npm.cmd run lint`
Expected: PASS

Run: `npm.cmd run test`
Expected: PASS with all tests green

Run: `npm.cmd run build`
Expected: PASS with Vite production bundle generated

- [ ] **Step 2: Stage any final touched files and create the release commit**

```bash
git add src/db/types.ts src/db/appDb.ts src/db/repositories.ts src/db/repositories.test.ts src/domain/backup.ts src/domain/backup.test.ts src/features/settings/SettingsPage.tsx src/features/settings/exportCsv.test.ts src/features/workout/WorkoutPage.tsx src/features/workout/WorkoutPage.test.tsx src/styles.css
git commit -m "Add exercise notes and change log"
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```
