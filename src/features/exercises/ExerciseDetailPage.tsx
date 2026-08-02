import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/appDb';
import type { ExerciseRecord } from '../../db/types';
import { ExerciseForm } from './ExerciseForm';

function nowIso() { return new Date().toISOString(); }

export function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const exercise = useLiveQuery(async () => {
    if (!exerciseId) return null;
    return (await db.exercises.get(exerciseId)) ?? null;
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

  return <section className="page">
    <div className="section-header">
      <div><p className="eyebrow">Harjutus</p><h2>{exercise.name}</h2></div>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => setFormOpen(true)}>Muuda harjutust</button>
        <button type="button" className="ghost-button" onClick={() => void deleteExercise()}>Kustuta harjutus</button>
      </div>
    </div>
    {formOpen ? <ExerciseForm initialExercise={exercise as ExerciseRecord} onClose={() => setFormOpen(false)} onSave={saveExercise} /> : null}
    <article className="panel stack">
      <p className="machine-copy">Masin #{exercise.machineNumber || '-'}</p>
      <p className="note-copy">{exercise.notes || 'Märkused puuduvad.'}</p>
      <Link className="primary-button" to={`/ajalugu?exerciseId=${encodeURIComponent(exercise.id)}`}>Vaata ajalugu</Link>
    </article>
    <Link className="secondary-button" to="/harjutused">Tagasi harjutuste juurde</Link>
  </section>;
}
