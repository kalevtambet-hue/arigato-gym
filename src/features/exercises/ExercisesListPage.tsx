import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/appDb';
import type { ExerciseRecord } from '../../db/types';
import { formatTarget } from '../../domain/targetMode';
import { createId } from '../../lib/id';
import { ExerciseForm } from './ExerciseForm';

function nowIso() { return new Date().toISOString(); }

export function ExercisesListPage() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const exerciseContext = useLiveQuery(async () => {
    const [dayExercises, sessions, sessionExercises, setResults] = await Promise.all([
      db.dayExercises.toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.setResults.toArray(),
    ]);
    const sessionById = new Map(sessions.map((session) => [session.id, session]));
    const resultsBySessionExerciseId = new Map<string, typeof setResults>();
    for (const result of setResults) {
      const list = resultsBySessionExerciseId.get(result.workoutSessionExerciseId) ?? [];
      list.push(result);
      resultsBySessionExerciseId.set(result.workoutSessionExerciseId, list);
    }

    const latestByExerciseId = new Map<string, (typeof sessionExercises)[number]>();
    for (const sessionExercise of sessionExercises) {
      if (!sessionExercise.exerciseId || sessionById.get(sessionExercise.workoutSessionId)?.status === 'active') continue;
      const currentLatest = latestByExerciseId.get(sessionExercise.exerciseId);
      const currentDate = currentLatest ? sessionById.get(currentLatest.workoutSessionId)?.performedAt ?? '' : '';
      const candidateDate = sessionById.get(sessionExercise.workoutSessionId)?.performedAt ?? '';
      if (!currentLatest || candidateDate > currentDate) latestByExerciseId.set(sessionExercise.exerciseId, sessionExercise);
    }

    const planByExerciseId = new Map<string, (typeof dayExercises)[number]>();
    for (const dayExercise of dayExercises) {
      const currentPlan = planByExerciseId.get(dayExercise.exerciseId);
      if (!currentPlan || dayExercise.updatedAt > currentPlan.updatedAt) planByExerciseId.set(dayExercise.exerciseId, dayExercise);
    }

    return { latestByExerciseId, planByExerciseId, resultsBySessionExerciseId };
  }, []);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const visibleExercises = (exercises ?? []).filter((exercise) =>
    exercise.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  async function saveExercise(name: string, machineNumber: string, notes: string) {
    const timestamp = nowIso();
    await db.exercises.add({ id: createId('exercise'), name, machineNumber, notes, createdAt: timestamp, updatedAt: timestamp });
    setFormOpen(false);
  }

  return <section className="page exercises-list-page">
    <div className="section-header">
      <div><p className="eyebrow">Harjutuste register</p><h2>Harjutused</h2></div>
      <div className="button-row compact-header-actions">
        <button type="button" className="primary-button compact-add-button" onClick={() => setFormOpen(true)}>Lisa harjutus</button>
      </div>
    </div>
    {formOpen ? <ExerciseForm initialExercise={null} onClose={() => setFormOpen(false)} onSave={saveExercise} /> : null}
    <div className="panel search-panel compact-panel">
      <label>
        Otsi harjutust
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
    </div>
    <ul className="stack-list exercise-list" aria-label="Harjutuste nimekiri">
      {visibleExercises.map((exercise: ExerciseRecord) => {
        const latest = exerciseContext?.latestByExerciseId.get(exercise.id);
        const latestResults = latest ? exerciseContext?.resultsBySessionExerciseId.get(latest.id) ?? [] : [];
        const successfulSets = latestResults.filter((result) => result.status === 'success').length;
        const plan = exerciseContext?.planByExerciseId.get(exercise.id);

        return <li key={exercise.id} className="list-card exercise-list-card compact-list-card">
          <Link className="day-link" to={`/harjutused/${exercise.id}`}>
            <strong>{exercise.name}</strong>
            <span className="exercise-meta">Masin #{exercise.machineNumber || '-'}</span>
            {latest ? <span className="exercise-result">Viimane: {latest.currentWeight} kg · {successfulSets}/{latest.targetSets} tehtud</span> : <span className="exercise-result">Viimane treening puudub</span>}
            {plan ? <span className="exercise-target">Järgmine siht: {plan.targetSets} × {formatTarget(plan.repMode, plan.targetRepsMin, plan.targetRepsMax, plan.currentWeight)}</span> : <span className="exercise-target">Järgmine siht puudub</span>}
          </Link>
        </li>;
      })}
      {exercises?.length === 0 ? <li className="empty-card">Harjutusi veel ei ole.</li> : null}
      {exercises && exercises.length > 0 && visibleExercises.length === 0 ? <li className="empty-card">Otsing ei andnud tulemusi.</li> : null}
    </ul>
  </section>;
}
