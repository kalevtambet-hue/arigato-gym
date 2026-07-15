import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsPage } from './SettingsPage';

afterEach(() => {
  cleanup();
});

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
});
