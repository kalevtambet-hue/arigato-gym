import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { SettingsPage } from './SettingsPage';
import { getDefaultRestSeconds } from './restDuration';

async function clearDatabase() {
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
}

beforeEach(clearDatabase);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

afterEach(clearDatabase);

describe('SettingsPage', () => {
  it('shows app version and build information', () => {
    render(<SettingsPage />);

    expect(screen.getByText(`Versioon ${__APP_VERSION__} (${__APP_BUILD__})`)).toBeInTheDocument();
  });

  it('shows collapsible help sections', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Privaatsus')).toBeInTheDocument();
    expect(screen.getByText('Paigaldamine')).toBeInTheDocument();
    expect(screen.getByText('Kasutamine')).toBeInTheDocument();
    expect(screen.getByText('Varundus')).toBeInTheDocument();
    expect(screen.getByText('Tõrkeotsing')).toBeInTheDocument();
  });

  it('lets the user save a dark theme preference', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.selectOptions(screen.getByLabelText('Välimus'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('treeninguabiline-theme')).toBe('dark');
  });

  it('saves a valid default rest duration after the user clears and types a new value', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const restDuration = screen.getByLabelText('Vaikimisi puhkeaeg (sek)');
    expect(restDuration).toHaveValue(60);

    await user.clear(restDuration);
    expect(restDuration).toHaveValue(null);
    expect(getDefaultRestSeconds()).toBe(60);
    await user.type(restDuration, '90');
    expect(restDuration).toHaveValue(90);
    expect(getDefaultRestSeconds()).toBe(90);
  });

  it('keeps the latest valid rest duration when the same edit becomes fractional', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const restDuration = screen.getByLabelText('Vaikimisi puhkeaeg (sek)');
    await user.clear(restDuration);
    await user.type(restDuration, '90');
    expect(getDefaultRestSeconds()).toBe(90);

    await user.type(restDuration, '.5');
    expect(restDuration).toHaveValue(90.5);
    expect(getDefaultRestSeconds()).toBe(90);
    await user.tab();
    expect(restDuration).toHaveValue(90);
  });

  it('keeps invalid rest-duration drafts out of storage and resets them on blur', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const restDuration = screen.getByLabelText('Vaikimisi puhkeaeg (sek)');
    await user.clear(restDuration);
    await user.type(restDuration, '90');
    expect(getDefaultRestSeconds()).toBe(90);

    await user.clear(restDuration);
    expect(restDuration).toHaveValue(null);
    expect(getDefaultRestSeconds()).toBe(90);
    await user.tab();
    expect(restDuration).toHaveValue(90);

    await user.clear(restDuration);
    await user.type(restDuration, '-1');
    expect(restDuration).toHaveValue(-1);
    expect(getDefaultRestSeconds()).toBe(90);
    await user.tab();
    expect(restDuration).toHaveValue(90);

  });

  it('retains partial session status when importing sessions CSV', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const csv = [
      'id,workoutDayId,performedAt,status,createdAt,updatedAt',
      'session-1,day-1,2026-08-02T10:00:00.000Z,partial,2026-08-02T10:00:00.000Z,2026-08-02T10:00:00.000Z',
    ].join('\n');
    const file = new File([csv], 'sessioonid.csv', { type: 'text/csv' });

    await user.upload(screen.getByLabelText('Impordi CSV'), file);

    await waitFor(async () => {
      expect((await db.sessions.get('session-1'))?.status).toBe('partial');
    });
    expect(screen.getByRole('status')).toHaveTextContent('CSV import õnnestus');
  });

  it('confirms a successful JSON backup import', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const backup = JSON.stringify({
      exercises: [], workoutDays: [], dayExercises: [], sessions: [], sessionExercises: [], setResults: [], exerciseEvents: [],
    });

    await user.upload(
      screen.getByLabelText('Impordi varundus'),
      new File([backup], 'treeninguabiline-varundus.json', { type: 'application/json' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Varunduse import õnnestus');
  });

  it('confirms a successful backup export', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: 'Ekspordi varundus' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Varunduse eksport õnnestus');
  });
});
