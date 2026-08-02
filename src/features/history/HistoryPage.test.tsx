import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { createId } from '../../lib/id';
import { HistoryPage } from './HistoryPage';
import { Link, MemoryRouter } from 'react-router-dom';

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

    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

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

    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

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

    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

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

    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    const details = await screen.findByTestId(`history-session-${sessionId}`);
    details.setAttribute('open', '');

    const names = (await screen.findAllByRole('strong')).map((element) => element.textContent);
    expect(names.slice(-3)).toEqual(['Chest Press', 'Shoulder Press', 'Leg Press']);
  });

  it('filters same-named snapshots by their exact exercise identity', async () => {
    const timestamp = nowIso();
    await db.exercises.bulkAdd([
      { id: 'chest-a', name: 'Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp },
      { id: 'chest-b', name: 'Chest Press', machineNumber: '13', notes: '', createdAt: timestamp, updatedAt: timestamp },
    ]);
    const sessionId = createId('session');
    await db.sessions.add({ id: sessionId, workoutDayId: createId('day'), performedAt: timestamp, status: 'completed', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.bulkAdd([
      { id: 'selected', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'chest-a', exerciseName: 'Chest Press', machineNumber: '12', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 0 },
      { id: 'same-name', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'chest-b', exerciseName: 'Chest Press', machineNumber: '13', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 1 },
    ]);

    render(<MemoryRouter initialEntries={['/ajalugu?exerciseId=chest-a']}><HistoryPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByLabelText('Filtreeri harjutuse järgi')).toHaveValue('Chest Press'));
    expect(screen.getByTestId('history-exercise-selected')).toBeInTheDocument();
    expect(screen.queryByTestId('history-exercise-same-name')).not.toBeInTheDocument();
  });

  it('keeps the historical snapshot name when a filtered exercise is renamed', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');
    await db.exercises.add({ id: 'chest', name: 'New Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.sessions.add({ id: sessionId, workoutDayId: createId('day'), performedAt: timestamp, status: 'completed', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({ id: 'historical', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'chest', exerciseName: 'Old Chest Press', machineNumber: '12', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 0 });

    render(<MemoryRouter initialEntries={['/ajalugu?exerciseId=chest']}><HistoryPage /></MemoryRouter>);

    expect(await screen.findByText('Old Chest Press')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Filtreeri harjutuse järgi')).toHaveValue('New Chest Press'));
  });

  it('shows a not-found filtered state for a deleted or unknown exercise id', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');
    await db.sessions.add({ id: sessionId, workoutDayId: createId('day'), performedAt: timestamp, status: 'completed', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({ id: 'unrelated', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'other', exerciseName: 'Leg Press', machineNumber: '17', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 0 });

    render(<MemoryRouter initialEntries={['/ajalugu?exerciseId=deleted']}><HistoryPage /></MemoryRouter>);

    expect(await screen.findByText('Valitud harjutust ei leitud.')).toBeInTheDocument();
    expect(screen.queryByTestId('history-exercise-unrelated')).not.toBeInTheDocument();
  });

  it('returns to unfiltered history when the exerciseId query parameter is removed', async () => {
    const timestamp = nowIso();
    const sessionId = createId('session');
    await db.exercises.add({ id: 'chest', name: 'Chest Press', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.sessions.add({ id: sessionId, workoutDayId: createId('day'), performedAt: timestamp, status: 'completed', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.bulkAdd([
      { id: 'chest-row', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'chest', exerciseName: 'Chest Press', machineNumber: '12', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 0 },
      { id: 'leg-row', workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId: 'leg', exerciseName: 'Leg Press', machineNumber: '17', targetSets: 1, successesRequired: 1, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 60, weightStep: 5, orderIndex: 1 },
    ]);

    render(<MemoryRouter initialEntries={['/ajalugu?exerciseId=chest']}><Link to="/ajalugu">Eemalda filter</Link><HistoryPage /></MemoryRouter>);
    const user = userEvent.setup();
    expect(await screen.findByTestId('history-exercise-chest-row')).toBeInTheDocument();
    expect(screen.queryByTestId('history-exercise-leg-row')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Eemalda filter' }));

    expect(await screen.findByTestId('history-exercise-leg-row')).toBeInTheDocument();
  });
});
