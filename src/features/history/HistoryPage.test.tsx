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
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
      {
        id: `${sessionExerciseId}-3`,
        workoutSessionExerciseId: sessionExerciseId,
        setNumber: 3,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
    ]);

    render(<HistoryPage />);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('1/1 edukat')).toBeInTheDocument();
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

  it('shows exercises in the performed order based on session orderIndex', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');
    const firstExerciseId = createId('session-exercise');
    const secondExerciseId = createId('session-exercise');

    await db.sessions.add({
      id: sessionId,
      workoutDayId: createId('day'),
      performedAt: timestamp,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessionExercises.bulkAdd([
      {
        id: firstExerciseId,
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
        orderIndex: 1,
      },
      {
        id: secondExerciseId,
        workoutSessionId: sessionId,
        dayExerciseId: createId('day-exercise'),
        exerciseName: 'Leg Press',
        machineNumber: '17',
        targetSets: 3,
        successesRequired: 1,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 100,
        weightStep: 5,
        orderIndex: 0,
      },
    ]);

    render(<HistoryPage />);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    details.setAttribute('open', '');

    const names = (await screen.findAllByRole('strong')).map((element) => element.textContent);
    expect(names.slice(-2)).toEqual(['Leg Press', 'Chest Press']);
  });

  it('keeps a failed exercise in its first performed position even if its orderIndex changes later', async () => {
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

    await db.sessionExercises.bulkAdd([
      {
        id: createId('session-exercise'),
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
        performedOrder: 0,
      },
      {
        id: createId('session-exercise'),
        workoutSessionId: sessionId,
        dayExerciseId: createId('day-exercise'),
        exerciseName: 'Shoulder Press',
        machineNumber: '14',
        targetSets: 3,
        successesRequired: 1,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 40,
        weightStep: 5,
        orderIndex: 2,
        performedOrder: 1,
      },
      {
        id: createId('session-exercise'),
        workoutSessionId: sessionId,
        dayExerciseId: createId('day-exercise'),
        exerciseName: 'Leg Press',
        machineNumber: '17',
        targetSets: 3,
        successesRequired: 1,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 100,
        weightStep: 5,
        orderIndex: 1,
        performedOrder: 2,
      },
    ]);

    render(<HistoryPage />);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    details.setAttribute('open', '');

    const names = (await screen.findAllByRole('strong')).map((element) => element.textContent);
    expect(names.slice(-3)).toEqual(['Chest Press', 'Shoulder Press', 'Leg Press']);
  });
});
