import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import { createId } from '../../lib/id';

function nowIso() { return new Date().toISOString(); }

export function KavadPage() {
  useEffect(() => { void ensureSeedData(); }, []);
  const days = useLiveQuery(
    () => db.workoutDays.orderBy('sortOrder').filter((day) => !day.isArchived).toArray(),
    [],
  );
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');

  async function addDay() {
    const timestamp = nowIso();
    await db.workoutDays.add({
      id: createId('day'), name: name.trim(), notes: '', sortOrder: await db.workoutDays.count(),
      isArchived: false, createdAt: timestamp, updatedAt: timestamp,
    });
    setName('');
    setFormOpen(false);
  }

  return <section className="page plans-page">
    <div className="section-header">
      <div>
        <p className="eyebrow">Treeningu mallid</p>
        <h2>Kavad</h2>
        {days?.length ? <p className="page-summary">{days.length} treeningpäeva</p> : null}
      </div>
      {days?.length ? <button type="button" className="primary-button" onClick={() => setFormOpen(true)}>Lisa treeningpäev</button> : null}
    </div>
    {formOpen ? <div className="modal-card">
      <h3>Uus treeningpäev</h3>
      <label>Päeva nimi<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Loobu</button>
        <button type="button" className="primary-button" disabled={!name.trim()} onClick={() => void addDay()}>Salvesta päev</button>
      </div>
    </div> : null}
    <ul className="stack-list plan-list" aria-label="Treeningpäevad">
      {(days ?? []).map((day, index) => <li key={day.id} className="list-card plan-list-row">
        <Link className="day-link" to={`/kavad/${day.id}`}>
          <span className="list-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <strong>{day.name}</strong>
          <span>{day.notes || 'Ava päeva harjutused ja sihid'}</span>
        </Link>
      </li>)}
      {days?.length === 0 ? <li className="empty-card empty-state">
        <h3>Sul pole veel treeningpäevi.</h3>
        <p>Loo esimene treeningpäev ja lisa sellele harjutused.</p>
        <button type="button" className="primary-button" onClick={() => setFormOpen(true)}>Lisa treeningpäev</button>
      </li> : null}
    </ul>
  </section>;
}
