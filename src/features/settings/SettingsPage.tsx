import type { BackupPayload, WorkoutSessionStatus } from '../../db/types';
import { clearLocalData, exportBackup, importBackup } from '../../db/repositories';
import { useState } from 'react';
import { parseCsv, toCsv } from './exportCsv';
import { getDefaultRestSeconds, setDefaultRestSeconds } from './restDuration';
import { getThemePreference, setThemePreference, type ThemePreference } from './theme';

function parseRepMode(value: unknown) {
  switch (value) {
    case 'fixed':
    case 'duration-fixed':
    case 'duration-range':
      return value;
    default:
      return 'range';
  }
}

function parseSessionStatus(value: unknown): WorkoutSessionStatus {
  switch (value) {
    case 'active':
    case 'partial':
    case 'completed':
      return value;
    default:
      return 'completed';
  }
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseRestDuration(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const seconds = Number(value);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

export function SettingsPage() {
  const versionLabel = `Versioon ${__APP_VERSION__} (${__APP_BUILD__})`;
  const [themePreference, setThemePreferenceState] = useState(getThemePreference);
  const [defaultRestSeconds, setDefaultRestSecondsState] = useState(getDefaultRestSeconds);
  const [defaultRestDurationDraft, setDefaultRestDurationDraft] = useState(() => String(getDefaultRestSeconds()));
  const [dataFeedback, setDataFeedback] = useState('');
  const helpSections = [
    {
      title: 'Privaatsus',
      content: [
        'Rakendus ei kogu, ei analüüsi ega saada sinu treeningandmeid kuhugi serverisse.',
        'Kõik andmed salvestatakse ainult selles seadmes ja brauseris kohalikku IndexedDB andmebaasi.',
        'Andmed liiguvad seadmest välja ainult siis, kui sina ise kasutad ekspordi või varunduse funktsioone.',
      ],
    },
    {
      title: 'Paigaldamine',
      content: [
        'Ava rakendus telefoni brauseris selle HTTPS aadressi kaudu.',
        'Androidis kasuta Chrome menüüst valikut Install app või Add to Home Screen.',
        'iPhoneis ava rakendus Safaris ja kasuta Share -> Add to Home Screen.',
      ],
    },
    {
      title: 'Kasutamine',
      content: [
        'Lisa esmalt Kavad lehel baasharjutused ja treeningpäevad.',
        'Seo harjutused päevadega ja määra seeriate arv, kordused või kestus ning raskus.',
        'Päevakava-harjutuse juures saad määrata puhkeaja, raskussammu ja mitu edukat treeningut on vaja enne automaatset progressiooni.',
        'Treeningu lehel vali päev, alusta trenni ja märgi iga seeria eraldi tehtuks või ebaõnnestunuks.',
        'Kui vaja, saad aktiivse harjutuse ajal +/- nuppudega muuta raskust ja järgmised seeriad kasutavad uut raskust kohe.',
      ],
    },
    {
      title: 'Varundus',
      content: [
        'Ekspordi varundus loob ühe täieliku JSON faili kogu andmestikust.',
        'Ekspordi CSV salvestab tabelid eraldi failidena arvutis vaatamiseks või muutmiseks.',
        'Impordi varundus või Impordi CSV kirjutab telefoni lokaalsed andmed vastava failiga üle.',
        'Õnnestunud impordi või ekspordi järel näitab rakendus kinnitust.',
      ],
    },
    {
      title: 'Tõrkeotsing',
      content: [
        'Kui telefonis ei paista uus versioon, vaata Seaded lehelt buildi numbrit ja ava rakendus uuesti brauseris.',
        'Versioon tähistab väljalaset ja buildinumber sulgudes konkreetset koodimuudatust.',
        'Kui andmed kaovad, taasta need eelnevalt eksporditud JSON või CSV failidest.',
        'Kui iPhone ei paku paigaldust, kontrolli et kasutad Safarit ja HTTPS aadressi.',
      ],
    },
  ] as const;

  const importCsvFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const current = await exportBackup();
    const next: BackupPayload = structuredClone(current);

    for (const file of Array.from(files)) {
      const rows = parseCsv(await file.text());
      switch (file.name) {
        case 'harjutused.csv':
          next.exercises = rows.map((row) => ({
            id: String(row.id ?? ''),
            name: String(row.name ?? ''),
            machineNumber: String(row.machineNumber ?? ''),
            notes: String(row.notes ?? ''),
            createdAt: String(row.createdAt ?? ''),
            updatedAt: String(row.updatedAt ?? ''),
          }));
          break;
        case 'treeningpaevad.csv':
          next.workoutDays = rows.map((row) => ({
            id: String(row.id ?? ''),
            name: String(row.name ?? ''),
            notes: String(row.notes ?? ''),
            sortOrder: Number(row.sortOrder ?? 0),
            isArchived: String(row.isArchived ?? 'false') === 'true',
            createdAt: String(row.createdAt ?? ''),
            updatedAt: String(row.updatedAt ?? ''),
          }));
          break;
        case 'paevaharjutused.csv':
          next.dayExercises = rows.map((row) => ({
            id: String(row.id ?? ''),
            workoutDayId: String(row.workoutDayId ?? ''),
            exerciseId: String(row.exerciseId ?? ''),
            sortOrder: Number(row.sortOrder ?? 0),
            targetSets: Number(row.targetSets ?? 0),
            successesRequired: Number(row.successesRequired ?? 1),
            repMode: parseRepMode(row.repMode),
            targetRepsMin: Number(row.targetRepsMin ?? 0),
            targetRepsMax: Number(row.targetRepsMax ?? 0),
            currentWeight: Number(row.currentWeight ?? 0),
            weightStep: Number(row.weightStep ?? 0),
            restSeconds: Number(row.restSeconds ?? 0),
            createdAt: String(row.createdAt ?? ''),
            updatedAt: String(row.updatedAt ?? ''),
          }));
          break;
        case 'sessioonid.csv':
          next.sessions = rows.map((row) => ({
            id: String(row.id ?? ''),
            workoutDayId: String(row.workoutDayId ?? ''),
            performedAt: String(row.performedAt ?? ''),
            status: parseSessionStatus(row.status),
            createdAt: String(row.createdAt ?? ''),
            updatedAt: String(row.updatedAt ?? ''),
          }));
          break;
        case 'sessiooni-harjutused.csv':
          next.sessionExercises = rows.map((row) => ({
            id: String(row.id ?? ''),
            workoutSessionId: String(row.workoutSessionId ?? ''),
            dayExerciseId: String(row.dayExerciseId ?? ''),
            exerciseId: row.exerciseId === undefined || row.exerciseId === '' ? null : String(row.exerciseId),
            exerciseName: String(row.exerciseName ?? ''),
            machineNumber: String(row.machineNumber ?? ''),
            targetSets: Number(row.targetSets ?? 0),
            successesRequired: Number(row.successesRequired ?? 1),
            repMode: parseRepMode(row.repMode),
            targetRepsMin: Number(row.targetRepsMin ?? 0),
            targetRepsMax: Number(row.targetRepsMax ?? 0),
            currentWeight: Number(row.currentWeight ?? 0),
            weightStep: Number(row.weightStep ?? 0),
            orderIndex: Number(row.orderIndex ?? 0),
            performedOrder:
              row.performedOrder === undefined || row.performedOrder === ''
                ? null
                : Number(row.performedOrder),
          }));
          break;
        case 'seeriad.csv':
          next.setResults = rows.map((row) => ({
            id: String(row.id ?? ''),
            workoutSessionExerciseId: String(row.workoutSessionExerciseId ?? ''),
            setNumber: Number(row.setNumber ?? 0),
            status: row.status === 'success' ? 'success' : 'failed',
            completedReps: Number(row.completedReps ?? 0),
            usedWeight: row.usedWeight === undefined || row.usedWeight === '' ? null : Number(row.usedWeight),
          }));
          break;
        case 'harjutuse-sundmused.csv':
          next.exerciseEvents = rows.map((row) => ({
            id: String(row.id ?? ''),
            exerciseId: String(row.exerciseId ?? ''),
            sessionExerciseId:
              row.sessionExerciseId === undefined || row.sessionExerciseId === ''
                ? null
                : String(row.sessionExerciseId),
            createdAt: String(row.createdAt ?? ''),
            type: row.type === 'change' ? 'change' : 'note',
            actor: row.actor === 'automation' ? 'automation' : 'user',
            field:
              row.field === 'targetSets' || row.field === 'targetReps' || row.field === 'currentWeight'
                ? row.field
                : null,
            fromValue: row.fromValue === undefined || row.fromValue === '' ? null : String(row.fromValue),
            toValue: row.toValue === undefined || row.toValue === '' ? null : String(row.toValue),
            noteText: row.noteText === undefined || row.noteText === '' ? null : String(row.noteText),
          }));
          break;
        default:
          break;
      }
    }

    await importBackup(next);
  };

  return (
    <section className="page settings-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Varukoopia ja PWA</p>
          <h2>Seaded</h2>
        </div>
      </div>
      <div className="stack">
        <article className="panel settings-card compact-panel">
          <h3>Välimus</h3>
          <label>
            Välimus
            <select value={themePreference} onChange={(event) => {
              const preference = event.target.value as ThemePreference;
              setThemePreference(preference);
              setThemePreferenceState(preference);
            }}>
              <option value="system">Süsteemi järgi</option>
              <option value="light">Hele</option>
              <option value="dark">Tume</option>
            </select>
          </label>
        </article>
        <article className="panel settings-card compact-panel">
          <h3>Treening</h3>
          <label>
            Vaikimisi puhkeaeg (sek)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={defaultRestDurationDraft}
              onChange={(event) => {
                const draft = event.target.value;
                setDefaultRestDurationDraft(draft);
                const seconds = parseRestDuration(draft);
                if (seconds === null) {
                  return;
                }

                setDefaultRestSeconds(seconds);
                setDefaultRestSecondsState(seconds);
              }}
              onBlur={() => {
                if (parseRestDuration(defaultRestDurationDraft) === null) {
                  setDefaultRestDurationDraft(String(defaultRestSeconds));
                }
              }}
            />
          </label>
        </article>
        <article className="panel settings-card compact-panel">
          <h3>Andmed</h3>
          <div className="button-stack compact-button-stack">
            <button
              type="button"
              className="primary-button"
              onClick={async () => {
                const payload = await exportBackup();
                downloadText('treeninguabiline-varundus.json', JSON.stringify(payload, null, 2), 'application/json');
                setDataFeedback('Varunduse eksport õnnestus');
              }}
            >
              Ekspordi varundus
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                const payload = await exportBackup();
                downloadText('harjutused.csv', toCsv(payload.exercises), 'text/csv');
                downloadText('treeningpaevad.csv', toCsv(payload.workoutDays), 'text/csv');
                downloadText('paevaharjutused.csv', toCsv(payload.dayExercises), 'text/csv');
                downloadText('sessioonid.csv', toCsv(payload.sessions), 'text/csv');
                downloadText('sessiooni-harjutused.csv', toCsv(payload.sessionExercises), 'text/csv');
                downloadText('seeriad.csv', toCsv(payload.setResults), 'text/csv');
                downloadText('harjutuse-sundmused.csv', toCsv(payload.exerciseEvents), 'text/csv');
                setDataFeedback('CSV eksport õnnestus');
              }}
            >
              Ekspordi CSV
            </button>
            <label className="file-button">
              Impordi CSV
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                onChange={async (event) => {
                  await importCsvFiles(event.target.files);
                  event.target.value = '';
                  setDataFeedback('CSV import õnnestus');
                }}
              />
            </label>
            <label className="file-button">
              Impordi varundus
              <input
                type="file"
                accept="application/json"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  const text = await file.text();
                  await importBackup(JSON.parse(text));
                  event.target.value = '';
                  setDataFeedback('Varunduse import õnnestus');
                }}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                const confirmed = window.confirm(
                  'Kas kustutada kõik selles seadmes ja brauseris olevad treeningandmed? Seda ei saa tagasi võtta. Enne jätkamist ekspordi soovi korral JSON-varundus.',
                );
                if (!confirmed) {
                  return;
                }

                await clearLocalData();
                setDataFeedback('Kõik lokaalsed andmed on kustutatud');
              }}
            >
              Kustuta kõik lokaalsed andmed
            </button>
            {dataFeedback ? <p role="status" className="muted">{dataFeedback}</p> : null}
          </div>
        </article>

        <article className="panel settings-card compact-panel">
          <h3>PWA</h3>
          <p className="muted">
            Rakendus on installitav brauseri menust. Pärast esmast avamist töötab see ka ilma internetita.
          </p>
          <p className="muted">{versionLabel}</p>
        </article>

        <article className="panel settings-card compact-panel">
          <h3>Abi</h3>
          <div className="stack help-accordion">
            {helpSections.map((section) => (
              <details key={section.title} className="help-details">
                <summary>{section.title}</summary>
                <div className="help-content">
                  {section.content.map((paragraph) => (
                    <p key={paragraph} className="muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
