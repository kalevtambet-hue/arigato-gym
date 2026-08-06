import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../db/appDb';
import { createId } from '../../lib/id';
import { ExercisesListPage } from './ExercisesListPage';

describe('ExercisesListPage', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.exercises],
      async () => {
        await db.setResults.clear();
        await db.sessionExercises.clear();
        await db.sessions.clear();
        await db.dayExercises.clear();
        await db.exercises.clear();
      },
    );
  });

  afterEach(cleanup);

  it('shows the last completed load and the next plan target without duplicating plan navigation', async () => {
    const timestamp = new Date().toISOString();
    const exerciseId = createId('exercise');
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');

    await db.exercises.add({ id: exerciseId, name: 'Rinnalt surumine', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.dayExercises.add({ id: createId('day-exercise'), workoutDayId: createId('day'), exerciseId, sortOrder: 0, targetSets: 3, successesRequired: 3, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 65, weightStep: 2.5, restSeconds: 60, createdAt: timestamp, updatedAt: timestamp });
    await db.sessions.add({ id: sessionId, workoutDayId: createId('day'), performedAt: timestamp, status: 'completed', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({ id: sessionExerciseId, workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseId, exerciseName: 'Rinnalt surumine', machineNumber: '12', targetSets: 3, successesRequired: 3, repMode: 'range', targetRepsMin: 10, targetRepsMax: 15, currentWeight: 60, weightStep: 2.5, orderIndex: 0 });
    await db.setResults.bulkAdd([1, 2, 3].map((setNumber) => ({ id: `${sessionExerciseId}-${setNumber}`, workoutSessionExerciseId: sessionExerciseId, setNumber, status: 'success' as const, completedReps: 15, usedWeight: 60 })));

    render(<MemoryRouter><ExercisesListPage /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: 'Halda päevi' })).not.toBeInTheDocument();
    expect(await screen.findByText('Viimane: 60 kg · 3/3 tehtud')).toBeInTheDocument();
    expect(screen.getByText('Järgmine siht: 3 × 10-15 x 65 kg')).toBeInTheDocument();
  });

  it('shows an unspecified target when progression requirements are disabled', async () => {
    const timestamp = new Date().toISOString();
    await db.exercises.bulkAdd([
      { id: 'successes-zero', name: 'Kükk', machineNumber: '', notes: '', createdAt: timestamp, updatedAt: timestamp },
      { id: 'step-zero', name: 'Jõutõmme', machineNumber: '', notes: '', createdAt: timestamp, updatedAt: timestamp },
    ]);
    await db.dayExercises.bulkAdd([
      { id: 'plan-successes-zero', workoutDayId: 'day', exerciseId: 'successes-zero', sortOrder: 0, targetSets: 3, successesRequired: 0, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 60, weightStep: 5, restSeconds: 60, createdAt: timestamp, updatedAt: timestamp },
      { id: 'plan-step-zero', workoutDayId: 'day', exerciseId: 'step-zero', sortOrder: 1, targetSets: 3, successesRequired: 2, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 80, weightStep: 0, restSeconds: 60, createdAt: timestamp, updatedAt: timestamp },
    ]);

    render(<MemoryRouter><ExercisesListPage /></MemoryRouter>);

    expect((await screen.findAllByText('Siht määramata')).length).toBe(2);
    expect(screen.queryByText('Järgmine siht: 3 × 8-12 x 60 kg')).not.toBeInTheDocument();
    expect(screen.queryByText('Järgmine siht: 3 × 8-12 x 80 kg')).not.toBeInTheDocument();
  });

  it('shows a clear empty state with an action to add the first exercise', async () => {
    render(<MemoryRouter><ExercisesListPage /></MemoryRouter>);

    expect(await screen.findByText('Sul pole veel harjutusi.')).toBeInTheDocument();
    expect(screen.getByText('Lisa esimene harjutus, et saaksid treeningkava koostada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lisa harjutus' })).toBeInTheDocument();
  });

  it('lets the user clear an exercise search with no results', async () => {
    const timestamp = new Date().toISOString();
    await db.exercises.add({ id: createId('exercise'), name: 'Rinnalt surumine', machineNumber: '12', notes: '', createdAt: timestamp, updatedAt: timestamp });
    const user = userEvent.setup();
    render(<MemoryRouter><ExercisesListPage /></MemoryRouter>);

    await user.type(await screen.findByLabelText('Otsi harjutust'), 'kükk');

    expect(screen.getByText('Sellise otsinguga harjutusi ei leitud.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tühjenda otsing' }));
    expect(await screen.findByRole('link', { name: /Rinnalt surumine/ })).toBeInTheDocument();
  });
});
