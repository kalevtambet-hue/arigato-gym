import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { createId } from '../../lib/id';
import { WorkoutPage } from './WorkoutPage';

function nowIso() {
  return new Date().toISOString();
}

describe('WorkoutPage', () => {
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

  it('shows workout progress with completed and remaining exercises', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');
    const firstSessionExerciseId = createId('session-exercise');
    const secondSessionExerciseId = createId('session-exercise');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessions.add({
      id: sessionId,
      workoutDayId: dayId,
      performedAt: timestamp,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessionExercises.bulkAdd([
      {
        id: firstSessionExerciseId,
        workoutSessionId: sessionId,
        dayExerciseId: createId('day-exercise'),
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 60,
        weightStep: 5,
        orderIndex: 0,
      },
      {
        id: secondSessionExerciseId,
        workoutSessionId: sessionId,
        dayExerciseId: createId('day-exercise'),
        exerciseName: 'Leg Press',
        machineNumber: '17',
        targetSets: 3,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 100,
        weightStep: 5,
        orderIndex: 1,
      },
    ]);

    await db.setResults.bulkAdd([
      {
        id: `${firstSessionExerciseId}-1`,
        workoutSessionExerciseId: firstSessionExerciseId,
        setNumber: 1,
        status: 'success',
        completedReps: 15,
      },
      {
        id: `${firstSessionExerciseId}-2`,
        workoutSessionExerciseId: firstSessionExerciseId,
        setNumber: 2,
        status: 'success',
        completedReps: 15,
      },
      {
        id: `${firstSessionExerciseId}-3`,
        workoutSessionExerciseId: firstSessionExerciseId,
        setNumber: 3,
        status: 'success',
        completedReps: 15,
      },
    ]);

    render(<WorkoutPage />);

    expect(await screen.findByText('Tehtud 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Jäänud 1')).toBeInTheDocument();
  });

  it('shows the selected day note and exercise preview before starting a workout', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: 'Õlale rahulik tempo',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: createId('day-exercise'),
      workoutDayId: dayId,
      exerciseId,
      sortOrder: 0,
      targetSets: 3,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    render(<WorkoutPage />);

    expect(await screen.findByText('Valitud päev')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Päev 1' })).toBeInTheDocument();
    expect(screen.getByText('Õlale rahulik tempo')).toBeInTheDocument();
    expect(screen.getByText('Päeva harjutused')).toBeInTheDocument();
    expect(screen.getByText('Chest Press')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alusta treeningut' })).toBeInTheDocument();
  });

  it('shows a setup empty state when no workout days exist', async () => {
    render(<WorkoutPage />);

    expect(await screen.findByText('Lisa esmalt treeningpäevad ja harjutused Kavad lehel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alusta treeningut' })).not.toBeInTheDocument();
  });

  it('renders duration targets without reps or weight', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessions.add({
      id: sessionId,
      workoutDayId: dayId,
      performedAt: timestamp,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessionExercises.add({
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId: createId('day-exercise'),
      exerciseName: 'Ellips',
      machineNumber: '',
      targetSets: 1,
      repMode: 'duration-range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 0,
      weightStep: 5,
      orderIndex: 0,
    });

    render(<WorkoutPage />);

    expect(await screen.findByText((content) => content.includes('1') && content.includes('10-15 min'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tehtud' })).toBeInTheDocument();
  });
});
