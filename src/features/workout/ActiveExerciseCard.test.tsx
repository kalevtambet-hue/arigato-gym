import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkoutSessionExerciseRecord } from '../../db/types';
import { ActiveExerciseCard } from './ActiveExerciseCard';

const rangeExercise: WorkoutSessionExerciseRecord = {
  id: 'session-exercise-1',
  workoutSessionId: 'session-1',
  dayExerciseId: 'day-exercise-1',
  exerciseName: 'Leg Press',
  machineNumber: '7',
  targetSets: 3,
  successesRequired: 2,
  repMode: 'range',
  targetRepsMin: 8,
  targetRepsMax: 12,
  currentWeight: 50,
  weightStep: 5,
  orderIndex: 0,
};

describe('ActiveExerciseCard', () => {
  afterEach(cleanup);

  it('steps weight and range repetitions within their boundaries', async () => {
    const user = userEvent.setup();
    const onWeightChange = vi.fn();
    const onRepsChange = vi.fn();

    render(
      <ActiveExerciseCard
        exercise={rangeExercise}
        setNumber={2}
        setStates={['success', 'pending', 'pending']}
        selectedReps={8}
        onWeightChange={onWeightChange}
        onRepsChange={onRepsChange}
      />,
    );

    expect(screen.getByText('Leg Press')).toBeInTheDocument();
    expect(screen.getByText('Masin #7')).toBeInTheDocument();
    expect(screen.getByText('Seeria 2 / 3')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Kui kõik seeriad jõuavad vahemiku ülemise piirini 2 järjestikusel sama sihiga treeningul, suureneb järgmisel sihil raskus 5 kg võrra.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Suurenda raskust' }));
    await user.click(screen.getByRole('button', { name: 'Vähenda kordusi' }));
    await user.click(screen.getByRole('button', { name: 'Suurenda kordusi' }));

    expect(onWeightChange).toHaveBeenCalledWith(55);
    expect(onRepsChange).toHaveBeenNthCalledWith(1, 8);
    expect(onRepsChange).toHaveBeenNthCalledWith(2, 9);
  });

  it('keeps fixed repetition targets fixed and never proposes negative weight', async () => {
    const user = userEvent.setup();
    const onWeightChange = vi.fn();
    const onRepsChange = vi.fn();

    render(
      <ActiveExerciseCard
        exercise={{ ...rangeExercise, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, currentWeight: 0 }}
        setNumber={1}
        setStates={['pending', 'pending', 'pending']}
        selectedReps={10}
        onWeightChange={onWeightChange}
        onRepsChange={onRepsChange}
      />,
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByLabelText('Korduste valik')).toHaveClass('stepper-control-fixed');
    expect(screen.queryByRole('button', { name: 'Vähenda kordusi' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vähenda raskust' }));

    expect(onWeightChange).toHaveBeenCalledWith(0);
    expect(onRepsChange).not.toHaveBeenCalled();
  });
});
