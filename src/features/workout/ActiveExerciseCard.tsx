import type { RepMode, WorkoutSessionExerciseRecord } from '../../db/types';
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

  return (
    <article className="workout-card active-exercise-card" data-testid="active-workout-card">
      <p className="eyebrow">Järgmine harjutus</p>
      <h3>{exercise.exerciseName}</h3>
      <p className="machine-copy">Masin #{exercise.machineNumber || '-'}</p>
      <p className="target-copy">
        {exercise.targetSets} x {formatTarget(exercise.repMode, exercise.targetRepsMin, exercise.targetRepsMax, exercise.currentWeight)}
      </p>

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

      <p className="set-badge">Seeria {setNumber} / {exercise.targetSets}</p>
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
      <p className="progression-copy">
        {getProgressionRecommendationCopy(exercise)}
      </p>
      {children}
    </article>
  );
}
