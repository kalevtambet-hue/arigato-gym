import { describe, expect, it } from 'vitest';
import { createInMemorySeed } from './repositories';

describe('createInMemorySeed', () => {
  it('creates starter workout days for a new user', () => {
    const seed = createInMemorySeed();
    expect(seed.workoutDays.map((day) => day.name)).toEqual(['Päev 1', 'Päev 2']);
  });
});
