import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
        successesRequired: 1,
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
        successesRequired: 1,
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
        usedWeight: 60,
      },
      {
        id: `${firstSessionExerciseId}-2`,
        workoutSessionExerciseId: firstSessionExerciseId,
        setNumber: 2,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
      {
        id: `${firstSessionExerciseId}-3`,
        workoutSessionExerciseId: firstSessionExerciseId,
        setNumber: 3,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
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
      successesRequired: 1,
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
    expect(await screen.findByText('Õlale rahulik tempo')).toBeInTheDocument();
    expect(screen.getByText('Päeva harjutused')).toBeInTheDocument();
    expect(await screen.findByText('Chest Press')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Alusta treeningut' })).toBeInTheDocument();
  });

  it('creates starter workout days automatically for a new user', async () => {
    render(<WorkoutPage />);

    expect(await screen.findByText('Valitud päev')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Päev 1' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Päev 2' })).toBeInTheDocument();
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
      successesRequired: 1,
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
    expect(screen.queryByRole('button', { name: 'Muuda raskust' })).not.toBeInTheDocument();
  });

  it('allows changing the active exercise weight during a workout', async () => {
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

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Muuda raskust' }));
    await user.clear(screen.getByLabelText('Uus raskus (kg)'));
    await user.type(screen.getByLabelText('Uus raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta raskus' }));

    expect(await screen.findByText((content) => content.includes('3 x 10-15 x 45 kg'))).toBeInTheDocument();
    expect((await db.sessionExercises.get(sessionExerciseId))?.currentWeight).toBe(45);
  });

  it('allows moving an upcoming exercise to be next in the active workout', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');

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
        orderIndex: 1,
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
        orderIndex: 2,
      },
    ]);

    render(<WorkoutPage />);
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Chest Press' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tee Leg Press järgmisena' }));

    expect(await screen.findByRole('heading', { name: 'Leg Press' })).toBeInTheDocument();
  });

  it('allows cancelling an active workout and returns to day preview', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
    const sessionId = createId('session');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: 'Testpäev',
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
      successesRequired: 1,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
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
    });

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Katkesta treening' }));

    await waitFor(async () => {
      expect(await db.sessions.count()).toBe(0);
      expect(screen.getByText('Valitud päev')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Alusta treeningut' })).toBeInTheDocument();
    });
  });

  it('does not raise the target after only one successful workout when successesRequired is 2', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const dayExerciseId = createId('day-exercise');
    const sessionId = createId('session');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
      workoutDayId: dayId,
      exerciseId: createId('exercise'),
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
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
      id: createId('session-exercise'),
      workoutSessionId: sessionId,
      dayExerciseId,
      exerciseName: 'Chest Press',
      machineNumber: '12',
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      orderIndex: 0,
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

    expect(await screen.findByText('Järgmine siht')).toBeInTheDocument();
    expect(screen.getByText('3 x 10-15 x 60 kg')).toBeInTheDocument();

    await waitFor(async () => {
      expect((await db.dayExercises.get(dayExerciseId))?.currentWeight).toBe(60);
    });
  });

  it('raises the target on the second consecutive successful workout when successesRequired is 2', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const dayExerciseId = createId('day-exercise');
    const completedSessionId = createId('session');
    const activeSessionId = createId('session');
    const completedSessionExerciseId = createId('session-exercise');
    const activeSessionExerciseId = createId('session-exercise');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
      workoutDayId: dayId,
      exerciseId: createId('exercise'),
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 60,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessions.bulkAdd([
      {
        id: completedSessionId,
        workoutDayId: dayId,
        performedAt: timestamp,
        status: 'completed',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: activeSessionId,
        workoutDayId: dayId,
        performedAt: timestamp,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);

    await db.sessionExercises.bulkAdd([
      {
        id: completedSessionExerciseId,
        workoutSessionId: completedSessionId,
        dayExerciseId,
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        successesRequired: 2,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 60,
        weightStep: 5,
        orderIndex: 0,
      },
      {
        id: activeSessionExerciseId,
        workoutSessionId: activeSessionId,
        dayExerciseId,
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        successesRequired: 2,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 60,
        weightStep: 5,
        orderIndex: 0,
      },
    ]);

    await db.setResults.bulkAdd([
      {
        id: `${completedSessionExerciseId}-1`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 1,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
      {
        id: `${completedSessionExerciseId}-2`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 2,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
      {
        id: `${completedSessionExerciseId}-3`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 3,
        status: 'success',
        completedReps: 15,
        usedWeight: 60,
      },
    ]);

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

    expect(await screen.findByText('Järgmine siht')).toBeInTheDocument();
    expect(screen.getByText('3 x 10-15 x 65 kg')).toBeInTheDocument();

    await waitFor(async () => {
      expect((await db.dayExercises.get(dayExerciseId))?.currentWeight).toBe(65);
    });
  });

  it('stores the actual used weight for sets saved after a weight change', async () => {
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

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Muuda raskust' }));
    await user.clear(screen.getByLabelText('Uus raskus (kg)'));
    await user.type(screen.getByLabelText('Uus raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta raskus' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));

    expect((await db.setResults.get(`${sessionExerciseId}-1`))?.usedWeight).toBe(45);
  });

  it('uses the final session weight as the next base weight when progression does not advance', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const dayExerciseId = createId('day-exercise');
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

    await db.dayExercises.add({
      id: dayExerciseId,
      workoutDayId: dayId,
      exerciseId: createId('exercise'),
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 50,
      weightStep: 5,
      restSeconds: 90,
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
      dayExerciseId,
      exerciseName: 'Chest Press',
      machineNumber: '12',
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 50,
      weightStep: 5,
      orderIndex: 0,
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Muuda raskust' }));
    await user.clear(screen.getByLabelText('Uus raskus (kg)'));
    await user.type(screen.getByLabelText('Uus raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta raskus' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

    expect(await screen.findByText('Järgmine siht')).toBeInTheDocument();
    expect(screen.getByText('3 x 10-15 x 45 kg')).toBeInTheDocument();

    await waitFor(async () => {
      expect((await db.dayExercises.get(dayExerciseId))?.currentWeight).toBe(45);
    });
  });

  it('applies the progression step on top of the final session weight', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const dayExerciseId = createId('day-exercise');
    const completedSessionId = createId('session');
    const activeSessionId = createId('session');
    const completedSessionExerciseId = createId('session-exercise');
    const activeSessionExerciseId = createId('session-exercise');

    await db.workoutDays.add({
      id: dayId,
      name: 'Päev 1',
      notes: '',
      sortOrder: 0,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
      workoutDayId: dayId,
      exerciseId: createId('exercise'),
      sortOrder: 0,
      targetSets: 3,
      successesRequired: 2,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 50,
      weightStep: 5,
      restSeconds: 90,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.sessions.bulkAdd([
      {
        id: completedSessionId,
        workoutDayId: dayId,
        performedAt: timestamp,
        status: 'completed',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: activeSessionId,
        workoutDayId: dayId,
        performedAt: timestamp,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);

    await db.sessionExercises.bulkAdd([
      {
        id: completedSessionExerciseId,
        workoutSessionId: completedSessionId,
        dayExerciseId,
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        successesRequired: 2,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 45,
        weightStep: 5,
        orderIndex: 0,
      },
      {
        id: activeSessionExerciseId,
        workoutSessionId: activeSessionId,
        dayExerciseId,
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        successesRequired: 2,
        repMode: 'range',
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 50,
        weightStep: 5,
        orderIndex: 0,
      },
    ]);

    await db.setResults.bulkAdd([
      {
        id: `${completedSessionExerciseId}-1`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 1,
        status: 'success',
        completedReps: 15,
        usedWeight: 45,
      },
      {
        id: `${completedSessionExerciseId}-2`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 2,
        status: 'success',
        completedReps: 15,
        usedWeight: 45,
      },
      {
        id: `${completedSessionExerciseId}-3`,
        workoutSessionExerciseId: completedSessionExerciseId,
        setNumber: 3,
        status: 'success',
        completedReps: 15,
        usedWeight: 45,
      },
    ]);

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Muuda raskust' }));
    await user.clear(screen.getByLabelText('Uus raskus (kg)'));
    await user.type(screen.getByLabelText('Uus raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta raskus' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

    expect(await screen.findByText('Järgmine siht')).toBeInTheDocument();
    expect(screen.getByText('3 x 10-15 x 50 kg')).toBeInTheDocument();

    await waitFor(async () => {
      expect((await db.dayExercises.get(dayExerciseId))?.currentWeight).toBe(50);
    });
  });
});
