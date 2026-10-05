import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { SetResultRecord, WorkoutSessionExerciseRecord } from '../../db/types';
import { formatResultValue, formatTarget, isDurationMode } from '../../domain/targetMode';

type EditableChanges = Pick<SetResultRecord, 'status' | 'completedReps'> & Partial<Pick<SetResultRecord, 'usedWeight'>>;

export function HistorySetEditor({
  sessionExercise,
  results,
  onSave,
  onClose,
}: {
  sessionExercise: WorkoutSessionExerciseRecord;
  results: SetResultRecord[];
  onSave: (setResultId: string, changes: EditableChanges) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [status, setStatus] = useState<SetResultRecord['status']>('success');
  const [metricValue, setMetricValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const duration = isDurationMode(sessionExercise.repMode);
  const orderedResults = useMemo(
    () => [...results].sort((left, right) => left.setNumber - right.setNumber || left.id.localeCompare(right.id)),
    [results],
  );
  const selectedResult = results.find((item) => item.id === selectedResultId) ?? null;

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function selectResult(result: SetResultRecord) {
    setSelectedResultId(result.id);
    setStatus(result.status);
    setMetricValue(String(result.completedReps));
    setWeightValue(result.usedWeight == null ? '' : String(result.usedWeight));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedResult || isSaving) return;
    const metricText = metricValue.trim();
    const completedReps = Number(metricText);
    if (!metricText || !Number.isFinite(completedReps) || completedReps < 0) {
      setFormError('Sisesta kehtiv tegelik tulemus.');
      return;
    }
    const usedWeight = weightValue.trim() === '' ? null : Number(weightValue);
    if (!duration && usedWeight != null && (!Number.isFinite(usedWeight) || usedWeight < 0)) {
      setFormError('Sisesta kehtiv tegelik raskus või jäta väli tühjaks.');
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await onSave(selectedResult.id, {
        status,
        completedReps,
        ...(duration ? {} : { usedWeight }),
      });
    } catch {
      setFormError('Tulemust ei saanud salvestada. Proovi uuesti.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="history-set-editor-overlay" role="dialog" aria-modal="true" aria-label="Muuda seeriaid" onKeyDown={(event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    }}>
    <section ref={dialogRef} className="modal-card history-set-editor" aria-busy={isSaving} tabIndex={-1}>
      <h3>Muuda seeriaid</h3>
      <p className="muted">Plaan: {formatTarget(sessionExercise.repMode, sessionExercise.targetRepsMin, sessionExercise.targetRepsMax, sessionExercise.currentWeight)}</p>
      <div className="stack-list" aria-label="Salvestatud seeriad">
        {orderedResults.map((result) => (
          <button key={result.id} type="button" className="secondary-button" onClick={() => selectResult(result)} disabled={isSaving}>
            {result.setNumber}. seeria: {formatResultValue(sessionExercise.repMode, result.completedReps)}{!duration && result.usedWeight != null ? ` · ${result.usedWeight} kg` : ''} · {result.status === 'success' ? 'õnnestus' : 'ebaõnnestus'}
          </button>
        ))}
      </div>
      {selectedResult ? (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label>
            Tulemus
            <select aria-label="Tulemus" value={status} onChange={(event) => setStatus(event.target.value as SetResultRecord['status'])} disabled={isSaving}>
              <option value="success">Õnnestus</option>
              <option value="failed">Ebaõnnestus</option>
            </select>
          </label>
          <label>
            {duration ? 'Tegelik kestus (min)' : 'Tegelikud kordused'}
            <input type="number" min="0" step="any" inputMode="decimal" value={metricValue} onChange={(event) => setMetricValue(event.target.value)} disabled={isSaving} />
          </label>
          {!duration ? (
            <label>
              Tegelik raskus (kg)
              <input type="number" min="0" step="any" inputMode="decimal" value={weightValue} onChange={(event) => setWeightValue(event.target.value)} disabled={isSaving} />
            </label>
          ) : null}
          {formError ? <p className="form-error" role="alert">{formError}</p> : null}
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>Loobu</button>
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Salvestan…' : 'Salvesta'}</button>
          </div>
        </form>
      ) : (
        <button type="button" className="secondary-button" onClick={onClose}>Loobu</button>
      )}
    </section>
    </div>
  );
}
