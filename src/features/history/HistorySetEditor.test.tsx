import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SetResultRecord, WorkoutSessionExerciseRecord } from '../../db/types';
import { HistorySetEditor } from './HistorySetEditor';

const exercise: WorkoutSessionExerciseRecord = {
  id: 'session-exercise', workoutSessionId: 'session', dayExerciseId: 'owner', exerciseId: 'chest', exerciseName: 'Chest Press', machineNumber: '12',
  targetSets: 3, successesRequired: 1, repMode: 'range', targetRepsMin: 8, targetRepsMax: 12, currentWeight: 80, weightStep: 2.5, orderIndex: 0,
};

function result(overrides: Partial<SetResultRecord> = {}): SetResultRecord {
  return { id: 'set-1', workoutSessionExerciseId: exercise.id, setNumber: 1, status: 'success', completedReps: 10, usedWeight: 80, ...overrides };
}

describe('HistorySetEditor', () => {
  afterEach(cleanup);

  it('edits repetition actuals while keeping the frozen target read-only', async () => {
    const onSave = vi.fn(async () => {});
    render(<HistorySetEditor sessionExercise={exercise} results={[result()]} onSave={onSave} onClose={vi.fn()} />);
    const user = userEvent.setup();

    expect(screen.getByText('Plaan: 8-12 x 80 kg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /1\. seeria/i }));
    await user.clear(screen.getByLabelText('Tegelikud kordused'));
    await user.type(screen.getByLabelText('Tegelikud kordused'), '11');
    await user.clear(screen.getByLabelText('Tegelik raskus (kg)'));
    await user.type(screen.getByLabelText('Tegelik raskus (kg)'), '82.5');
    await user.selectOptions(screen.getByLabelText('Tulemus'), 'failed');
    await user.click(screen.getByRole('button', { name: 'Salvesta' }));

    expect(onSave).toHaveBeenCalledWith('set-1', { status: 'failed', completedReps: 11, usedWeight: 82.5 });
  });

  it('edits duration without showing or changing load', async () => {
    const onSave = vi.fn(async () => {});
    render(<HistorySetEditor sessionExercise={{ ...exercise, repMode: 'duration-fixed', targetRepsMin: 60, targetRepsMax: 60, currentWeight: 0 }} results={[result({ completedReps: 70, usedWeight: null })]} onSave={onSave} onClose={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /1\. seeria/i }));
    expect(screen.getByLabelText('Tegelik kestus (min)')).toHaveValue(70);
    expect(screen.queryByLabelText('Tegelik raskus (kg)')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvesta' }));
    expect(onSave).toHaveBeenCalledWith('set-1', { status: 'success', completedReps: 70 });
  });

  it('rejects empty and invalid actual values without persisting', async () => {
    const onSave = vi.fn(async () => {});
    render(<HistorySetEditor sessionExercise={exercise} results={[result()]} onSave={onSave} onClose={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /1\. seeria/i }));
    await user.clear(screen.getByLabelText('Tegelikud kordused'));
    await user.click(screen.getByRole('button', { name: 'Salvesta' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Sisesta kehtiv tegelik tulemus.');
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Tegelikud kordused'), '-1');
    await user.click(screen.getByRole('button', { name: 'Salvesta' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Sisesta kehtiv tegelik tulemus.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lists recorded sets in deterministic set-number order', () => {
    render(<HistorySetEditor sessionExercise={exercise} results={[
      result({ id: 'set-2', setNumber: 2 }),
      result({ id: 'set-1', setNumber: 1 }),
    ]} onSave={vi.fn(async () => {})} onClose={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /seeria/i }).map((button) => button.textContent)).toEqual([
      expect.stringContaining('1. seeria'),
      expect.stringContaining('2. seeria'),
    ]);
  });

  it('cancels without saving and retains a save error for retry', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn(async () => { throw new Error('failed'); });
    render(<HistorySetEditor sessionExercise={exercise} results={[result()]} onSave={onSave} onClose={onClose} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /1\. seeria/i }));
    await user.click(screen.getByRole('button', { name: 'Loobu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /1\. seeria/i }));
    await user.click(screen.getByRole('button', { name: 'Salvesta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Tulemust ei saanud salvestada. Proovi uuesti.');
  });
});
