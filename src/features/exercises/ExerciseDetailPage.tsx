import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/appDb';
import type { ExerciseRecord } from '../../db/types';
import { formatTarget } from '../../domain/targetMode';
import { ExerciseForm } from './ExerciseForm';

function nowIso() { return new Date().toISOString(); }

export function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const exercise = useLiveQuery(async () => {
    if (!exerciseId) return null;
    return (await db.exercises.get(exerciseId)) ?? null;
  }, [exerciseId]);
  const summary = useLiveQuery(async () => {
    if (!exerciseId) return null;

    const [dayExercises, sessions, sessionExercises, setResults] = await Promise.all([
      db.dayExercises.where('exerciseId').equals(exerciseId).toArray(),
      db.sessions.toArray(),
      db.sessionExercises.toArray(),
      db.setResults.toArray(),
    ]);
    const sessionById = new Map(sessions.map((session) => [session.id, session]));
    const plan = [...dayExercises].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    const latest = sessionExercises
      .filter((item) => item.exerciseId === exerciseId && sessionById.get(item.workoutSessionId)?.status !== 'active')
      .sort((left, right) => {
        const leftDate = sessionById.get(left.workoutSessionId)?.performedAt ?? '';
        const rightDate = sessionById.get(right.workoutSessionId)?.performedAt ?? '';
        return rightDate.localeCompare(leftDate);
      })[0];
    const latestResults = latest
      ? setResults.filter((result) => result.workoutSessionExerciseId === latest.id)
      : [];

    return {
      plan,
      latest,
      successfulSets: latestResults.filter((result) => result.status === 'success').length,
    };
  }, [exerciseId]);
  const [formOpen, setFormOpen] = useState(false);

  if (exercise === undefined) return null;
  if (!exercise) return <section className="page stack">
    <p className="empty-card">Harjutust ei leitud.</p>
    <Link className="secondary-button" to="/harjutused">Tagasi harjutuste juurde</Link>
  </section>;
  const currentExercise = exercise;

  async function saveExercise(name: string, machineNumber: string, notes: string) {
    await db.exercises.update(currentExercise.id, { name, machineNumber, notes, updatedAt: nowIso() });
    setFormOpen(false);
  }

  async function deleteExercise() {
    if (!window.confirm(`Kustutada harjutus "${currentExercise.name}"?`)) return;
    await db.transaction('rw', db.exercises, db.dayExercises, async () => {
      await db.dayExercises.where('exerciseId').equals(currentExercise.id).delete();
      await db.exercises.delete(currentExercise.id);
    });
    navigate('/harjutused');
  }

  return <section className="page exercise-detail-page">
    <div className="section-header exercise-detail-header">
      <div><p className="eyebrow">Harjutus</p><h2>{exercise.name}</h2></div>
      <div className="button-row exercise-detail-actions">
        <button type="button" className="secondary-button" onClick={() => setFormOpen(true)}>Muuda harjutust</button>
        <button type="button" className="ghost-button" onClick={() => void deleteExercise()}>Kustuta harjutus</button>
      </div>
    </div>
    {formOpen ? <ExerciseForm initialExercise={exercise as ExerciseRecord} onClose={() => setFormOpen(false)} onSave={saveExercise} /> : null}
    <div className="exercise-detail-layout">
      <article className="exercise-detail-overview">
        <p className="machine-copy">Masin #{exercise.machineNumber || '-'}</p>
        <p className="note-copy">{exercise.notes || 'Märkused puuduvad.'}</p>
        <Link className="primary-button" to={`/ajalugu?exerciseId=${encodeURIComponent(exercise.id)}`}>Vaata ajalugu</Link>
      </article>
      <section className="exercise-summary-grid" aria-label="Harjutuse kokkuvõte">
        <article className="exercise-summary-item">
          <span>Viimane</span>
          {summary?.latest ? <strong>{`Viimane: ${summary.latest.currentWeight} kg · ${summary.successfulSets}/${summary.latest.targetSets} tehtud`}</strong> : <strong>Viimane treening puudub</strong>}
        </article>
        <article className="exercise-summary-item">
          <span>Järgmine siht</span>
          {summary?.plan ? <strong>{`Järgmine siht: ${summary.plan.targetSets} × ${formatTarget(summary.plan.repMode, summary.plan.targetRepsMin, summary.plan.targetRepsMax, summary.plan.currentWeight)}`}</strong> : <strong>Järgmine siht puudub</strong>}
        </article>
      </section>
    </div>
    <Link className="secondary-button detail-back-link" to="/harjutused">Tagasi harjutuste juurde</Link>
  </section>;
}
