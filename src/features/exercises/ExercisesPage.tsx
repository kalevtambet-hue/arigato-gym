import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type { DayExerciseRecord, ExerciseRecord, WorkoutDayRecord } from '../../db/types';
import { createId } from '../../lib/id';

type DayExerciseView = DayExerciseRecord & {
  exercise?: ExerciseRecord;
};

function nowIso() {
  return new Date().toISOString();
}

async function addExercise(name: string, machineNumber: string, notes: string) {
  const timestamp = nowIso();
  await db.exercises.add({
    id: createId('exercise'),
    name,
    machineNumber,
    notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function addWorkoutDay(name: string) {
  const sortOrder = await db.workoutDays.count();
  const timestamp = nowIso();
  await db.workoutDays.add({
    id: createId('day'),
    name,
    sortOrder,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function addDayExercise(workoutDayId: string, exerciseId: string) {
  const sortOrder = await db.dayExercises.where('workoutDayId').equals(workoutDayId).count();
  const timestamp = nowIso();
  await db.dayExercises.add({
    id: createId('day-exercise'),
    workoutDayId,
    exerciseId,
    sortOrder,
    targetSets: 3,
    repMode: 'range',
    targetRepsMin: 10,
    targetRepsMax: 15,
    currentWeight: 40,
    weightStep: 5,
    restSeconds: 90,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function updateDayExercise(
  id: string,
  changes: Partial<
    Pick<
      DayExerciseRecord,
      | 'targetSets'
      | 'repMode'
      | 'targetRepsMin'
      | 'targetRepsMax'
      | 'currentWeight'
      | 'weightStep'
    >
  >,
) {
  await db.dayExercises.update(id, { ...changes, updatedAt: nowIso() });
}

async function removeDayExercise(id: string) {
  await db.dayExercises.delete(id);
}

export function ExercisesPage() {
  void ensureSeedData();
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const workoutDays = useLiveQuery(
    () => db.workoutDays.orderBy('sortOrder').filter((item) => !item.isArchived).toArray(),
    [],
  );
  const dayExercises = useLiveQuery(() => db.dayExercises.toArray(), []);
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [dayFormOpen, setDayFormOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const exerciseMap = useMemo(
    () => new Map((exercises ?? []).map((item) => [item.id, item])),
    [exercises],
  );

  const groupedDayExercises = useMemo(() => {
    const groups = new Map<string, DayExerciseView[]>();

    for (const item of dayExercises ?? []) {
      const list = groups.get(item.workoutDayId) ?? [];
      list.push({ ...item, exercise: exerciseMap.get(item.exerciseId) });
      groups.set(item.workoutDayId, list);
    }

    for (const value of groups.values()) {
      value.sort((left, right) => left.sortOrder - right.sortOrder);
    }

    return groups;
  }, [dayExercises, exerciseMap]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Register ja mallid</p>
          <h2>Harjutused</h2>
        </div>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => setExerciseFormOpen(true)}>
            Lisa harjutus
          </button>
          <button type="button" className="secondary-button" onClick={() => setDayFormOpen(true)}>
            Lisa treeningpäev
          </button>
        </div>
      </div>

      {exerciseFormOpen ? (
        <ExerciseForm
          onClose={() => setExerciseFormOpen(false)}
          onSave={async (name, machineNumber, notes) => {
            await addExercise(name, machineNumber, notes);
            setExerciseFormOpen(false);
          }}
        />
      ) : null}

      {dayFormOpen ? (
        <WorkoutDayForm
          onClose={() => setDayFormOpen(false)}
          onSave={async (name) => {
            await addWorkoutDay(name);
            setDayFormOpen(false);
          }}
        />
      ) : null}

      <div className="grid two-up">
        <article className="panel">
          <h3>Baasharjutused</h3>
          <ul className="stack-list">
            {(exercises ?? []).map((exercise) => (
              <li key={exercise.id} className="list-card">
                <strong>{exercise.name}</strong>
                <span>Masin #{exercise.machineNumber || '-'}</span>
              </li>
            ))}
            {exercises?.length === 0 ? <li className="empty-card">Harjutusi veel ei ole.</li> : null}
          </ul>
        </article>

        <article className="panel">
          <h3>Treeningpäevad</h3>
          <div className="day-tabs">
            {(workoutDays ?? []).map((day) => (
              <button
                key={day.id}
                type="button"
                className={selectedDayId === day.id ? 'tab-chip active' : 'tab-chip'}
                onClick={() => setSelectedDayId(day.id)}
              >
                {day.name}
              </button>
            ))}
          </div>
          {selectedDayId ? (
            <WorkoutDayEditor
              day={(workoutDays ?? []).find((item) => item.id === selectedDayId) ?? null}
              exercises={exercises ?? []}
              items={groupedDayExercises.get(selectedDayId) ?? []}
              onAddExercise={addDayExercise}
              onUpdate={updateDayExercise}
              onRemove={removeDayExercise}
            />
          ) : (
            <p className="empty-card">Vali päev, et selle harjutusi seadistada.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function ExerciseForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string, machineNumber: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [machineNumber, setMachineNumber] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="modal-card">
      <h3>Uus harjutus</h3>
      <label>
        Harjutuse nimi
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Masina number
        <input value={machineNumber} onChange={(event) => setMachineNumber(event.target.value)} />
      </label>
      <label>
        Märkus
        <input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={onClose}>
          Loobu
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void onSave(name.trim(), machineNumber.trim(), notes.trim())}
          disabled={!name.trim()}
        >
          Salvesta harjutus
        </button>
      </div>
    </div>
  );
}

function WorkoutDayForm({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');

  return (
    <div className="modal-card">
      <h3>Uus treeningpäev</h3>
      <label>
        Päeva nimi
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={onClose}>
          Loobu
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void onSave(name.trim())}
          disabled={!name.trim()}
        >
          Salvesta päev
        </button>
      </div>
    </div>
  );
}

function WorkoutDayEditor({
  day,
  exercises,
  items,
  onAddExercise,
  onUpdate,
  onRemove,
}: {
  day: WorkoutDayRecord | null;
  exercises: ExerciseRecord[];
  items: DayExerciseView[];
  onAddExercise: (workoutDayId: string, exerciseId: string) => Promise<void>;
  onUpdate: (
    id: string,
    changes: Partial<
      Pick<
        DayExerciseRecord,
        | 'targetSets'
        | 'repMode'
        | 'targetRepsMin'
        | 'targetRepsMax'
        | 'currentWeight'
        | 'weightStep'
      >
    >,
  ) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  if (!day) {
    return null;
  }

  return (
    <div className="stack">
      <div className="inline-form">
        <select value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}>
          <option value="">Vali harjutus</option>
          {exercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="primary-button"
          disabled={!selectedExerciseId}
          onClick={() => {
            void onAddExercise(day.id, selectedExerciseId);
            setSelectedExerciseId('');
          }}
        >
          Lisa päeva
        </button>
      </div>

      {items.length === 0 ? <p className="empty-card">Päevas veel harjutusi ei ole.</p> : null}

      {items.map((item) => (
        <div key={item.id} className="config-card">
          <div className="config-head">
            <div>
              <strong>{item.exercise?.name ?? 'Harjutus'}</strong>
              <p>Masin #{item.exercise?.machineNumber || '-'}</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => void onRemove(item.id)}>
              Eemalda
            </button>
          </div>
          <div className="field-grid">
            <NumberField
              label="Seeriate arv"
              value={item.targetSets}
              onChange={(value) => void onUpdate(item.id, { targetSets: value })}
            />
            <label>
              Korduste mood
              <select
                value={item.repMode}
                onChange={(event) =>
                  void onUpdate(item.id, { repMode: event.target.value as DayExerciseRecord['repMode'] })
                }
              >
                <option value="range">Vahemik</option>
                <option value="fixed">Fikseeritud</option>
              </select>
            </label>
            <NumberField
              label="Min kordused"
              value={item.targetRepsMin}
              onChange={(value) => void onUpdate(item.id, { targetRepsMin: value })}
            />
            <NumberField
              label="Max kordused"
              value={item.targetRepsMax}
              onChange={(value) => void onUpdate(item.id, { targetRepsMax: value })}
            />
            <NumberField
              label="Raskus (kg)"
              value={item.currentWeight}
              onChange={(value) => void onUpdate(item.id, { currentWeight: value })}
            />
            <NumberField
              label="Raskuse samm (kg)"
              value={item.weightStep}
              onChange={(value) => void onUpdate(item.id, { weightStep: value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
