import { describe, expect, it } from 'vitest';
import {
  clampRepValue,
  getProgressionRecommendationCopy,
  getRepStepperPresentation,
  getSessionCompletionKind,
} from './workoutPresentation';

describe('clampRepValue', () => {
  it('keeps a repetition value within its permitted bounds', () => {
    expect(clampRepValue(8, 10, 15)).toBe(10);
    expect(clampRepValue(12, 10, 15)).toBe(12);
    expect(clampRepValue(20, 10, 15)).toBe(15);
  });
});

describe('getRepStepperPresentation', () => {
  it('represents a fixed target as one selectable value', () => {
    expect(getRepStepperPresentation('fixed', 10, 10)).toEqual({
      minimum: 10,
      maximum: 10,
      targetValue: 10,
      step: 1,
    });
  });

  it('represents a range target with its full selectable range and success value', () => {
    expect(getRepStepperPresentation('range', 10, 15)).toEqual({
      minimum: 10,
      maximum: 15,
      targetValue: 15,
      step: 1,
    });
  });
});

describe('getProgressionRecommendationCopy', () => {
  it('describes range progression only after consecutive full successes at the same target', () => {
    expect(
      getProgressionRecommendationCopy({
        repMode: 'range',
        successesRequired: 2,
        weightStep: 2.5,
      }),
    ).toBe(
      'Kui kõik seeriad jõuavad vahemiku ülemise piirini 2 järjestikusel sama sihiga treeningul, suureneb järgmisel sihil raskus 2,5 kg võrra.',
    );
  });

  it('describes duration progression as a longer duration rather than a weight increase', () => {
    expect(
      getProgressionRecommendationCopy({
        repMode: 'duration-fixed',
        successesRequired: 1,
        weightStep: 5,
      }),
    ).toBe(
      'Kui kõik seeriad jõuavad sihini 1 järjestikusel sama sihiga treeningul, pikeneb järgmine kestussiht 5 min võrra.',
    );
  });
});

describe('getSessionCompletionKind', () => {
  it('reports a completed session when every planned set has a result', () => {
    expect(
      getSessionCompletionKind(3, [
        { setNumber: 1 },
        { setNumber: 2 },
        { setNumber: 3 },
      ]),
    ).toBe('completed');
  });

  it('reports a partial session when planned sets are still missing', () => {
    expect(getSessionCompletionKind(3, [{ setNumber: 1 }, { setNumber: 2 }])).toBe('partial');
  });

  it('reports a partial session when duplicate results leave a planned set missing', () => {
    expect(
      getSessionCompletionKind(3, [
        { setNumber: 1 },
        { setNumber: 1 },
        { setNumber: 2 },
      ]),
    ).toBe('partial');
  });

  it('reports a partial session when an out-of-range result replaces a planned set', () => {
    expect(
      getSessionCompletionKind(3, [
        { setNumber: 1 },
        { setNumber: 2 },
        { setNumber: 4 },
      ]),
    ).toBe('partial');
  });
});
