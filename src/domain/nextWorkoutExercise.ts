type SessionExercise = {
  id: string;
  targetSets: number;
  orderIndex: number;
};

export function getNextWorkoutExercise<T extends SessionExercise>(
  exercises: T[],
  completedSetCounts: Map<string, number>,
  circuitMode: boolean,
): T | undefined {
  const pending = exercises.filter(
    (exercise) => (completedSetCounts.get(exercise.id) ?? 0) < exercise.targetSets,
  );

  if (!circuitMode) {
    return pending[0];
  }

  return pending.reduce<T | undefined>((next, exercise) => {
    if (!next) return exercise;

    const exerciseCount = completedSetCounts.get(exercise.id) ?? 0;
    const nextCount = completedSetCounts.get(next.id) ?? 0;
    if (exerciseCount !== nextCount) return exerciseCount < nextCount ? exercise : next;
    return exercise.orderIndex < next.orderIndex ? exercise : next;
  }, undefined);
}
