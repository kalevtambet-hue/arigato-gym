import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type {
  SetResultRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
} from '../../db/types';
import { computeNextTarget } from '../../domain/progression';
import { buildSessionExercises } from '../../domain/session';
import { createId } from '../../lib/id';

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
        currentWeight: nextTarget.currentWeight,
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
  const [completedSummary, setCompletedSummary] = useState<
    Array<{
      id: string;
      name: string;
      nextTarget: ReturnType<typeof computeNextTarget>;
    }>
  >([]);

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

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tanaane logi</p>
          <h2>Tanane treening</h2>
        </div>
      </div>

      {!activeSession ? (
        <div className="grid single">
          {(workoutDays ?? []).map((day) => (
            <button
              key={day.id}
              type="button"
              className="hero-button"
              onClick={() => void startWorkout(day.id)}
            >
              Alusta {day.name}
            </button>
          ))}
          {workoutDays?.length === 0 ? <p className="empty-card">Loo enne treeningpaev.</p> : null}
        </div>
      ) : null}

      {activeSession && nextExercise ? (
        <article className="workout-card">
          <p className="eyebrow">Jargmine harjutus</p>
          <h3>{nextExercise.exerciseName}</h3>
          <p className="muted">
            Masin #{nextExercise.machineNumber || '-'} · {nextExercise.targetSets} x{' '}
            {nextExercise.repMode === 'range'
              ? `${nextExercise.targetRepsMin}-${nextExercise.targetRepsMax}`
              : nextExercise.targetRepsMin}{' '}
            x {nextExercise.currentWeight} kg
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
                  nextExercise.repMode === 'range' ? nextExercise.targetRepsMax : nextExercise.targetRepsMin,
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
              Ei tulnud tais
            </button>
          </div>
        </article>
      ) : null}

      {activeSession && !nextExercise && completedSummary.length === 0 ? (
        <div className="panel">
          <h3>Treening valmis</h3>
          <p className="muted">Koik seeriad said kirja. Genereeri jargmised sihid.</p>
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              setCompletedSummary(summary);
              await completeWorkout(activeSession, sessionExercises ?? [], setResults ?? []);
            }}
          >
            Lopeta treening
          </button>
        </div>
      ) : null}

      {completedSummary.length > 0 ? (
        <div className="panel">
          <h3>Jargmine siht</h3>
          <ul className="stack-list">
            {completedSummary.map((item) => (
              <li key={item.id} className="list-card">
                <strong>{item.name}</strong>
                <span>
                  {item.nextTarget.targetSets} x{' '}
                  {item.nextTarget.repMode === 'range'
                    ? `${item.nextTarget.targetRepsMin}-${item.nextTarget.targetRepsMax}`
                    : item.nextTarget.targetRepsMin}{' '}
                  x {item.nextTarget.currentWeight} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {failureTarget ? (
        <div className="modal-card">
          <h3>Ebaonnestunud seeria</h3>
          <label htmlFor="completedReps">
            Tegelikud kordused
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
