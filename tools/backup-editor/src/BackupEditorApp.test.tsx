import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { BackupEditorApp } from './BackupEditorApp';

const backup = {
  exercises: [
    {
      id: 'exercise-1',
      name: 'Kükk',
      machineNumber: '',
      notes: '',
      createdAt: '2026-08-06T10:00:00.000Z',
      updatedAt: '2026-08-06T10:00:00.000Z',
    },
  ],
  workoutDays: [],
  dayExercises: [],
  sessions: [],
  sessionExercises: [],
  setResults: [],
  exerciseEvents: [],
};

describe('BackupEditorApp', () => {
  afterEach(cleanup);

  it('shows an exercise created without a workout-day assignment', async () => {
    const user = userEvent.setup();

    render(<BackupEditorApp initialBackup={backup} />);

    await user.click(screen.getByRole('button', { name: 'Lisa harjutus' }));
    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Pec deck');
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(screen.getByText('Pec deck')).toBeInTheDocument();
    expect(screen.getAllByText('Pole treeningpäeval')).toHaveLength(2);
  });

  it('adds an exercise from the catalogue to a training day', async () => {
    const user = userEvent.setup();

    render(<BackupEditorApp initialBackup={backup} />);

    await user.click(screen.getByRole('button', { name: 'Treeningpäevad' }));
    await user.click(screen.getByRole('button', { name: 'Lisa treeningpäev' }));
    await user.type(screen.getByLabelText('Treeningpäeva nimi'), 'Päev A');
    await user.click(screen.getByRole('button', { name: 'Salvesta treeningpäev' }));

    expect(screen.getByText('Treeningpäev lisati varundusse. Faili kirjutamiseks vajuta ülal „Salvesta faili”.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Lisa kataloogist'), 'exercise-1');
    await user.click(screen.getByRole('button', { name: 'Lisa päevale' }));

    expect(screen.getByText('Kükk')).toBeInTheDocument();
    expect(screen.getByLabelText('Seeriate arv')).toHaveValue(3);
  });

  it('allows changing a day exercise repetition mode', async () => {
    const user = userEvent.setup();
    const withDay = {
      ...backup,
      workoutDays: [{ id: 'day-1', name: 'Päev A', notes: '', sortOrder: 0, isArchived: false, createdAt: '', updatedAt: '' }],
      dayExercises: [{ id: 'assignment-1', workoutDayId: 'day-1', exerciseId: 'exercise-1', sortOrder: 0, targetSets: 3, successesRequired: 2, repMode: 'range' as const, targetRepsMin: 8, targetRepsMax: 10, currentWeight: 0, weightStep: 2.5, restSeconds: 90, createdAt: '', updatedAt: '' }],
    };

    render(<BackupEditorApp initialBackup={withDay} />);
    await user.click(screen.getByRole('button', { name: 'Treeningpäevad' }));
    await user.click(screen.getByRole('button', { name: /Päev A/ }));
    await user.selectOptions(screen.getByLabelText('Kordusrežiim'), 'duration-range');

    expect(screen.getByLabelText('Kordusrežiim')).toHaveValue('duration-range');
    expect(screen.getByLabelText('Min kestus (min)')).toBeInTheDocument();
    expect(screen.getByLabelText('Kestuse samm (min)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Praegune raskus')).not.toBeInTheDocument();
  });

  it('does not carry an unsaved exercise draft to another selected exercise', async () => {
    const user = userEvent.setup();
    const twoExercises = { ...backup, exercises: [...backup.exercises, { ...backup.exercises[0], id: 'exercise-2', name: 'Surumine' }] };

    render(<BackupEditorApp initialBackup={twoExercises} />);
    await user.click(screen.getByRole('button', { name: /Kükk/ }));
    await user.clear(screen.getByLabelText('Harjutuse nimi'));
    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Muudetud kükk');
    await user.click(screen.getByRole('button', { name: /Surumine/ }));
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(screen.getByRole('button', { name: /Surumine/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Muudetud kükk/ })).not.toBeInTheDocument();
  });
});
