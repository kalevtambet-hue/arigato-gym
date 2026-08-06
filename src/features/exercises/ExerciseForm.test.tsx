import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseForm } from './ExerciseForm';

describe('ExerciseForm', () => {
  afterEach(cleanup);

  it('shows an inline error and focuses the required name after an invalid save', async () => {
    const user = userEvent.setup();
    render(<ExerciseForm initialExercise={null} onClose={vi.fn()} onSave={vi.fn(async () => {})} />);

    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    const name = screen.getByLabelText('Harjutuse nimi');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(screen.getByText('Sisesta harjutuse nimi.')).toBeInTheDocument();
  });

  it('prevents a second save while the first save is pending', async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
    render(<ExerciseForm initialExercise={null} onClose={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Rinnalt surumine');
    const save = screen.getByRole('button', { name: 'Salvesta harjutus' });
    await user.click(save);
    await user.click(save);

    expect(onSave).toHaveBeenCalledTimes(1);
    resolveSave?.();
  });

  it('explains when saving the exercise fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => { throw new Error('write failed'); });
    render(<ExerciseForm initialExercise={null} onClose={vi.fn()} onSave={onSave} />);

    await user.type(screen.getByLabelText('Harjutuse nimi'), 'Rinnalt surumine');
    await user.click(screen.getByRole('button', { name: 'Salvesta harjutus' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Harjutust ei saanud salvestada. Proovi uuesti.');
    expect(screen.getByRole('button', { name: 'Salvesta harjutus' })).toBeEnabled();
  });
});
