import type { RepMode, SetResultRecord, WorkoutSessionExerciseRecord } from '../../db/types';
import { formatTarget, isDurationMode } from '../../domain/targetMode';
import {
  clampRepValue,
  getProgressionRecommendationCopy,
  getRepStepperPresentation,
} from './workoutPresentation';

type SetState = 'pending' | 'success' | 'failed';

type ActiveExerciseCardProps = {
  exercise: WorkoutSessionExerciseRecord;
  setNumber: number;
  setStates: SetState[];
  setResults?: SetResultRecord[];
  selectedReps: number;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onSetClick?: (setNumber: number) => void;
  children?: React.ReactNode;
};

function isFixedMode(repMode: RepMode) {
  return repMode === 'fixed' || repMode === 'duration-fixed';
}

export function ActiveExerciseCard({
  exercise,
  setNumber,
  setStates,
  setResults = [],
  selectedReps,
  onWeightChange,
  onRepsChange,
  onSetClick,
  children,
}: ActiveExerciseCardProps) {
  const repStepper = getRepStepperPresentation(
    exercise.repMode,
    exercise.targetRepsMin,
    exercise.targetRepsMax,
  );
  const fixedReps = isFixedMode(exercise.repMode);
  const durationMode = isDurationMode(exercise.repMode);
  const resultsBySet = new Map(setResults.map((result) => [result.setNumber, result]));
  const unit = durationMode ? 'min' : 'kordust';

  return (
    <article className="workout-card active-exercise-card" data-testid="active-workout-card">
      <div className="active-workout-header" data-testid="active-workout-header">
        <div>
          <p className="eyebrow">Käsil</p>
          <h3>{exercise.exerciseName}</h3>
        </div>
        <span className="machine-pill">Masin #{exercise.machineNumber || '-'}</span>
      </div>

      <div className="active-target-line" data-testid="active-target-line">
        <strong>
          {exercise.targetSets} x {formatTarget(exercise.repMode, exercise.targetRepsMin, exercise.targetRepsMax, exercise.currentWeight)}
        </strong>
        <span>Seeria {setNumber} / {exercise.targetSets}</span>
      </div>

      <div className="active-control-grid" data-testid="active-control-grid">
        {!durationMode ? (
          <div className="active-control-group">
            <span className="active-control-label">Raskus</span>
            <div className="stepper-control" aria-label="Raskuse valik">
              <button
                type="button"
                className="secondary-button stepper-button"
                aria-label="Vähenda raskust"
                onClick={() => onWeightChange(Math.max(0, exercise.currentWeight - exercise.weightStep))}
              >
                −
              </button>
              <strong>{exercise.currentWeight} kg</strong>
              <button
                type="button"
                className="secondary-button stepper-button"
                aria-label="Suurenda raskust"
                onClick={() => onWeightChange(exercise.currentWeight + exercise.weightStep)}
              >
                +
              </button>
            </div>
          </div>
        ) : null}

        <div className="active-control-group">
          <span className="active-control-label">{durationMode ? 'Kestus' : 'Kordused'}</span>
          <div
            className={`stepper-control${fixedReps ? ' stepper-control-fixed' : ''}`}
            aria-label={durationMode ? 'Kestuse valik' : 'Korduste valik'}
          >
            {!fixedReps ? (
              <button
                type="button"
                className="secondary-button stepper-button"
                aria-label={durationMode ? 'Vähenda kestust' : 'Vähenda kordusi'}
                onClick={() => onRepsChange(clampRepValue(selectedReps - repStepper.step, repStepper.minimum, repStepper.maximum))}
              >
                −
              </button>
            ) : null}
            <strong>{fixedReps ? repStepper.targetValue : selectedReps}</strong>
            {!fixedReps ? (
              <button
                type="button"
                className="secondary-button stepper-button"
                aria-label={durationMode ? 'Suurenda kestust' : 'Suurenda kordusi'}
                onClick={() => onRepsChange(clampRepValue(selectedReps + repStepper.step, repStepper.minimum, repStepper.maximum))}
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="set-dots" aria-label="Seeriate seis">
        {setStates.map((state, index) => (
          <button
            type="button"
            key={`${exercise.id}-set-${index + 1}`}
            data-testid={`set-dot-${index + 1}`}
            className={`set-dot set-dot-${state}`}
            aria-label={`Seeria ${index + 1}: ${state}`}
            disabled={state === 'pending'}
            onClick={() => onSetClick?.(index + 1)}
          />
        ))}
      </div>
      <div className="set-status-list" aria-label="Seeriate üksikasjad">
        {setStates.map((state, index) => {
          const number = index + 1;
          const result = resultsBySet.get(number);
          const value = result?.completedReps ?? repStepper.targetValue;
          const status = state === 'success' ? '✓ tehtud' : state === 'failed' ? '✕ puudu' : number === setNumber ? 'sinu kord' : 'ootel';

          return (
            <button
              type="button"
              key={`${exercise.id}-set-status-${number}`}
              className={`set-status-row set-status-${state}${state === 'pending' && number === setNumber ? ' set-status-current' : ''}`}
              disabled={state === 'pending'}
              onClick={() => onSetClick?.(number)}
            >
              {`Seeria ${number} · ${value} ${unit} · ${status}`}
            </button>
          );
        })}
      </div>
      <p className="progression-copy">
        {getProgressionRecommendationCopy(exercise)}
      </p>
      {children}
    </article>
  );
}
