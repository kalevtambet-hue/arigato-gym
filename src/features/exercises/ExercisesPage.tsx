import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type { DayExerciseRecord, ExerciseRecord, WorkoutDayRecord } from '../../db/types';
import { formatTarget, isDurationMode, isFixedMode } from '../../domain/targetMode';
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

async function updateExercise(id: string, name: string, machineNumber: string, notes: string) {
  await db.exercises.update(id, {
    name,
    machineNumber,
    notes,
    updatedAt: nowIso(),
  });
}

async function addWorkoutDay(name: string) {
  const sortOrder = await db.workoutDays.count();
  const timestamp = nowIso();
  await db.workoutDays.add({
    id: createId('day'),
    name,
    notes: '',
    sortOrder,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function updateWorkoutDayDetails(id: string, name: string, notes: string) {
  await db.workoutDays.update(id, {
    name,
    notes,
    updatedAt: nowIso(),
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
    successesRequired: 1,
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
      | 'successesRequired'
      | 'repMode'
      | 'targetRepsMin'
      | 'targetRepsMax'
      | 'currentWeight'
      | 'weightStep'
    >
  >,
) {
  const nextChanges = { ...changes };
  if (changes.repMode && isDurationMode(changes.repMode)) {
    nextChanges.currentWeight = 0;
  }
  if (changes.repMode && isFixedMode(changes.repMode)) {
    const fixedReps = changes.targetRepsMin ?? changes.targetRepsMax;
    if (fixedReps !== undefined) {
      nextChanges.targetRepsMin = fixedReps;
      nextChanges.targetRepsMax = fixedReps;
    }
  }
  await db.dayExercises.update(id, { ...nextChanges, updatedAt: nowIso() });
}

async function removeDayExercise(id: string) {
  await db.dayExercises.delete(id);
}

async function removeExercise(id: string) {
  await db.transaction('rw', db.exercises, db.dayExercises, async () => {
    await db.dayExercises.where('exerciseId').equals(id).delete();
    await db.exercises.delete(id);
  });
}

async function duplicateWorkoutDay(day: WorkoutDayRecord, items: DayExerciseView[]) {
  const timestamp = nowIso();
  const nextSortOrder = await db.workoutDays.count();
  const workoutDayId = createId('day');

  await db.transaction('rw', db.workoutDays, db.dayExercises, async () => {
    await db.workoutDays.add({
      id: workoutDayId,
      name: `${day.name} koopia`,
      notes: day.notes,
      sortOrder: nextSortOrder,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const item of items) {
      await db.dayExercises.add({
        id: createId('day-exercise'),
        workoutDayId,
        exerciseId: item.exerciseId,
        sortOrder: item.sortOrder,
        targetSets: item.targetSets,
        successesRequired: item.successesRequired,
        repMode: item.repMode,
        targetRepsMin: item.targetRepsMin,
        targetRepsMax: item.targetRepsMax,
        currentWeight: item.currentWeight,
        weightStep: item.weightStep,
        restSeconds: item.restSeconds,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  });

  return workoutDayId;
}

async function removeWorkoutDay(id: string) {
  await db.transaction('rw', db.workoutDays, db.dayExercises, async () => {
    await db.dayExercises.where('workoutDayId').equals(id).delete();
    await db.workoutDays.delete(id);
  });
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
  const [editingExercise, setEditingExercise] = useState<ExerciseRecord | null>(null);
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
          <h2>Kavad</h2>
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
          initialExercise={editingExercise}
          onClose={() => setExerciseFormOpen(false)}
          onSave={async (name, machineNumber, notes) => {
            if (editingExercise) {
              await updateExercise(editingExercise.id, name, machineNumber, notes);
            } else {
              await addExercise(name, machineNumber, notes);
            }
            setEditingExercise(null);
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
                <div className="config-head">
                  <div>
                    <strong>{exercise.name}</strong>
                    <span>Masin #{exercise.machineNumber || '-'}</span>
                  </div>
                  <div className="button-row">
                    <button
                      type="button"
                      className="secondary-button"
                      aria-label={`Muuda ${exercise.name}`}
                      onClick={() => {
                        setEditingExercise(exercise);
                        setExerciseFormOpen(true);
                      }}
                    >
                      Muuda
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      aria-label={`Kustuta ${exercise.name}`}
                      onClick={() => {
                        if (window.confirm(`Kustutada harjutus "${exercise.name}"?`)) {
                          void removeExercise(exercise.id);
                        }
                      }}
                    >
                      Kustuta
                    </button>
                  </div>
                </div>
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
              onDuplicateDay={async (day) => {
                const copiedId = await duplicateWorkoutDay(day, groupedDayExercises.get(day.id) ?? []);
                setSelectedDayId(copiedId);
              }}
              onRemoveDay={async (day) => {
                if (window.confirm(`Kustutada päev "${day.name}"?`)) {
                  await removeWorkoutDay(day.id);
                  setSelectedDayId((current) => (current === day.id ? null : current));
                }
              }}
              onUpdateDay={updateWorkoutDayDetails}
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
  initialExercise,
  onClose,
  onSave,
}: {
  initialExercise: ExerciseRecord | null;
  onClose: () => void;
  onSave: (name: string, machineNumber: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialExercise?.name ?? '');
  const [machineNumber, setMachineNumber] = useState(initialExercise?.machineNumber ?? '');
  const [notes, setNotes] = useState(initialExercise?.notes ?? '');

  useEffect(() => {
    setName(initialExercise?.name ?? '');
    setMachineNumber(initialExercise?.machineNumber ?? '');
    setNotes(initialExercise?.notes ?? '');
  }, [initialExercise]);

  return (
    <div className="modal-card">
      <h3>{initialExercise ? 'Muuda harjutust' : 'Uus harjutus'}</h3>
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
  onDuplicateDay,
  onRemoveDay,
  onUpdateDay,
  onUpdate,
  onRemove,
}: {
  day: WorkoutDayRecord | null;
  exercises: ExerciseRecord[];
  items: DayExerciseView[];
  onAddExercise: (workoutDayId: string, exerciseId: string) => Promise<void>;
  onDuplicateDay: (day: WorkoutDayRecord) => Promise<void>;
  onRemoveDay: (day: WorkoutDayRecord) => Promise<void>;
  onUpdateDay: (id: string, name: string, notes: string) => Promise<void>;
  onUpdate: (
    id: string,
    changes: Partial<
      Pick<
        DayExerciseRecord,
        | 'targetSets'
        | 'successesRequired'
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
  const [dayName, setDayName] = useState(day?.name ?? '');
  const [dayNotes, setDayNotes] = useState(day?.notes ?? '');

  useEffect(() => {
    setDayName(day?.name ?? '');
    setDayNotes(day?.notes ?? '');
  }, [day?.id, day?.name, day?.notes]);

  if (!day) {
    return null;
  }

  return (
    <div className="stack">
      <div className="inline-form">
        <label>
          Päeva nimi
          <input value={dayName} onChange={(event) => setDayName(event.target.value)} />
        </label>
        <label>
          Päeva märkus
          <input value={dayNotes} onChange={(event) => setDayNotes(event.target.value)} />
        </label>
        <button
          type="button"
          className="secondary-button"
          disabled={!dayName.trim() || (dayName.trim() === day.name && dayNotes === day.notes)}
          onClick={() => void onUpdateDay(day.id, dayName.trim(), dayNotes.trim())}
        >
          Salvesta nimi
        </button>
        <button type="button" className="secondary-button" onClick={() => void onDuplicateDay(day)}>
          Duplikeeri päev
        </button>
        <button type="button" className="ghost-button" onClick={() => void onRemoveDay(day)}>
          Kustuta päev
        </button>
      </div>
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
              <p>{item.targetSets} x {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                if (window.confirm(`Eemaldada harjutus päevast?`)) {
                  void onRemove(item.id);
                }
              }}
            >
              Eemalda
            </button>
          </div>
          <div className="field-grid">
            <NumberField
              label="Seeriate arv"
              value={item.targetSets}
              onChange={(value) => void onUpdate(item.id, { targetSets: value })}
            />
            <NumberField
              label="Õnnestumisi enne tõusu"
              value={item.successesRequired}
              min={1}
              onChange={(value) => void onUpdate(item.id, { successesRequired: Math.max(1, value) })}
            />
            <label>
              Sihi tüüp
              <select
                value={item.repMode}
                onChange={(event) =>
                  void onUpdate(item.id, buildModeChange(item, event.target.value as DayExerciseRecord['repMode']))
                }
              >
                <option value="range">Kordused vahemik</option>
                <option value="fixed">Kordused fikseeritud</option>
                <option value="duration-range">Kestus vahemik</option>
                <option value="duration-fixed">Kestus fikseeritud</option>
              </select>
            </label>
            {item.repMode === 'duration-fixed' ? (
              <NumberField
                label="Kestus (min)"
                value={item.targetRepsMin}
                onChange={(value) =>
                  void onUpdate(item.id, { targetRepsMin: value, targetRepsMax: value })
                }
              />
            ) : item.repMode === 'fixed' ? (
              <NumberField
                label="Kordused"
                value={item.targetRepsMin}
                onChange={(value) =>
                  void onUpdate(item.id, { targetRepsMin: value, targetRepsMax: value })
                }
              />
            ) : item.repMode === 'duration-range' ? (
              <>
                <NumberField
                  label="Min kestus (min)"
                  value={item.targetRepsMin}
                  onChange={(value) => void onUpdate(item.id, { targetRepsMin: value })}
                />
                <NumberField
                  label="Max kestus (min)"
                  value={item.targetRepsMax}
                  onChange={(value) => void onUpdate(item.id, { targetRepsMax: value })}
                />
              </>
            ) : (
              <>
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
              </>
            )}
            {isDurationMode(item.repMode) ? (
              <NumberField
                label="Kestuse samm (min)"
                value={item.weightStep}
                onChange={(value) => void onUpdate(item.id, { weightStep: value })}
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildModeChange(item: DayExerciseRecord, mode: DayExerciseRecord['repMode']) {
  const changes: Partial<DayExerciseRecord> = { repMode: mode };

  if (mode === 'fixed' || mode === 'duration-fixed') {
    changes.targetRepsMax = item.targetRepsMin;
  }

  if (mode === 'duration-range') {
    changes.currentWeight = 0;
    changes.weightStep = item.weightStep > 0 ? item.weightStep : 1;
    changes.targetRepsMin = item.targetRepsMin > 0 ? item.targetRepsMin : 10;
    changes.targetRepsMax = item.targetRepsMax >= changes.targetRepsMin ? item.targetRepsMax : 15;
  }

  if (mode === 'duration-fixed') {
    changes.currentWeight = 0;
    changes.weightStep = item.weightStep > 0 ? item.weightStep : 1;
    changes.targetRepsMin = item.targetRepsMin > 0 ? item.targetRepsMin : 10;
    changes.targetRepsMax = changes.targetRepsMin;
  }

  return changes;
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  return (
    <label>
      {label}
      <input
        type="number"
        value={draftValue}
        min={min}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);

          if (nextValue === '') {
            return;
          }

          onChange(Number(nextValue));
        }}
      />
    </label>
  );
}
