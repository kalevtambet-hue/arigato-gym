import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/appDb';
import type { ExerciseRecord } from '../../db/types';
import { createId } from '../../lib/id';
import { ExerciseForm } from './ExerciseForm';

function nowIso() { return new Date().toISOString(); }

export function ExercisesListPage() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
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

  return <section className="page">
    <div className="section-header">
      <div><p className="eyebrow">Harjutuste register</p><h2>Harjutused</h2></div>
      <button type="button" className="primary-button" onClick={() => setFormOpen(true)}>Lisa harjutus</button>
    </div>
    {formOpen ? <ExerciseForm initialExercise={null} onClose={() => setFormOpen(false)} onSave={saveExercise} /> : null}
    <div className="panel">
      <label>
        Otsi harjutust
        <input value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
    </div>
    <ul className="stack-list">
      {visibleExercises.map((exercise: ExerciseRecord) => <li key={exercise.id} className="list-card">
        <Link className="day-link" to={`/harjutused/${exercise.id}`}>
          <strong>{exercise.name}</strong>
          <span>Masin #{exercise.machineNumber || '-'}</span>
        </Link>
      </li>)}
      {exercises?.length === 0 ? <li className="empty-card">Harjutusi veel ei ole.</li> : null}
      {exercises && exercises.length > 0 && visibleExercises.length === 0 ? <li className="empty-card">Otsing ei andnud tulemusi.</li> : null}
    </ul>
  </section>;
}
