import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../../db/appDb';

export function HistoryPage() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('performedAt').reverse().toArray(), []);
  const sessionExercises = useLiveQuery(() => db.sessionExercises.toArray(), []);
  const setResults = useLiveQuery(() => db.setResults.toArray(), []);
  const [exerciseFilter, setExerciseFilter] = useState('');

  const items = useMemo(() => {
    const resultsByExercise = new Map<string, number[]>();
    for (const result of setResults ?? []) {
      const list = resultsByExercise.get(result.workoutSessionExerciseId) ?? [];
      list.push(result.completedReps);
      resultsByExercise.set(result.workoutSessionExerciseId, list);
    }

    return (sessions ?? []).map((session) => ({
      session,
      exercises: (sessionExercises ?? [])
        .filter((item) => item.workoutSessionId === session.id)
        .filter((item) =>
          exerciseFilter.trim()
            ? item.exerciseName.toLowerCase().includes(exerciseFilter.toLowerCase())
            : true,
        )
        .map((item) => ({
          ...item,
          reps: (resultsByExercise.get(item.id) ?? []).join(' / '),
        })),
    }));
  }, [sessions, sessionExercises, setResults, exerciseFilter]);

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
          Filtreeri harjutuse jargi
          <input value={exerciseFilter} onChange={(event) => setExerciseFilter(event.target.value)} />
        </label>
      </div>
      <div className="stack">
        {items.map(({ session, exercises }) => (
          <article key={session.id} className="panel">
            <h3>{new Date(session.performedAt).toLocaleDateString('et-EE')}</h3>
            <ul className="stack-list">
              {exercises.map((item) => (
                <li key={item.id} className="list-card">
                  <strong>{item.exerciseName}</strong>
                  <span>
                    {item.targetSets} x{' '}
                    {item.repMode === 'range' ? `${item.targetRepsMin}-${item.targetRepsMax}` : item.targetRepsMin} x{' '}
                    {item.currentWeight} kg
                  </span>
                  <span>{item.reps || 'Seeriad puuduvad'}</span>
                </li>
              ))}
              {exercises.length === 0 ? <li className="empty-card">Filter ei andnud tulemusi.</li> : null}
            </ul>
          </article>
        ))}
        {items.length === 0 ? <p className="empty-card">Ajalugu veel puudub.</p> : null}
      </div>
    </section>
  );
}
