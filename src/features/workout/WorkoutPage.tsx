import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type {
  DayExerciseRecord,
  ExerciseRecord,
  SetResultRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
  WorkoutDayRecord,
} from '../../db/types';
import { computeNextTarget } from '../../domain/progression';
import { buildSessionExercises } from '../../domain/session';
import { formatTarget, getSuccessValue, isDurationMode } from '../../domain/targetMode';
import { createId } from '../../lib/id';

type DayExerciseView = DayExerciseRecord & {
  exercise?: ExerciseRecord;
};

function nowIso() {
  return new Date().toISOString();
}

async function startWorkout(workoutDayId: string) {
  const timestamp = nowIso();
  const sessionId = createId('session');
  const dayExercises = await db.dayExercises.where('workoutDayId').equals(workoutDayId).sortBy('sortOrder');
  const exerciseIds = dayExercises.map((item) => item.exerciseId);
  const exercises = await db.exercises.bulkGet(exerciseIds);
  const seeds = dayExercises.map((item, index) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    exerciseName: exercises[index]?.name ?? 'Harjutus',
    machineNumber: exercises[index]?.machineNumber ?? '',
    targetSets: item.targetSets,
    repMode: item.repMode,
    targetRepsMin: item.targetRepsMin,
    targetRepsMax: item.targetRepsMax,
    currentWeight: item.currentWeight,
    weightStep: item.weightStep,
    sortOrder: item.sortOrder,
  }));

  await db.transaction('rw', db.sessions, db.sessionExercises, async () => {
    await db.sessions.add({
      id: sessionId,
      workoutDayId,
      performedAt: timestamp,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.sessionExercises.bulkAdd(buildSessionExercises(sessionId, seeds));
  });
}

async function saveSetResult(
  sessionExercise: WorkoutSessionExerciseRecord,
  setNumber: number,
  status: SetResultRecord['status'],
  completedReps: number,
) {
  await db.setResults.put({
    id: `${sessionExercise.id}-${setNumber}`,
    workoutSessionExerciseId: sessionExercise.id,
    setNumber,
    status,
    completedReps,
  });
}

async function completeWorkout(
  session: WorkoutSessionRecord,
  sessionExercises: WorkoutSessionExerciseRecord[],
  setResults: SetResultRecord[],
) {
  const resultsByExercise = new Map<string, SetResultRecord[]>();
  for (const result of setResults) {
    const list = resultsByExercise.get(result.workoutSessionExerciseId) ?? [];
    list.push(result);
    resultsByExercise.set(result.workoutSessionExerciseId, list);
  }

  await db.transaction('rw', db.dayExercises, db.sessions, async () => {
    for (const item of sessionExercises) {
      const reps = (resultsByExercise.get(item.id) ?? [])
        .sort((left, right) => left.setNumber - right.setNumber)
        .map((entry) => entry.completedReps);

      const nextTarget = computeNextTarget(
        {
          repMode: item.repMode,
          targetSets: item.targetSets,
          targetRepsMin: item.targetRepsMin,
          targetRepsMax: item.targetRepsMax,
          currentWeight: item.currentWeight,
          weightStep: item.weightStep,
        },
        reps,
      );

      await db.dayExercises.update(item.dayExerciseId, {
        targetRepsMin: nextTarget.targetRepsMin,
        targetRepsMax: nextTarget.targetRepsMax,
        currentWeight: nextTarget.currentWeight,
        weightStep: nextTarget.weightStep,
        updatedAt: nowIso(),
      });
    }

    await db.sessions.update(session.id, {
      status: 'completed',
      updatedAt: nowIso(),
      performedAt: nowIso(),
    });
  });
}

export function WorkoutPage() {
  void ensureSeedData();
  const workoutDays = useLiveQuery(
    () => db.workoutDays.orderBy('sortOrder').filter((item) => !item.isArchived).toArray(),
    [],
  );
  const dayExercises = useLiveQuery(() => db.dayExercises.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const activeSession = useLiveQuery(() => db.sessions.where('status').equals('active').first(), []);
  const sessionExercises = useLiveQuery<WorkoutSessionExerciseRecord[]>(
    () =>
      activeSession
        ? db.sessionExercises.where('workoutSessionId').equals(activeSession.id).sortBy('orderIndex')
        : Promise.resolve<WorkoutSessionExerciseRecord[]>([]),
    [activeSession?.id],
  );
  const setResults = useLiveQuery<SetResultRecord[]>(
    () =>
      activeSession
        ? db
            .setResults
            .where('workoutSessionExerciseId')
            .anyOf((sessionExercises ?? []).map((item) => item.id))
            .toArray()
        : Promise.resolve<SetResultRecord[]>([]),
    [activeSession?.id, sessionExercises?.length],
  );
  const [failureTarget, setFailureTarget] = useState<{
    sessionExerciseId: string;
    setNumber: number;
    reps: string;
  } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [completedSummary, setCompletedSummary] = useState<
    Array<{
      id: string;
      name: string;
      nextTarget: ReturnType<typeof computeNextTarget>;
    }>
  >([]);

  useEffect(() => {
    if (!workoutDays?.length) {
      if (selectedDayId !== null) {
        setSelectedDayId(null);
      }
      return;
    }

    if (!selectedDayId || !(workoutDays ?? []).some((day) => day.id === selectedDayId)) {
      setSelectedDayId(workoutDays[0].id);
    }
  }, [selectedDayId, workoutDays]);

  const dayExerciseGroups = useMemo(() => {
    const exerciseMap = new Map((exercises ?? []).map((item) => [item.id, item]));
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
  }, [dayExercises, exercises]);

  const selectedDay = useMemo<WorkoutDayRecord | null>(
    () => (workoutDays ?? []).find((day) => day.id === selectedDayId) ?? null,
    [selectedDayId, workoutDays],
  );

  const selectedDayExercises = useMemo(
    () => (selectedDay ? dayExerciseGroups.get(selectedDay.id) ?? [] : []),
    [dayExerciseGroups, selectedDay],
  );

  const nextExercise = useMemo(() => {
    const resultsCount = new Map<string, number>();
    for (const item of setResults ?? []) {
      resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
    }

    return (sessionExercises ?? []).find(
      (item) => (resultsCount.get(item.id) ?? 0) < item.targetSets,
    );
  }, [sessionExercises, setResults]);

  const nextSetNumber = useMemo(() => {
    if (!nextExercise) {
      return 1;
    }

    return (setResults ?? []).filter((item) => item.workoutSessionExerciseId === nextExercise.id).length + 1;
  }, [nextExercise, setResults]);

  const progress = useMemo(() => {
    const totalExercises = (sessionExercises ?? []).length;
    const resultsCount = new Map<string, number>();

    for (const item of setResults ?? []) {
      resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
    }

    const completedExercises = (sessionExercises ?? []).filter(
      (item) => (resultsCount.get(item.id) ?? 0) >= item.targetSets,
    ).length;

    const remainingExercises = Math.max(totalExercises - completedExercises, 0);
    const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    return {
      totalExercises,
      completedExercises,
      remainingExercises,
      progressPercent,
    };
  }, [sessionExercises, setResults]);

  const summary = useMemo(
    () =>
      (sessionExercises ?? []).map((item) => {
        const reps = (setResults ?? [])
          .filter((result) => result.workoutSessionExerciseId === item.id)
          .sort((left, right) => left.setNumber - right.setNumber)
          .map((result) => result.completedReps);

        const nextTarget = computeNextTarget(
          {
            repMode: item.repMode,
            targetSets: item.targetSets,
            targetRepsMin: item.targetRepsMin,
            targetRepsMax: item.targetRepsMax,
            currentWeight: item.currentWeight,
            weightStep: item.weightStep,
          },
          reps,
        );

        return {
          id: item.id,
          name: item.exerciseName,
          nextTarget,
        };
      }),
    [sessionExercises, setResults],
  );
  const failureExercise = useMemo(
    () => (sessionExercises ?? []).find((item) => item.id === failureTarget?.sessionExerciseId) ?? null,
    [failureTarget?.sessionExerciseId, sessionExercises],
  );

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tänane logi</p>
          <h2>Tänane treening</h2>
        </div>
      </div>

      {activeSession && progress.totalExercises > 0 ? (
        <div className="panel progress-panel">
          <div className="config-head">
            <strong>{`Tehtud ${progress.completedExercises} / ${progress.totalExercises}`}</strong>
            <span>{`Jäänud ${progress.remainingExercises}`}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress.progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      {!activeSession ? (
        <>
          {workoutDays?.length === 0 ? (
            <p className="empty-card">Lisa esmalt treeningpäevad ja harjutused Kavad lehel.</p>
          ) : (
            <>
              <div className="panel">
                <p className="eyebrow">Valitud päev</p>
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
                {selectedDay?.notes ? <p className="muted note-copy">{selectedDay.notes}</p> : null}
              </div>

              <div className="panel">
                <p className="eyebrow">Päeva harjutused</p>
                <ul className="stack-list preview-list">
                  {selectedDayExercises.map((item) => (
                    <li key={item.id} className="list-card">
                      <strong>{item.exercise?.name ?? 'Harjutus'}</strong>
                      <span>Masin #{item.exercise?.machineNumber || '-'}</span>
                      <span>
                        {item.targetSets} x{' '}
                        {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}
                      </span>
                    </li>
                  ))}
                </ul>
                {selectedDayExercises.length === 0 ? (
                  <p className="empty-card">Sellel päeval pole veel harjutusi.</p>
                ) : (
                  <button
                    type="button"
                    className="hero-button"
                    onClick={() => {
                      if (selectedDay) {
                        void startWorkout(selectedDay.id);
                      }
                    }}
                  >
                    Alusta treeningut
                  </button>
                )}
              </div>
            </>
          )}
        </>
      ) : null}

      {activeSession && nextExercise ? (
        <article className="workout-card">
          <p className="eyebrow">Järgmine harjutus</p>
          <h3>{nextExercise.exerciseName}</h3>
          <p className="muted">
            Masin #{nextExercise.machineNumber || '-'} · {nextExercise.targetSets} x{' '}
            {formatTarget(
              nextExercise.repMode,
              nextExercise.targetRepsMin,
              nextExercise.targetRepsMax,
              nextExercise.currentWeight,
            )}
          </p>
          <p className="set-badge">Seeria {nextSetNumber}</p>
          <div className="button-stack">
            <button
              type="button"
              className="success-button"
              onClick={() =>
                void saveSetResult(
                  nextExercise,
                  nextSetNumber,
                  'success',
                  getSuccessValue(
                    nextExercise.repMode,
                    nextExercise.targetRepsMin,
                    nextExercise.targetRepsMax,
                  ),
                )
              }
            >
              Tehtud
            </button>
            <button
              type="button"
              className="warning-button"
              onClick={() => setFailureTarget({ sessionExerciseId: nextExercise.id, setNumber: nextSetNumber, reps: '' })}
            >
              Ei tulnud täis
            </button>
          </div>
        </article>
      ) : null}

      {activeSession && !nextExercise && completedSummary.length === 0 ? (
        <div className="panel">
          <h3>Treening valmis</h3>
          <p className="muted">Kõik seeriad said kirja. Genereeri järgmised sihid.</p>
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              setCompletedSummary(summary);
              await completeWorkout(activeSession, sessionExercises ?? [], setResults ?? []);
            }}
          >
            Lõpeta treening
          </button>
        </div>
      ) : null}

      {completedSummary.length > 0 ? (
        <div className="panel">
          <h3>Järgmine siht</h3>
          <ul className="stack-list">
            {completedSummary.map((item) => (
              <li key={item.id} className="list-card">
                <strong>{item.name}</strong>
                <span>
                  {item.nextTarget.targetSets} x{' '}
                  {formatTarget(
                    item.nextTarget.repMode,
                    item.nextTarget.targetRepsMin,
                    item.nextTarget.targetRepsMax,
                    item.nextTarget.currentWeight,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failureTarget ? (
        <div className="modal-card">
          <h3>Ebaõnnestunud seeria</h3>
          <label htmlFor="completedReps">
            {failureExercise && isDurationMode(failureExercise.repMode)
              ? 'Tegelik kestus (min)'
              : 'Tegelikud kordused'}
            <input
              id="completedReps"
              type="number"
              value={failureTarget.reps}
              onChange={(event) =>
                setFailureTarget((current) => (current ? { ...current, reps: event.target.value } : current))
              }
            />
          </label>
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => setFailureTarget(null)}>
              Loobu
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={async () => {
                const target = (sessionExercises ?? []).find((item) => item.id === failureTarget.sessionExerciseId);
                if (!target) {
                  return;
                }

                await saveSetResult(
                  target,
                  failureTarget.setNumber,
                  'failed',
                  Number(failureTarget.reps || '0'),
                );
                setFailureTarget(null);
              }}
            >
              Salvesta seeria
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
