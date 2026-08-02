import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SetActionBar } from './SetActionBar';

describe('SetActionBar', () => {
  afterEach(cleanup);

  it('renders exactly two equal-grid primary set actions with failure first', async () => {
    const user = userEvent.setup();
    const onFailed = vi.fn();
    const onSuccess = vi.fn();
    render(<SetActionBar onFailed={onFailed} onSuccess={onSuccess} />);

    const bar = screen.getByTestId('sticky-action-bar');
    const actions = within(bar).getAllByRole('button');
    expect(actions).toHaveLength(2);
    expect(actions.map((action) => action.textContent)).toEqual(['Ei tulnud täis', 'Tehtud']);
    expect(actions[0]).toHaveClass('warning-button');
    expect(actions[1]).toHaveClass('success-button');

    await user.click(actions[0]);
    await user.click(actions[1]);
    expect(onFailed).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
