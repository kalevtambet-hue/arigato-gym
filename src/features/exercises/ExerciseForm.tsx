import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ExerciseRecord } from '../../db/types';

export function ExerciseForm({
  initialExercise,
  onClose,
  onSave,
}: {
  initialExercise: ExerciseRecord | null;
  onClose: () => void;
  onSave: (name: string, machineNumber: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialExercise?.name ?? '');
  const [machineNumber, setMachineNumber] = useState(initialExercise?.machineNumber ?? '');
  const [notes, setNotes] = useState(initialExercise?.notes ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(initialExercise?.name ?? '');
    setMachineNumber(initialExercise?.machineNumber ?? '');
    setNotes(initialExercise?.notes ?? '');
    setNameError(null);
    setSaveError(null);
    setIsSaving(false);
  }, [initialExercise]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Sisesta harjutuse nimi.');
      nameInput.current?.focus();
      return;
    }

    if (isSaving) {
      return;
    }

    setNameError(null);
    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave(trimmedName, machineNumber.trim(), notes.trim());
    } catch {
      setSaveError('Harjutust ei saanud salvestada. Proovi uuesti.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="modal-card exercise-form" onSubmit={(event) => void handleSubmit(event)} noValidate aria-busy={isSaving}>
      <div className="exercise-form-heading">
        <h3>{initialExercise ? 'Muuda harjutust' : 'Uus harjutus'}</h3>
        <p className="muted">Nimi on kohustuslik. Ülejäänud teave on valikuline.</p>
      </div>
      <div className="exercise-form-primary-field">
        <label htmlFor="exercise-name">Harjutuse nimi</label>
        <input
          ref={nameInput}
          id="exercise-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(null);
            if (saveError) setSaveError(null);
          }}
          aria-invalid={nameError ? 'true' : undefined}
          aria-describedby={nameError ? 'exercise-name-error' : 'exercise-name-hint'}
          autoComplete="off"
        />
        <p id="exercise-name-hint" className="field-hint">Kohustuslik</p>
        {nameError ? <p id="exercise-name-error" className="field-error" role="alert">{nameError}</p> : null}
      </div>
      <fieldset className="exercise-form-section">
        <legend>Lisateave</legend>
        <label htmlFor="exercise-machine-number">
          Masina number
          <input id="exercise-machine-number" value={machineNumber} onChange={(event) => setMachineNumber(event.target.value)} autoComplete="off" />
        </label>
        <label htmlFor="exercise-notes">
          Märkus
          <textarea id="exercise-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </label>
      </fieldset>
      {saveError ? <p className="form-error" role="alert">{saveError}</p> : null}
      <div className="button-row exercise-form-actions">
        <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>Loobu</button>
        <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Salvestan…' : 'Salvesta harjutus'}</button>
      </div>
    </form>
  );
}
