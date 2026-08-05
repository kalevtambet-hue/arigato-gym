import { cleanup, render, screen } from '@testing-library/react';
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

  it('shows the last completed load and the next plan target for an exercise', async () => {
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

    expect(await screen.findByText('Viimane: 60 kg · 3/3 tehtud')).toBeInTheDocument();
    expect(screen.getByText('Järgmine siht: 3 × 10-15 x 65 kg')).toBeInTheDocument();
  });
});
