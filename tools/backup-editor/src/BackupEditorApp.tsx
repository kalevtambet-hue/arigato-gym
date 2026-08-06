import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  addDayExercise,
  addExercise,
  addWorkoutDay,
  parseBackup,
  removeDayExercise,
  removeExercise,
  removeWorkoutDay,
  updateDayExercise,
  updateExercise,
  updateWorkoutDay,
  validateBackup,
} from './backupModel';
import type { Backup, DayExercise } from './backupModel';

type Tab = 'exercises' | 'days';
type FileHandle = { getFile(): Promise<File>; createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> };

declare global {
  interface Window {
    showOpenFilePicker?: (options: { types: Array<{ description: string; accept: Record<string, string[]> }>; multiple: boolean }) => Promise<FileHandle[]>;
  }
}

export function BackupEditorApp({ initialBackup }: { initialBackup?: Backup }) {
  const [backup, setBackup] = useState<Backup | undefined>(initialBackup);
  const [tab, setTab] = useState<Tab>('exercises');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>();
  const [selectedDayId, setSelectedDayId] = useState<string | undefined>();
  const [handle, setHandle] = useState<FileHandle>();
  const [fileName, setFileName] = useState(initialBackup ? 'Muutmata varundus' : '');
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const errors = backup ? validateBackup(backup) : [];

  const loadFile = async (file: File, nextHandle?: FileHandle) => {
    try {
      const parsed = parseBackup(await file.text());
      setBackup(parsed);
      setHandle(nextHandle);
      setFileName(file.name);
      setSelectedExerciseId(undefined);
      setSelectedDayId(undefined);
      setMessage('Varundus on avatud. Ajalugu jääb muutmata.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Faili ei saanud avada.');
    }
  };

  const chooseFile = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [nextHandle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'JSON-varundus', accept: { 'application/json': ['.json'] } }],
        });
        if (nextHandle) await loadFile(await nextHandle.getFile(), nextHandle);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') return;
        setMessage('Brauseri failivalik ebaõnnestus. Vali fail tavapärase failivalija kaudu.');
        fileInput.current?.click();
      }
      return;
    }
    fileInput.current?.click();
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
    event.target.value = '';
  };

  const saveSameFile = async () => {
    if (!backup || !handle) return;
    if (errors.length) {
      setMessage('Enne salvestamist paranda kontrolli vead.');
      return;
    }
    try {
      const writer = await handle.createWritable();
      await writer.write(JSON.stringify(backup, null, 2));
      await writer.close();
      setMessage('Muudatused salvestati faili „' + fileName + '”.');
    } catch {
      setMessage('Salvestamine katkestati või ebaõnnestus.');
    }
  };

  const selectExercise = (id: string) => setSelectedExerciseId(id);
  const selectedExercise = backup?.exercises.find((exercise) => exercise.id === selectedExerciseId);
  const selectedDay = backup?.workoutDays.find((day) => day.id === selectedDayId);

  return <main className="backup-editor">
    <header className="editor-header">
      <div><p className="eyebrow">AINULT SELLES SEADMES</p><h1>Varunduse muutja</h1><p>Muuda treeningpäevi ja harjutuste seadistusi. Treeningajalugu ei muudeta.</p></div>
      <div className="header-actions">
        <button className="button secondary" type="button" onClick={() => void chooseFile()}>Vali varundusfail</button>
        {handle ? <button className="button" type="button" disabled={!backup} onClick={() => void saveSameFile()}>Salvesta faili</button> : <button className="button" type="button" disabled>Salvestamine pole saadaval</button>}
        <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={onFileInput} />
      </div>
    </header>
    {message && <p className="notice" role="status">{message}</p>}
    {backup && !handle && <p className="notice" role="status">Samasse faili saab salvestada Chrome’is või Edge’is, kui valid faili nupuga „Vali varundusfail”. Muudes brauserites saad faili vaadata ja muuta, kuid mitte salvestada.</p>}
    {!backup ? <section className="empty-state"><h2>Ava oma varundus</h2><p>Vali telefonist või arvutist kopeeritud <code>treeninguabiline-varundus.json</code> fail.</p></section> : <>
      <section className="summary" aria-label="Varunduse kokkuvõte">
        <span><strong>{backup.exercises.length}</strong> harjutust</span><span><strong>{backup.workoutDays.length}</strong> treeningpäeva</span><span><strong>{backup.dayExercises.length}</strong> päevaharjutust</span><span>{fileName}</span>
      </section>
      <nav className="tabs" aria-label="Muutmise vaated">
        <button type="button" aria-pressed={tab === 'exercises'} className={tab === 'exercises' ? 'active' : ''} onClick={() => setTab('exercises')}>Harjutused</button>
        <button type="button" aria-pressed={tab === 'days'} className={tab === 'days' ? 'active' : ''} onClick={() => setTab('days')}>Treeningpäevad</button>
      </nav>
      {tab === 'exercises' ? <Exercises backup={backup} selected={selectedExercise} onSelect={selectExercise} onChange={setBackup} onNotice={setMessage} /> : <Days backup={backup} selected={selectedDay} onSelect={setSelectedDayId} onChange={setBackup} onNotice={setMessage} />}
      <section className="validation" aria-labelledby="validation-title"><h2 id="validation-title">Kontroll enne salvestamist</h2>{errors.length ? <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p>Varunduse seosed ja numbriväljad on korras.</p>}</section>
    </>}
  </main>;
}

function Exercises({ backup, selected, onSelect, onChange, onNotice }: { backup: Backup; selected?: Backup['exercises'][number]; onSelect(id: string): void; onChange(backup: Backup): void; onNotice(message: string): void }) {
  const [adding, setAdding] = useState(false);
  const assigned = new Set(backup.dayExercises.map((item) => item.exerciseId));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); if (!name) return; if (selected) { onChange(updateExercise(backup, selected.id, { name, machineNumber: String(data.get('machine') ?? ''), notes: String(data.get('notes') ?? '') })); onNotice('Harjutuse muudatused on varunduses. Faili kirjutamiseks vajuta ülal „Salvesta faili”.'); } else { const next = addExercise(backup, { name, machineNumber: String(data.get('machine') ?? ''), notes: String(data.get('notes') ?? '') }); onChange(next); onSelect(next.exercises.at(-1)!.id); onNotice('Harjutus lisati varundusse. Faili kirjutamiseks vajuta ülal „Salvesta faili”.'); } setAdding(false); };
  const edit = selected || (adding ? undefined : undefined);
  return <section className="workspace"><div className="list-panel"><div className="section-title"><h2>Harjutuste kataloog</h2><button className="button" type="button" onClick={() => { setAdding(true); onSelect(''); }}>Lisa harjutus</button></div><ul className="record-list">{backup.exercises.map((exercise) => <li key={exercise.id}><button type="button" className={selected?.id === exercise.id ? 'record selected' : 'record'} onClick={() => { setAdding(false); onSelect(exercise.id); }}><strong>{exercise.name}</strong><span>{assigned.has(exercise.id) ? 'Treeningpäeval' : 'Pole treeningpäeval'}</span></button></li>)}</ul></div><div className="form-panel">{(selected || adding) ? <form key={selected?.id ?? 'new-exercise'} onSubmit={submit}><h2>{selected ? 'Muuda harjutust' : 'Uus harjutus'}</h2><label>Harjutuse nimi<input name="name" aria-label="Harjutuse nimi" required defaultValue={edit?.name ?? ''} /></label><label>Masina nr<input name="machine" defaultValue={edit?.machineNumber ?? ''} /></label><label>Märkus<textarea name="notes" defaultValue={edit?.notes ?? ''} /></label><div className="form-actions"><button className="button" type="submit">Salvesta harjutus</button>{selected && <button className="button danger" type="button" onClick={() => { if (window.confirm('Kas kustutada harjutus ja selle treeningpäeva seosed?')) { onChange(removeExercise(backup, selected.id)); onSelect(''); } }}>Kustuta harjutus</button>}</div></form> : <p className="muted">Vali harjutus või lisa uus. Ilma treeningpäevata harjutus on mobiilis kataloogis nähtav.</p>}</div></section>;
}

function Days({ backup, selected, onSelect, onChange, onNotice }: { backup: Backup; selected?: Backup['workoutDays'][number]; onSelect(id: string): void; onChange(backup: Backup): void; onNotice(message: string): void }) {
  const [adding, setAdding] = useState(false);
  const assignments = selected ? backup.dayExercises.filter((item) => item.workoutDayId === selected.id).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const submitDay = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('dayName') ?? '').trim(); if (!name) return; if (selected) { onChange(updateWorkoutDay(backup, selected.id, { name, notes: String(data.get('dayNotes') ?? '') })); onNotice('Treeningpäeva muudatused on varunduses. Faili kirjutamiseks vajuta ülal „Salvesta faili”.'); } else { const next = addWorkoutDay(backup, { name, notes: String(data.get('dayNotes') ?? '') }); onChange(next); onSelect(next.workoutDays.at(-1)!.id); onNotice('Treeningpäev lisati varundusse. Faili kirjutamiseks vajuta ülal „Salvesta faili”.'); } setAdding(false); };
  return <section className="workspace"><div className="list-panel"><div className="section-title"><h2>Treeningpäevad</h2><button className="button" type="button" onClick={() => { setAdding(true); onSelect(''); }}>Lisa treeningpäev</button></div><ul className="record-list">{backup.workoutDays.map((day) => <li key={day.id}><button type="button" className={selected?.id === day.id ? 'record selected' : 'record'} onClick={() => { setAdding(false); onSelect(day.id); }}><strong>{day.name}</strong><span>{day.isArchived ? 'Arhiveeritud' : 'Aktiivne'}</span></button></li>)}</ul></div><div className="form-panel">{(selected || adding) ? <><form key={selected?.id ?? 'new-day'} onSubmit={submitDay}><h2>{selected ? 'Muuda treeningpäeva' : 'Uus treeningpäev'}</h2><label>Treeningpäeva nimi<input name="dayName" aria-label="Treeningpäeva nimi" required defaultValue={selected?.name ?? ''} /></label><label>Märkus<textarea name="dayNotes" defaultValue={selected?.notes ?? ''} /></label><div className="form-actions"><button className="button" type="submit">Salvesta treeningpäev</button>{selected && <button className="button danger" type="button" onClick={() => { if (window.confirm('Kas kustutada treeningpäev ja selle päevaharjutused?')) { onChange(removeWorkoutDay(backup, selected.id)); onSelect(''); } }}>Kustuta treeningpäev</button>}</div></form>{selected && <DayExercises backup={backup} day={selected} assignments={assignments} onChange={onChange} />}</> : <p className="muted">Vali treeningpäev või lisa uus.</p>}</div></section>;
}

function isDurationMode(repMode: unknown): repMode is 'duration-fixed' | 'duration-range' {
  return repMode === 'duration-fixed' || repMode === 'duration-range';
}

function DayExercises({ backup, day, assignments, onChange }: { backup: Backup; day: Backup['workoutDays'][number]; assignments: DayExercise[]; onChange(backup: Backup): void }) {
  const [exerciseId, setExerciseId] = useState('');
  const available = backup.exercises.filter((exercise) => !assignments.some((item) => item.exerciseId === exercise.id));
  const changeNumber = (id: string, key: keyof Pick<DayExercise, 'targetSets' | 'successesRequired' | 'targetRepsMin' | 'targetRepsMax' | 'currentWeight' | 'weightStep' | 'restSeconds'>, value: string) => onChange(updateDayExercise(backup, id, { [key]: Number(value) }));
  return <section className="day-exercises"><h2>Päeva harjutused</h2><div className="add-assignment"><label>Lisa kataloogist<select aria-label="Lisa kataloogist" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}><option value="">Vali harjutus</option>{available.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label><button className="button secondary" type="button" disabled={!exerciseId} onClick={() => { onChange(addDayExercise(backup, day.id, exerciseId)); setExerciseId(''); }}>Lisa päevale</button></div>{assignments.length === 0 ? <p className="muted">Sellel päeval pole veel harjutusi.</p> : <div className="assignment-list">{assignments.map((assignment) => { const exercise = backup.exercises.find((item) => item.id === assignment.exerciseId); const isDuration = isDurationMode(assignment.repMode); const isFixed = assignment.repMode === 'fixed' || assignment.repMode === 'duration-fixed'; const minLabel = isDuration ? (isFixed ? 'Kestus (min)' : 'Min kestus (min)') : 'Min kordusi'; const maxLabel = isDuration ? 'Max kestus (min)' : 'Max kordusi'; return <fieldset key={assignment.id} className="assignment"><legend>{exercise?.name ?? 'Puuduv harjutus'}</legend><div className="number-grid"><label>Kordusrežiim<select aria-label="Kordusrežiim" value={assignment.repMode} onChange={(event) => onChange(updateDayExercise(backup, assignment.id, { repMode: event.target.value as DayExercise['repMode'] }))}><option value="fixed">Fikseeritud kordused</option><option value="range">Korduste vahemik</option><option value="duration-fixed">Fikseeritud kestus</option><option value="duration-range">Kestuse vahemik</option></select></label><NumberInput label="Seeriate arv" value={assignment.targetSets} onChange={(value) => changeNumber(assignment.id, 'targetSets', value)} /><NumberInput label="Õnnestumisi enne tõusu" value={assignment.successesRequired} onChange={(value) => changeNumber(assignment.id, 'successesRequired', value)} /><NumberInput label={minLabel} value={assignment.targetRepsMin} onChange={(value) => changeNumber(assignment.id, 'targetRepsMin', value)} />{!isFixed && <NumberInput label={maxLabel} value={assignment.targetRepsMax} onChange={(value) => changeNumber(assignment.id, 'targetRepsMax', value)} />}{isDuration ? <NumberInput label="Kestuse samm (min)" value={assignment.weightStep} step="0.5" onChange={(value) => changeNumber(assignment.id, 'weightStep', value)} /> : <><NumberInput label="Praegune raskus" value={assignment.currentWeight} step="0.5" onChange={(value) => changeNumber(assignment.id, 'currentWeight', value)} /><NumberInput label="Raskuse samm" value={assignment.weightStep} step="0.5" onChange={(value) => changeNumber(assignment.id, 'weightStep', value)} /></>}<NumberInput label="Paus (sek)" value={assignment.restSeconds} onChange={(value) => changeNumber(assignment.id, 'restSeconds', value)} /></div><button className="text-button danger-text" type="button" onClick={() => { if (window.confirm('Kas eemaldada harjutus sellelt treeningpäevalt?')) onChange(removeDayExercise(backup, assignment.id)); }}>Eemalda päevalt</button></fieldset>; })}</div>}</section>;
}

function NumberInput({ label, value, step = '1', onChange }: { label: string; value: number; step?: string; onChange(value: string): void }) {
  return <label>{label}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
