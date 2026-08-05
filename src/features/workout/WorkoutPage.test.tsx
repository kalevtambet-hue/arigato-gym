import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import styles from '../../styles.css?raw';
import { db } from '../../db/appDb';
import { createId } from '../../lib/id';
import { WorkoutPage } from './WorkoutPage';

function nowIso() {
  return new Date().toISOString();
}

describe('WorkoutPage', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await db.transaction(
      'rw',
      [db.exerciseEvents, db.setResults, db.sessionExercises, db.sessions, db.dayExercises, db.workoutDays, db.exercises],
      async () => {
        await db.exerciseEvents.clear();
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
    vi.useRealTimers();
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

  it('saves the selected range repetitions when Tehtud is pressed', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');
    await db.workoutDays.add({ id: dayId, name: 'Päev', notes: '', sortOrder: 0, isArchived: false, createdAt: timestamp, updatedAt: timestamp });
    await db.sessions.add({ id: sessionId, workoutDayId: dayId, performedAt: timestamp, status: 'active', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({
      id: sessionExerciseId, workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseName: 'Leg Press', machineNumber: '7',
      targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 50, weightStep: 5, orderIndex: 0,
    });

    const user = userEvent.setup();
    render(<WorkoutPage />);
    await user.click(await screen.findByRole('button', { name: 'Vähenda kordusi' }));
    await user.click(screen.getByRole('button', { name: 'Tehtud' }));

    await waitFor(async () => {
      const result = await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).first();
      expect(result?.completedReps).toBe(11);
    });
  });

  it('keeps selected repetitions when the active exercise weight changes', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');
    await db.workoutDays.add({ id: dayId, name: 'Päev', notes: '', sortOrder: 0, isArchived: false, createdAt: timestamp, updatedAt: timestamp });
    await db.sessions.add({ id: sessionId, workoutDayId: dayId, performedAt: timestamp, status: 'active', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({
      id: sessionExerciseId, workoutSessionId: sessionId, dayExerciseId: createId('day-exercise'), exerciseName: 'Leg Press', machineNumber: '7',
      targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 50, weightStep: 5, orderIndex: 0,
    });

    const user = userEvent.setup();
    render(<WorkoutPage />);
    await user.click(await screen.findByRole('button', { name: 'Vähenda kordusi' }));
    await user.click(screen.getByRole('button', { name: 'Suurenda raskust' }));
    await waitFor(() => expect(screen.getByText('55 kg')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Tehtud' }));

    await waitFor(async () => {
      expect((await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).first())?.completedReps).toBe(11);
    });
  });

  it('applies rapid weight increases cumulatively and records each applied change once', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
    const dayExerciseId = createId('day-exercise');
    const sessionId = createId('session');
    const sessionExerciseId = createId('session-exercise');
    await db.workoutDays.add({ id: dayId, name: 'Päev', notes: '', sortOrder: 0, isArchived: false, createdAt: timestamp, updatedAt: timestamp });
    await db.exercises.add({ id: exerciseId, name: 'Leg Press', machineNumber: '7', notes: '', createdAt: timestamp, updatedAt: timestamp });
    await db.dayExercises.add({
      id: dayExerciseId, workoutDayId: dayId, exerciseId, sortOrder: 0, targetSets: 3, successesRequired: 1,
      repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 50, weightStep: 5, restSeconds: 60, createdAt: timestamp, updatedAt: timestamp,
    });
    await db.sessions.add({ id: sessionId, workoutDayId: dayId, performedAt: timestamp, status: 'active', createdAt: timestamp, updatedAt: timestamp });
    await db.sessionExercises.add({
      id: sessionExerciseId, workoutSessionId: sessionId, dayExerciseId, exerciseName: 'Leg Press', machineNumber: '7',
      targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 50, weightStep: 5, orderIndex: 0,
    });

    render(<WorkoutPage />);
    const increment = await screen.findByRole('button', { name: 'Suurenda raskust' });
    fireEvent.click(increment);
    fireEvent.click(increment);

    await waitFor(async () => {
      expect((await db.sessionExercises.get(sessionExerciseId))?.currentWeight).toBe(60);
    });
    const weightEvents = (await db.exerciseEvents.toArray()).filter((event) => event.field === 'currentWeight');
    expect(weightEvents).toHaveLength(2);
    expect(weightEvents.sort((left, right) => (left.fromValue ?? '').localeCompare(right.fromValue ?? '')).map((event) => [event.fromValue, event.toValue])).toEqual([
      ['50 kg', '55 kg'],
      ['55 kg', '60 kg'],
    ]);
  });

  it('allows partial completion when duplicate set numbers leave a planned set missing', async () => {
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
        id: `${sessionExerciseId}-duplicate-1`,
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
    ]);

    render(<WorkoutPage />);
    const user = userEvent.setup();

    expect(await screen.findByText('Tehtud 1 / 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lõpeta treening' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lõpeta poolikuna' }));

    await waitFor(async () => {
      expect((await db.sessions.get(sessionId))?.status).toBe('partial');
      expect(await db.setResults.count()).toBe(3);
    });
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

  it('selects and saves a duration-range value while hiding weight controls', async () => {
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

    const user = userEvent.setup();
    render(<WorkoutPage />);

    expect(await screen.findByText((content) => content.includes('1') && content.includes('10-15 min'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vähenda kestust' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vähenda raskust' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vähenda kestust' }));
    await user.click(screen.getByRole('button', { name: 'Tehtud' }));
    await waitFor(async () => {
      expect((await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).first())?.completedReps).toBe(14);
    });
  });

  it('shows failed set input inline inside the active workout card', async () => {
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

    await user.click(await screen.findByRole('button', { name: 'Ei tulnud täis' }));

    const workoutCard = screen.getByTestId('active-workout-card');
    expect(screen.getByLabelText('Tegelikud kordused')).toBeInTheDocument();
    expect(workoutCard).toContainElement(screen.getByLabelText('Tegelikud kordused'));
    expect(screen.queryByText('Ebaõnnestunud seeria')).not.toBeInTheDocument();
  });

  it('does not override successful and failed set-dot colors with the pending color', () => {
    expect(styles).not.toMatch(/\.set-dot\s*,\s*\.set-dot-pending\s*\{/);
  });

  it('shows set progress dots for pending, successful and failed sets', async () => {
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

    const getDots = () => screen.getAllByTestId(/^set-dot-/);

    expect(await screen.findByTestId('set-dot-1')).toHaveClass('set-dot-pending');
    expect(getDots()).toHaveLength(3);
    expect(screen.getByText('Seeria 1 · 15 kordust · sinu kord')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tehtud' }));
    await waitFor(() => {
      expect(screen.getByTestId('set-dot-1')).toHaveClass('set-dot-success');
    });
    expect(screen.getByTestId('set-dot-2')).toHaveClass('set-dot-pending');
    expect(screen.getByText('Seeria 1 · 15 kordust · ✓ tehtud')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ei tulnud täis' }));
    await user.type(screen.getByLabelText('Tegelikud kordused'), '8');
    await user.click(screen.getByRole('button', { name: 'Salvesta seeria' }));

    await waitFor(() => {
      expect(screen.getByTestId('set-dot-2')).toHaveClass('set-dot-failed');
    });
    expect(
      (await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).toArray()).find(
        (result) => result.setNumber === 2,
      )?.completedReps,
    ).toBe(8);
    expect(screen.getByTestId('set-dot-3')).toHaveClass('set-dot-pending');
    expect(screen.getByText('Seeria 2 · 8 kordust · ✕ puudu')).toBeInTheDocument();
  });

  it('prioritizes the main set actions and lets the user undo the latest set', async () => {
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

    const actionBar = await screen.findByTestId('sticky-action-bar');
    const actionButtons = within(actionBar)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter(Boolean);

    expect(actionButtons.slice(0, 2)).toEqual(['Ei tulnud täis', 'Tehtud']);

    await user.click(screen.getByRole('button', { name: 'Tehtud' }));

    expect(await screen.findByRole('button', { name: 'Võta tagasi' })).toBeInTheDocument();
    expect(await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).count()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Võta tagasi' }));

    await waitFor(async () => {
      expect(await db.setResults.where('workoutSessionExerciseId').equals(sessionExerciseId).count()).toBe(0);
    });
    expect(screen.getByTestId('set-dot-1')).toHaveClass('set-dot-pending');
  });

  it('starts a rest timer after saving a set and allows skipping it', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
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

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
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
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId,
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

    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));

    expect(await screen.findByText('Puhkus')).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jätan vahele' }));
    await waitFor(() => {
      expect(screen.queryByText('Puhkus')).not.toBeInTheDocument();
    });
  });

  it('restores the same next exercise and an elapsed-time-adjusted rest timer after remounting', async () => {
    const startedAt = new Date('2026-07-13T10:00:00.000Z').valueOf();
    const now = vi.spyOn(Date, 'now').mockReturnValue(startedAt);
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
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

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
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
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId,
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

    const firstRender = render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));

    expect(await screen.findByText('Puhkus')).toBeInTheDocument();
    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chest Press' })).toBeInTheDocument();

    now.mockReturnValue(startedAt + 10_000);

    firstRender.unmount();
    render(<WorkoutPage />);

    expect(await screen.findByText('Puhkus')).toBeInTheDocument();
    expect(screen.getByText('1:20')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chest Press' })).toBeInTheDocument();
  });

  it('uses mobile-friendly numeric keyboards for failed reps and target editing', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
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

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
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
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId,
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

    await user.click(await screen.findByRole('button', { name: 'Ei tulnud täis' }));
    expect(screen.getByLabelText('Tegelikud kordused')).toHaveAttribute('inputmode', 'numeric');

    await user.click(screen.getByRole('button', { name: /^Muuda sihti$/i }));
    expect(screen.getByLabelText('Raskus (kg)')).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText('Seeriate arv')).toHaveAttribute('inputmode', 'numeric');
  });

  it('shows a dedicated visible target edit button inside the active exercise card', async () => {
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

    const workoutCard = await screen.findByTestId('active-workout-card');
    expect(within(workoutCard).getByRole('button', { name: 'Muuda sihti' })).toBeInTheDocument();
  });

  it('shows exercise notes history and lets the user add a note', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
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

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
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
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId,
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

    await db.exerciseEvents.add({
      id: 'event-1',
      exerciseId,
      sessionExerciseId: null,
      createdAt: '2026-07-27T10:00:00.000Z',
      type: 'note',
      actor: 'user',
      field: null,
      fromValue: null,
      toValue: null,
      noteText: 'Hoia küünarnukid all',
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Märkmed' }));

    expect(screen.getByText('Sama harjutuse märkmed ja muudatused')).toBeInTheDocument();
    expect(screen.getByText(/Hoia küünarnukid all/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Lisa märkus'), 'Uus märkus');
    await user.click(screen.getByRole('button', { name: 'Salvesta märkus' }));

    expect(await screen.findByText(/Uus märkus/)).toBeInTheDocument();
  });

  it('allows changing the active exercise target during a workout', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const exerciseId = createId('exercise');
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

    await db.exercises.add({
      id: exerciseId,
      name: 'Chest Press',
      machineNumber: '12',
      notes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await db.dayExercises.add({
      id: dayExerciseId,
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
      id: sessionExerciseId,
      workoutSessionId: sessionId,
      dayExerciseId,
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

    await user.click(await screen.findByRole('button', { name: /^Muuda sihti$/i }));
    await user.clear(screen.getByLabelText('Seeriate arv'));
    await user.type(screen.getByLabelText('Seeriate arv'), '4');
    await user.clear(screen.getByLabelText('Min kordused'));
    await user.type(screen.getByLabelText('Min kordused'), '8');
    await user.clear(screen.getByLabelText('Max kordused'));
    await user.type(screen.getByLabelText('Max kordused'), '12');
    await user.clear(screen.getByLabelText('Raskus (kg)'));
    await user.type(screen.getByLabelText('Raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta siht' }));

    expect(await screen.findByText((content) => content.includes('4 x 8-12 x 45 kg'))).toBeInTheDocument();
    expect(await db.sessionExercises.get(sessionExerciseId)).toMatchObject({
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 12,
      currentWeight: 45,
    });
    expect(await db.dayExercises.get(dayExerciseId)).toMatchObject({
      targetSets: 4,
      targetRepsMin: 8,
      targetRepsMax: 12,
      currentWeight: 45,
    });
    const changeEvents = await db.exerciseEvents.orderBy('createdAt').toArray();
    expect(changeEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: 'user',
          field: 'targetSets',
          fromValue: '3',
          toValue: '4',
        }),
        expect.objectContaining({
          actor: 'user',
          field: 'targetReps',
          fromValue: '10-15',
          toValue: '8-12',
        }),
        expect.objectContaining({
          actor: 'user',
          field: 'currentWeight',
          fromValue: '60 kg',
          toValue: '45 kg',
        }),
      ]),
    );
  });

  it('allows editing a completed set from the set dot controls', async () => {
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

    await db.setResults.add({
      id: `${sessionExerciseId}-1`,
      workoutSessionExerciseId: sessionExerciseId,
      setNumber: 1,
      status: 'success',
      completedReps: 15,
      usedWeight: 60,
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    let editor: HTMLElement | null = null;
    await waitFor(async () => {
      fireEvent.click(await screen.findByTestId('set-dot-1'));
      editor = screen.getByText('Muuda seeriat 1');
      expect(editor).toBeInTheDocument();
    });
    expect(editor).toBeTruthy();
    const editorCard = editor!.closest('.inline-set-editor') as HTMLElement | null;
    expect(editorCard).toBeTruthy();
    await user.click(within(editorCard!).getByRole('button', { name: 'Ei tulnud täis' }));
    await user.clear(within(editorCard!).getByLabelText('Tegelikud kordused'));
    await user.type(within(editorCard!).getByLabelText('Tegelikud kordused'), '8');
    await user.click(within(editorCard!).getByRole('button', { name: 'Salvesta muudatus' }));

    await waitFor(() => {
      expect(screen.getByTestId('set-dot-1')).toHaveClass('set-dot-failed');
    });
    expect((await db.setResults.get(`${sessionExerciseId}-1`))?.completedReps).toBe(8);
  });

  it('allows deleting a saved set from the set dot editor', async () => {
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

    await db.setResults.add({
      id: `${sessionExerciseId}-1`,
      workoutSessionExerciseId: sessionExerciseId,
      setNumber: 1,
      status: 'failed',
      completedReps: 8,
      usedWeight: 60,
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    let editor: HTMLElement | null = null;
    await waitFor(async () => {
      fireEvent.click(await screen.findByTestId('set-dot-1'));
      editor = screen.getByText('Muuda seeriat 1');
      expect(editor).toBeInTheDocument();
    });
    expect(editor).toBeTruthy();
    const editorCard = editor!.closest('.inline-set-editor') as HTMLElement | null;
    expect(editorCard).toBeTruthy();
    await user.click(within(editorCard!).getByRole('button', { name: 'Kustuta seeria' }));

    await waitFor(async () => {
      expect(await db.setResults.get(`${sessionExerciseId}-1`)).toBeUndefined();
    });
    expect(screen.getByTestId('set-dot-1')).toHaveClass('set-dot-pending');
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

  it('allows swiping an upcoming exercise row to make it next on touch devices', async () => {
    const timestamp = nowIso();
    const dayId = createId('day');
    const sessionId = createId('session');
    const firstId = createId('session-exercise');
    const secondId = createId('session-exercise');

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
        id: firstId,
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
        id: secondId,
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

    render(<WorkoutPage />);

    expect(await screen.findByRole('heading', { name: 'Chest Press' })).toBeInTheDocument();
    const swipeRow = screen.getByTestId(`upcoming-row-${secondId}`);

    fireEvent.touchStart(swipeRow, { changedTouches: [{ clientX: 240 }] });
    fireEvent.touchEnd(swipeRow, { changedTouches: [{ clientX: 120 }] });

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
    expect(await db.exerciseEvents.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: 'automation',
          field: 'currentWeight',
          fromValue: '60 kg',
          toValue: '65 kg',
        }),
      ]),
    );

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

    await user.click(await screen.findByRole('button', { name: /^Muuda sihti$/i }));
    await user.clear(screen.getByLabelText('Raskus (kg)'));
    await user.type(screen.getByLabelText('Raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta siht' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));

    expect((await db.setResults.get(`${sessionExerciseId}-1`))?.usedWeight).toBe(45);
  });

  it('opens the target editor inside the active workout card and saves rest time for the next set', async () => {
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
      successesRequired: 1,
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
      successesRequired: 1,
      repMode: 'range',
      targetRepsMin: 10,
      targetRepsMax: 15,
      currentWeight: 50,
      weightStep: 5,
      orderIndex: 0,
    });

    render(<WorkoutPage />);
    const user = userEvent.setup();

    const workoutCard = await screen.findByTestId('active-workout-card');
    await user.click(within(workoutCard).getByRole('button', { name: /^Muuda sihti$/i }));

    expect(within(workoutCard).getByRole('heading', { name: 'Muuda sihti' })).toBeInTheDocument();
    expect(within(workoutCard).getByLabelText('Puhkeaeg seeriate vahel (sek)')).toHaveValue(90);

    await user.clear(within(workoutCard).getByLabelText('Puhkeaeg seeriate vahel (sek)'));
    await user.type(within(workoutCard).getByLabelText('Puhkeaeg seeriate vahel (sek)'), '120');
    await user.click(within(workoutCard).getByRole('button', { name: 'Salvesta siht' }));

    await waitFor(async () => {
      expect((await db.dayExercises.get(dayExerciseId))?.restSeconds).toBe(120);
    });

    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    expect(await screen.findByText('2:00')).toBeInTheDocument();
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

    await user.click(await screen.findByRole('button', { name: /^Muuda sihti$/i }));
    await user.clear(screen.getByLabelText('Raskus (kg)'));
    await user.type(screen.getByLabelText('Raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta siht' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Tehtud' }));
    await user.click(await screen.findByRole('button', { name: 'Lõpeta treening' }));

    const nextTargetHeading = await screen.findByText('Järgmine siht');
    expect(nextTargetHeading).toBeInTheDocument();
    const nextTargetPanel = nextTargetHeading.closest('.panel') as HTMLElement | null;
    expect(nextTargetPanel).toBeTruthy();
    expect(within(nextTargetPanel!).getByText('3 x 10-15 x 45 kg')).toBeInTheDocument();

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

    await user.click(await screen.findByRole('button', { name: /^Muuda sihti$/i }));
    await user.clear(screen.getByLabelText('Raskus (kg)'));
    await user.type(screen.getByLabelText('Raskus (kg)'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvesta siht' }));
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
