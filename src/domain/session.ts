import { createId } from '../lib/id';
import type { WorkoutSessionExerciseRecord } from '../db/types';
import type { SessionSeed } from './types';

export function buildSessionExercises(
  workoutSessionId: string,
  dayExercises: SessionSeed[],
): WorkoutSessionExerciseRecord[] {
  return [...dayExercises]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item, index) => ({
      id: createId('session-exercise'),
      workoutSessionId,
      dayExerciseId: item.id,
      exerciseName: item.exerciseName,
      machineNumber: item.machineNumber,
      targetSets: item.targetSets,
      repMode: item.repMode,
      targetRepsMin: item.targetRepsMin,
      targetRepsMax: item.targetRepsMax,
      currentWeight: item.currentWeight,
      weightStep: item.weightStep,
      orderIndex: index,
    }));
}
