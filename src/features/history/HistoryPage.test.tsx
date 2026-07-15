import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { createId } from '../../lib/id';
import { HistoryPage } from './HistoryPage';

function nowIso() {
  return new Date().toISOString();
}

describe('HistoryPage', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.workoutDays, db.exercises],
      async () => {
        await db.setResults.clear();
        await db.sessionExercises.clear();
        await db.sessions.clear();
        await db.dayExercises.clear();
        await db.workoutDays.clear();
        await db.exercises.clear();
      },
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('shows history sessions as collapsed date groups', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');

    await db.sessions.add({
      id: sessionId,
      workoutDayId: createId('day'),
      performedAt: timestamp,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<HistoryPage />);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    expect(details).not.toHaveAttribute('open');
  });

  it('marks unfinished exercises in red', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');

    await db.sessions.add({
      id: sessionId,
      workoutDayId: createId('day'),
      performedAt: timestamp,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessionExercises.add({
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId: createId('day-exercise'),
      exerciseName: 'Chest Press',
      machineNumber: '12',
      targetSets: 3,
      successesRequired: 1,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      orderIndex: 0,
    });

    await db.setResults.bulkAdd([
      {
        id: `${sessionExerciseId}-1`,
        workoutSessionExerciseId: sessionExerciseId,
        setNumber: 1,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
      {
        id: `${sessionExerciseId}-2`,
        workoutSessionExerciseId: sessionExerciseId,
        setNumber: 2,
        status: 'failed',
        completedReps: 8,
        usedWeight: 60,
      },
    ]);

    render(<HistoryPage />);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    details.setAttribute('open', '');

    const exerciseRow = await screen.findByTestId(`history-exercise-${sessionExerciseId}`);
    expect(exerciseRow).toHaveClass('history-item-failed');
  });
});
