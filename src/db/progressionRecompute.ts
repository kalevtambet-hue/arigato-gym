import { recomputeProgressionFromHistory } from '../domain/progression';
import { db } from './appDb';
import type { SetResultRecord } from './types';

export async function correctHistoricalSetResult(
  setResultId: string,
  changes: Pick<SetResultRecord, 'status' | 'completedReps'> & Partial<Pick<SetResultRecord, 'usedWeight'>>,
) {
  await db.transaction('rw', [db.setResults, db.sessionExercises, db.sessions, db.dayExercises], async () => {
    const result = await db.setResults.get(setResultId);
    if (!result) {
      throw new Error(`Set result ${setResultId} was not found.`);
    }

    const sessionExercise = await db.sessionExercises.get(result.workoutSessionExerciseId);
    if (!sessionExercise) {
      throw new Error(`Session exercise ${result.workoutSessionExerciseId} was not found.`);
    }

    const session = await db.sessions.get(sessionExercise.workoutSessionId);
    if (!session || session.status !== 'completed') {
      throw new Error('Only completed session results can be corrected.');
    }

    const owner = await db.dayExercises.get(sessionExercise.dayExerciseId);
    if (!owner) {
      throw new Error(`Progression owner ${sessionExercise.dayExerciseId} was not found.`);
    }

    await db.setResults.update(setResultId, changes);

    const [completedSessions, sessionExercises, setResults] = await Promise.all([
      db.sessions.where('status').equals('completed').toArray(),
      db.sessionExercises.toArray(),
      db.setResults.toArray(),
    ]);
    const sessionById = new Map(completedSessions.map((item) => [item.id, item]));
    const resultsBySessionExercise = new Map<string, SetResultRecord[]>();
    for (const setResult of setResults) {
      const current = resultsBySessionExercise.get(setResult.workoutSessionExerciseId) ?? [];
      current.push(setResult);
      resultsBySessionExercise.set(setResult.workoutSessionExerciseId, current);
    }

    const recomputed = recomputeProgressionFromHistory({
      dayExerciseId: owner.id,
      entries: sessionExercises.flatMap((item) => {
        const completedSession = sessionById.get(item.workoutSessionId);
        return completedSession
          ? [{ session: completedSession, sessionExercise: item, results: resultsBySessionExercise.get(item.id) ?? [] }]
          : [];
      }),
    });
    if (!recomputed) {
      throw new Error(`Progression owner ${owner.id} has no completed history.`);
    }

    const { nextTarget } = recomputed.decision;
    await db.dayExercises.update(owner.id, {
      targetRepsMin: nextTarget.targetRepsMin,
      targetRepsMax: nextTarget.targetRepsMax,
      currentWeight: nextTarget.currentWeight,
      weightStep: nextTarget.weightStep,
      updatedAt: new Date().toISOString(),
    });
  });
}
