import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/appDb';
import { SettingsPage } from './SettingsPage';

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
  });
});
