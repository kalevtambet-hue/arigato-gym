import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type { ExerciseRecord } from '../../db/types';
import { createId } from '../../lib/id';

function nowIso() { return new Date().toISOString(); }

export function KavadPage() {
  useEffect(() => { void ensureSeedData(); }, []);
  const days = useLiveQuery(
    () => db.workoutDays.orderBy('sortOrder').filter((day) => !day.isArchived).toArray(),
    [],
  );
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [exerciseFormOpen, setExerciseFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [machineNumber, setMachineNumber] = useState('');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [editingExercise, setEditingExercise] = useState<ExerciseRecord | null>(null);

  async function addDay() {
    const timestamp = nowIso();
    await db.workoutDays.add({
      id: createId('day'), name: name.trim(), notes: '', sortOrder: await db.workoutDays.count(),
      isArchived: false, createdAt: timestamp, updatedAt: timestamp,
    });
    setName('');
    setFormOpen(false);
  }

  async function saveExercise() {
    const timestamp = nowIso();
    if (editingExercise) {
      await db.exercises.update(editingExercise.id, {
        name: exerciseName.trim(), machineNumber: machineNumber.trim(), notes: exerciseNotes.trim(), updatedAt: timestamp,
      });
    } else {
      await db.exercises.add({
        id: createId('exercise'), name: exerciseName.trim(), machineNumber: machineNumber.trim(), notes: exerciseNotes.trim(),
        createdAt: timestamp, updatedAt: timestamp,
      });
    }
    setExerciseName('');
    setMachineNumber('');
    setExerciseNotes('');
    setEditingExercise(null);
    setExerciseFormOpen(false);
  }

  function openExerciseForm(exercise?: ExerciseRecord) {
    setEditingExercise(exercise ?? null);
    setExerciseName(exercise?.name ?? '');
    setMachineNumber(exercise?.machineNumber ?? '');
    setExerciseNotes(exercise?.notes ?? '');
    setExerciseFormOpen(true);
  }

  async function deleteExercise(exercise: ExerciseRecord) {
    if (!window.confirm(`Kustutada harjutus "${exercise.name}"?`)) return;
    await db.transaction('rw', db.exercises, db.dayExercises, async () => {
      await db.dayExercises.where('exerciseId').equals(exercise.id).delete();
      await db.exercises.delete(exercise.id);
    });
  }

  return <section className="page">
    <div className="section-header">
      <div><p className="eyebrow">Register ja mallid</p><h2>Kavad</h2></div>
      <div className="button-row">
        <button type="button" className="primary-button" onClick={() => openExerciseForm()}>Lisa harjutus</button>
        <button type="button" className="secondary-button" onClick={() => setFormOpen(true)}>Lisa treeningpäev</button>
      </div>
    </div>
    {formOpen ? <div className="modal-card">
      <h3>Uus treeningpäev</h3>
      <label>Päeva nimi<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Loobu</button>
        <button type="button" className="primary-button" disabled={!name.trim()} onClick={() => void addDay()}>Salvesta päev</button>
      </div>
    </div> : null}
    {exerciseFormOpen ? <div className="modal-card">
      <h3>{editingExercise ? 'Muuda harjutust' : 'Uus harjutus'}</h3>
      <label>Harjutuse nimi<input value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} /></label>
      <label>Masina number<input value={machineNumber} onChange={(event) => setMachineNumber(event.target.value)} /></label>
      <label>Märkus<input value={exerciseNotes} onChange={(event) => setExerciseNotes(event.target.value)} /></label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => { setEditingExercise(null); setExerciseFormOpen(false); }}>Loobu</button>
        <button type="button" className="primary-button" disabled={!exerciseName.trim()} onClick={() => void saveExercise()}>Salvesta harjutus</button>
      </div>
    </div> : null}
    <article className="panel">
      <h3>Baasharjutused</h3>
      <ul className="stack-list">
        {(exercises ?? []).map((exercise) => <li key={exercise.id} className="list-card">
          <div className="config-head"><div><strong>{exercise.name}</strong><span>Masin #{exercise.machineNumber || '-'}</span>{exercise.notes ? <p className="muted">{exercise.notes}</p> : null}</div><div className="button-row">
            <button type="button" className="secondary-button" aria-label={`Muuda ${exercise.name}`} onClick={() => openExerciseForm(exercise)}>Muuda</button>
            <button type="button" className="ghost-button" aria-label={`Kustuta ${exercise.name}`} onClick={() => void deleteExercise(exercise)}>Kustuta</button>
          </div></div>
        </li>)}
        {exercises?.length === 0 ? <li className="empty-card">Harjutusi veel ei ole.</li> : null}
      </ul>
    </article>
    <ul className="stack-list" aria-label="Treeningpäevad">
      {(days ?? []).map((day) => <li key={day.id} className="list-card">
        <Link className="day-link" to={`/kavad/${day.id}`}>
          <strong>{day.name}</strong>
          <span>{day.notes || 'Ava päeva harjutused ja sihid'}</span>
        </Link>
      </li>)}
      {days?.length === 0 ? <li className="empty-card">Treeningpäevi veel ei ole.</li> : null}
    </ul>
  </section>;
}
