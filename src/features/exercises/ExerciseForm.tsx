import { useEffect, useState } from 'react';
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

  useEffect(() => {
    setName(initialExercise?.name ?? '');
    setMachineNumber(initialExercise?.machineNumber ?? '');
    setNotes(initialExercise?.notes ?? '');
  }, [initialExercise]);

  return (
    <div className="modal-card">
      <h3>{initialExercise ? 'Muuda harjutust' : 'Uus harjutus'}</h3>
      <label>
        Harjutuse nimi
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Masina number
        <input value={machineNumber} onChange={(event) => setMachineNumber(event.target.value)} />
      </label>
      <label>
        Märkus
        <input value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={onClose}>Loobu</button>
        <button
          type="button"
          className="primary-button"
          onClick={() => void onSave(name.trim(), machineNumber.trim(), notes.trim())}
          disabled={!name.trim()}
        >
          Salvesta harjutus
        </button>
      </div>
    </div>
  );
}
