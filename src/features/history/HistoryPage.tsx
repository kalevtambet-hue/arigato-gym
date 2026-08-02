import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../db/appDb';
import { formatResultValue, formatTarget } from '../../domain/targetMode';

function isHistoryExerciseComplete(item: {
  repMode: 'fixed' | 'range' | 'duration-fixed' | 'duration-range';
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}, results: Array<{ status: 'success' | 'failed'; completedReps: number }>) {
  if (results.length !== item.targetSets) {
    return false;
  }

  if (results.some((result) => result.status === 'failed')) {
    return false;
  }

  if (item.repMode === 'range' || item.repMode === 'duration-range') {
    return results.every((result) => result.completedReps >= item.targetRepsMax);
  }

  return results.every((result) => result.completedReps >= item.targetRepsMin);
}

function isHistoryExerciseFailed(
  sessionStatus: 'active' | 'completed' | 'partial',
  isComplete: boolean,
  results: Array<{ status: 'success' | 'failed'; completedReps: number }>,
) {
  return !isComplete && (sessionStatus !== 'partial' || results.some((result) => result.status === 'failed'));
}

export function HistoryPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('performedAt').reverse().toArray(), []);
  const sessionExercises = useLiveQuery(() => db.sessionExercises.toArray(), []);
  const setResults = useLiveQuery(() => db.setResults.toArray(), []);
  const [searchParams] = useSearchParams();
  const exerciseId = searchParams.get('exerciseId');
  const selectedExercise = useLiveQuery(async () => {
    if (!exerciseId) return null;
    return (await db.exercises.get(exerciseId)) ?? null;
  }, [exerciseId]);
  const [exerciseFilter, setExerciseFilter] = useState('');

  useEffect(() => {
    setExerciseFilter(exerciseId && selectedExercise ? selectedExercise.name : '');
  }, [exerciseId, selectedExercise]);

  const items = useMemo(() => {
    const resultsByExercise = new Map<string, Array<{ status: 'success' | 'failed'; completedReps: number }>>();
    for (const result of setResults ?? []) {
      const list = resultsByExercise.get(result.workoutSessionExerciseId) ?? [];
      list.push({
        status: result.status,
        completedReps: result.completedReps,
      });
      resultsByExercise.set(result.workoutSessionExerciseId, list);
    }

    return (sessions ?? []).map((session) => {
      const exercises = (sessionExercises ?? [])
        .filter((item) => item.workoutSessionId === session.id)
        .filter((item) =>
          exerciseId
            ? item.exerciseId === exerciseId
            : exerciseFilter.trim()
              ? item.exerciseName.toLowerCase().includes(exerciseFilter.toLowerCase())
            : true,
        )
        .sort(
          (left, right) =>
            (left.performedOrder ?? left.orderIndex) - (right.performedOrder ?? right.orderIndex),
        )
        .map((item) => {
          const rawResults = resultsByExercise.get(item.id) ?? [];
          const isComplete = isHistoryExerciseComplete(item, rawResults);

          return {
            ...item,
            isComplete,
            isFailed: isHistoryExerciseFailed(session.status, isComplete, rawResults),
            reps: rawResults
              .map((value) => formatResultValue(item.repMode, value.completedReps))
              .join(' / '),
          };
        });

      return {
        session,
        exercises,
        completedExercises: exercises.filter((item) => item.isComplete).length,
      };
    });
  }, [sessions, sessionExercises, setResults, exerciseFilter, exerciseId]);

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Minevik</p>
          <h2>Ajalugu</h2>
        </div>
      </div>
      <div className="panel">
        <label>
          Filtreeri harjutuse järgi
          <input value={exerciseFilter} onChange={(event) => setExerciseFilter(event.target.value)} />
        </label>
      </div>
      {exerciseId && selectedExercise === null ? <p className="empty-card">Valitud harjutust ei leitud.</p> : null}
      <div className="stack">
        {items.map(({ session, exercises, completedExercises }) => (
          <details key={session.id} className="panel history-session" data-testid={`history-session-${session.id}`}>
            <summary className="history-summary">
              <strong>{new Date(session.performedAt).toLocaleDateString('et-EE')}</strong>
              <span>{session.status === 'partial' ? 'Pooleli lõpetatud' : `${completedExercises}/${exercises.length} edukat`}</span>
            </summary>
            <ul className="stack-list">
              {exercises.map((item) => (
                <li
                  key={item.id}
                  className={item.isFailed ? 'list-card history-item-failed' : 'list-card'}
                  data-testid={`history-exercise-${item.id}`}
                >
                  <strong>{item.exerciseName}</strong>
                  <span>
                    {item.targetSets} x{' '}
                    {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}
                  </span>
                  <span>{item.reps || 'Seeriad puuduvad'}</span>
                </li>
              ))}
              {exercises.length === 0 ? <li className="empty-card">Filter ei andnud tulemusi.</li> : null}
            </ul>
          </details>
        ))}
        {items.length === 0 ? <p className="empty-card">Ajalugu veel puudub.</p> : null}
      </div>
    </section>
  );
}
