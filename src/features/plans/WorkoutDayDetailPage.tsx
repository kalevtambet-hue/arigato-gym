import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/appDb';
import { ensureSeedData } from '../../db/repositories';
import type { DayExerciseRecord, ExerciseRecord } from '../../db/types';
import { formatTarget, isDurationMode, isFixedMode } from '../../domain/targetMode';
import { createId } from '../../lib/id';
import { getDefaultRestSeconds } from '../settings/restDuration';
import { canDuplicateDay } from './planDetail';

type DayExerciseView = DayExerciseRecord & { exercise?: ExerciseRecord };
function nowIso() { return new Date().toISOString(); }

function copyDayExercise(item: DayExerciseView, workoutDayId: string, timestamp: string): DayExerciseRecord {
  return {
    id: createId('day-exercise'), workoutDayId, exerciseId: item.exerciseId, sortOrder: item.sortOrder,
    targetSets: item.targetSets, successesRequired: item.successesRequired, repMode: item.repMode,
    targetRepsMin: item.targetRepsMin, targetRepsMax: item.targetRepsMax, currentWeight: item.currentWeight,
    weightStep: item.weightStep, restSeconds: item.restSeconds, createdAt: timestamp, updatedAt: timestamp,
  };
}

async function addDayExercise(workoutDayId: string, exerciseId: string) {
  const timestamp = nowIso();
  await db.dayExercises.add({ id: createId('day-exercise'), workoutDayId, exerciseId,
    sortOrder: await db.dayExercises.where('workoutDayId').equals(workoutDayId).count(), targetSets: 3,
    successesRequired: 1, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 40,
    weightStep: 5, restSeconds: getDefaultRestSeconds(), createdAt: timestamp, updatedAt: timestamp });
}
async function updateDayExercise(id: string, changes: Partial<Pick<DayExerciseRecord, 'targetSets' | 'successesRequired' | 'repMode' | 'targetRepsMin' | 'targetRepsMax' | 'currentWeight' | 'weightStep'>>) {
  const nextChanges = { ...changes };
  if (changes.repMode && isDurationMode(changes.repMode)) nextChanges.currentWeight = 0;
  if (changes.repMode && isFixedMode(changes.repMode)) {
    const fixed = changes.targetRepsMin ?? changes.targetRepsMax;
    if (fixed !== undefined) { nextChanges.targetRepsMin = fixed; nextChanges.targetRepsMax = fixed; }
  }
  await db.dayExercises.update(id, { ...nextChanges, updatedAt: nowIso() });
}
function buildModeChange(item: DayExerciseRecord, repMode: DayExerciseRecord['repMode']) {
  const changes: Partial<DayExerciseRecord> = { repMode };
  if (repMode === 'fixed' || repMode === 'duration-fixed') changes.targetRepsMax = item.targetRepsMin;
  if (isDurationMode(repMode)) { changes.currentWeight = 0; changes.weightStep = item.weightStep > 0 ? item.weightStep : 1; changes.targetRepsMin = item.targetRepsMin > 0 ? item.targetRepsMin : 10; changes.targetRepsMax = repMode === 'duration-fixed' ? changes.targetRepsMin : Math.max(item.targetRepsMax, changes.targetRepsMin); }
  return changes;
}

export function WorkoutDayDetailPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  useEffect(() => { void ensureSeedData(); }, []);
  const day = useLiveQuery(async () => dayId ? (await db.workoutDays.get(dayId)) ?? null : null, [dayId]);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const items = useLiveQuery(async () => {
    if (!dayId) return [] as DayExerciseView[];
    const rows = await db.dayExercises.where('workoutDayId').equals(dayId).sortBy('sortOrder');
    const exerciseMap = new Map((await db.exercises.toArray()).map((exercise) => [exercise.id, exercise]));
    return rows.map((row) => ({ ...row, exercise: exerciseMap.get(row.exerciseId) }));
  }, [dayId]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [dayName, setDayName] = useState('');
  const [dayNotes, setDayNotes] = useState('');
  useEffect(() => { setDayName(day?.name ?? ''); setDayNotes(day?.notes ?? ''); }, [day?.id, day?.name, day?.notes]);

  const itemList = useMemo(() => items ?? [], [items]);
  if (day === undefined) return null;
  if (!day || day.isArchived) return <section className="page"><p className="empty-card">Treeningpäeva ei leitud.</p><Link to="/kavad">Tagasi kavade juurde</Link></section>;
  const workoutDay = day;
  async function saveDay() { await db.workoutDays.update(workoutDay.id, { name: dayName.trim(), notes: dayNotes.trim(), updatedAt: nowIso() }); }
  async function duplicateDay() {
    const timestamp = nowIso(); const copyId = createId('day');
    await db.transaction('rw', db.workoutDays, db.dayExercises, async () => {
      await db.workoutDays.add({ ...workoutDay, id: copyId, name: `${workoutDay.name} koopia`, sortOrder: await db.workoutDays.count(), createdAt: timestamp, updatedAt: timestamp });
      await db.dayExercises.bulkAdd(itemList.map((item) => copyDayExercise(item, copyId, timestamp)));
    });
    navigate(`/kavad/${copyId}`);
  }
  async function deleteDay() { if (window.confirm(`Kustutada päev "${workoutDay.name}"?`)) { await db.transaction('rw', db.workoutDays, db.dayExercises, async () => { await db.dayExercises.where('workoutDayId').equals(workoutDay.id).delete(); await db.workoutDays.delete(workoutDay.id); }); navigate('/kavad'); } }

  return <section className="page workout-day-page">
    <div className="section-header workout-day-header"><div><p className="eyebrow">Treeningpäev</p><h2>{workoutDay.name}</h2><p className="page-summary">{itemList.length} harjutust</p></div><Link className="secondary-button" to="/kavad">Tagasi kavade juurde</Link></div>
    <div className="inline-form day-management-form">
      <label>Päeva nimi<input value={dayName} onChange={(event) => setDayName(event.target.value)} /></label>
      <label>Päeva märkus<input value={dayNotes} onChange={(event) => setDayNotes(event.target.value)} /></label>
      <button type="button" className="secondary-button" disabled={!dayName.trim() || (dayName.trim() === workoutDay.name && dayNotes === workoutDay.notes)} onClick={() => void saveDay()}>Salvesta nimi</button>
      <button type="button" className="secondary-button" disabled={!canDuplicateDay(items)} onClick={() => void duplicateDay()}>Duplikeeri päev</button>
      <button type="button" className="ghost-button" onClick={() => void deleteDay()}>Kustuta päev</button>
    </div>
    <div className="inline-form add-exercise-form"><select aria-label="Vali harjutus" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)}><option value="">Vali harjutus</option>{(exercises ?? []).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select><button type="button" className="primary-button" disabled={!selectedExerciseId} onClick={() => { void addDayExercise(workoutDay.id, selectedExerciseId); setSelectedExerciseId(''); }}>Lisa päeva</button></div>
    {itemList.length === 0 ? <p className="empty-card">Päevas veel harjutusi ei ole.</p> : null}
    <div className="stack day-exercise-list">{itemList.map((item, index) => <ExerciseRow key={item.id} item={item} index={index} expanded={expanded.includes(item.id)} onToggle={() => setExpanded((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />)}</div>
  </section>;
}

function ExerciseRow({ item, index, expanded, onToggle }: { item: DayExerciseView; index: number; expanded: boolean; onToggle: () => void }) {
  return <article className="config-card day-exercise-row" data-testid="day-exercise-row"><div className="config-head"><div className="day-exercise-title"><span className="list-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><strong>{item.exercise?.name ?? 'Harjutus'}</strong><p>Masin #{item.exercise?.machineNumber || '-'}</p><p>{item.targetSets} x {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}</p></div><div className="button-row day-exercise-actions"><button type="button" className="secondary-button" aria-expanded={expanded} aria-label={`${expanded ? 'Sulge' : 'Ava'} ${item.exercise?.name ?? 'harjutus'}`} onClick={onToggle}>{expanded ? 'Sulge' : 'Ava'}</button><button type="button" className="ghost-button" onClick={() => { if (window.confirm('Eemaldada harjutus päevast?')) void db.dayExercises.delete(item.id); }}>Eemalda</button></div></div>{expanded ? <TargetEditor item={item} /> : null}</article>;
}

function TargetEditor({ item }: { item: DayExerciseView }) {
  return <div className="field-grid">
    <NumberField label="Seeriate arv" value={item.targetSets} onChange={(value) => void updateDayExercise(item.id, { targetSets: value })} />
    <NumberField label="Õnnestumisi enne tõusu" value={item.successesRequired} min={1} onChange={(value) => void updateDayExercise(item.id, { successesRequired: Math.max(1, value) })} />
    <label>Sihi tüüp<select value={item.repMode} onChange={(event) => void updateDayExercise(item.id, buildModeChange(item, event.target.value as DayExerciseRecord['repMode']))}><option value="range">Kordused vahemik</option><option value="fixed">Kordused fikseeritud</option><option value="duration-range">Kestus vahemik</option><option value="duration-fixed">Kestus fikseeritud</option></select></label>
    {item.repMode === 'fixed' || item.repMode === 'duration-fixed' ? <NumberField label={item.repMode === 'fixed' ? 'Kordused' : 'Kestus (min)'} value={item.targetRepsMin} onChange={(value) => void updateDayExercise(item.id, { targetRepsMin: value, targetRepsMax: value })} /> : <><NumberField label={item.repMode === 'range' ? 'Min kordused' : 'Min kestus (min)'} value={item.targetRepsMin} onChange={(value) => void updateDayExercise(item.id, { targetRepsMin: value })} /><NumberField label={item.repMode === 'range' ? 'Max kordused' : 'Max kestus (min)'} value={item.targetRepsMax} onChange={(value) => void updateDayExercise(item.id, { targetRepsMax: value })} /></>}
    {isDurationMode(item.repMode) ? <NumberField label="Kestuse samm (min)" value={item.weightStep} onChange={(value) => void updateDayExercise(item.id, { weightStep: value })} /> : <><NumberField label="Raskus (kg)" value={item.currentWeight} onChange={(value) => void updateDayExercise(item.id, { currentWeight: value })} /><NumberField label="Raskuse samm (kg)" value={item.weightStep} onChange={(value) => void updateDayExercise(item.id, { weightStep: value })} /></>}
  </div>;
}

function NumberField({ label, value, min, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  const [draftValue, setDraftValue] = useState(String(value));
  useEffect(() => { setDraftValue(String(value)); }, [value]);
  return <label>{label}<input type="number" inputMode={label.includes('Raskus') ? 'decimal' : 'numeric'} value={draftValue} min={min} onChange={(event) => { setDraftValue(event.target.value); if (event.target.value) onChange(Number(event.target.value)); }} /></label>;
}
