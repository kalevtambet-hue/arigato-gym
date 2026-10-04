import { describe, expect, it } from 'vitest';
import { computeNextTarget, decideProgression, qualifyingSetEvidence, recomputeProgressionFromHistory } from './progression';

describe('computeNextTarget', () => {
  it('raises weight for range mode when every set reaches the max reps', () => {
    const result = computeNextTarget(
      {
        repMode: 'range',
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 50,
        weightStep: 5,
      },
      [15, 15, 15],
    );

    expect(result.currentWeight).toBe(55);
  });

  it('keeps the same target when one range set misses the max', () => {
    const result = computeNextTarget(
      {
        repMode: 'range',
        targetSets: 3,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 50,
        weightStep: 5,
      },
      [15, 15, 12],
    );

    expect(result.currentWeight).toBe(50);
  });

  it('raises duration range target when every set reaches the max minutes', () => {
    const result = computeNextTarget(
      {
        repMode: 'duration-range',
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight: 0,
        weightStep: 5,
      },
      [15, 15],
    );

    expect(result.targetRepsMin).toBe(15);
    expect(result.targetRepsMax).toBe(20);
    expect(result.currentWeight).toBe(0);
  });

  it('keeps the same duration target when one set misses the target minutes', () => {
    const result = computeNextTarget(
      {
        repMode: 'duration-fixed',
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 10,
        currentWeight: 0,
        weightStep: 2,
      },
      [10, 8],
    );

    expect(result.targetRepsMin).toBe(10);
    expect(result.targetRepsMax).toBe(10);
    expect(result.currentWeight).toBe(0);
  });
});

describe('decideProgression', () => {
  const target = {
    repMode: 'range' as const,
    targetSets: 3,
    successesRequired: 2,
    targetRepsMin: 10,
    targetRepsMax: 15,
    currentWeight: 50,
    weightStep: 5,
  };

  function successfulSets(usedWeight: number | null = 50) {
    return [1, 2, 3].map((setNumber) => ({
      setNumber,
      status: 'success' as const,
      completedReps: 15,
      usedWeight,
    }));
  }

  it('advances a successful target after the required consecutive successes', () => {
    const decision = decideProgression({
      target,
      results: successfulSets(),
      previousConsecutiveSuccesses: 1,
    });

    expect(decision).toMatchObject({
      reason: 'advanced',
      progressed: true,
      nextTarget: { currentWeight: 55 },
      actual: { load: { value: 50, source: 'recorded', differsFromTarget: false } },
    });
  });

  it('keeps a successful target until the consecutive-success requirement is met', () => {
    const decision = decideProgression({
      target,
      results: successfulSets(),
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({
      reason: 'success',
      progressed: false,
      consecutiveSuccesses: 1,
      nextTarget: { currentWeight: 50 },
    });
  });

  it('advances a fixed repetition target when every planned set reaches its fixed value', () => {
    const decision = decideProgression({
      target: { ...target, repMode: 'fixed', targetRepsMin: 10, targetRepsMax: 10, successesRequired: 1 },
      results: [1, 2, 3].map((setNumber) => ({
        setNumber,
        status: 'success' as const,
        completedReps: 10,
        usedWeight: 50,
      })),
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({ reason: 'advanced', nextTarget: { currentWeight: 55 } });
  });

  it('does not progress a failed or incomplete session', () => {
    const failed = decideProgression({
      target,
      results: [
        ...successfulSets().slice(0, 2),
        { setNumber: 3, status: 'failed' as const, completedReps: 15, usedWeight: 50 },
      ],
      previousConsecutiveSuccesses: 1,
    });
    const incomplete = decideProgression({
      target,
      results: successfulSets().slice(0, 2),
      previousConsecutiveSuccesses: 1,
    });

    expect(failed).toMatchObject({ reason: 'failed', progressed: false, nextTarget: { currentWeight: 50 } });
    expect(incomplete).toMatchObject({ reason: 'incomplete', progressed: false, nextTarget: { currentWeight: 50 } });
  });

  it('uses a recorded actual load as the base for the next target and exposes a mismatch', () => {
    const decision = decideProgression({
      target,
      results: successfulSets(45),
      previousConsecutiveSuccesses: 1,
    });

    expect(decision).toMatchObject({
      progressed: true,
      nextTarget: { currentWeight: 50 },
      actual: { load: { value: 45, source: 'recorded', differsFromTarget: true } },
    });
    expect(decision.explanation).toContain('45 kg');
  });

  it('uses the session target as an explicit legacy fallback when actual load is missing', () => {
    const decision = decideProgression({
      target,
      results: successfulSets(null),
      previousConsecutiveSuccesses: 1,
    });

    expect(decision).toMatchObject({
      progressed: true,
      nextTarget: { currentWeight: 55 },
      actual: { load: { value: 50, source: 'target-fallback', differsFromTarget: false } },
    });
    expect(decision.explanation).toContain('siht-raskust');
  });

  it('keeps duration progression load-independent', () => {
    const decision = decideProgression({
      target: { ...target, repMode: 'duration-range', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15, currentWeight: 0, weightStep: 5, successesRequired: 1 },
      results: [
        { setNumber: 1, status: 'success' as const, completedReps: 15, usedWeight: null },
        { setNumber: 2, status: 'success' as const, completedReps: 15, usedWeight: null },
      ],
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({
      reason: 'advanced',
      nextTarget: { targetRepsMin: 15, targetRepsMax: 20, currentWeight: 0 },
      actual: { load: { value: null, source: 'not-applicable' } },
    });
  });

  it('does not progress beyond a configured weight cap', () => {
    const decision = decideProgression({
      target,
      results: successfulSets(),
      previousConsecutiveSuccesses: 1,
      maxWeight: 50,
    });

    expect(decision).toMatchObject({ reason: 'ceiling', progressed: false, nextTarget: { currentWeight: 50 } });
  });

  it('does not mutate the target or result history', () => {
    const inputTarget = { ...target };
    const results = successfulSets(45);
    const beforeTarget = structuredClone(inputTarget);
    const beforeResults = structuredClone(results);

    decideProgression({ target: inputTarget, results, previousConsecutiveSuccesses: 1 });

    expect(inputTarget).toEqual(beforeTarget);
    expect(results).toEqual(beforeResults);
  });
});

describe('qualifyingSetEvidence', () => {
  const target = {
    repMode: 'range' as const,
    targetSets: 3,
    successesRequired: 1,
    targetRepsMin: 10,
    targetRepsMax: 15,
    currentWeight: 80,
    weightStep: 2.5,
  };

  function successfulSets(loads: Array<number | null>) {
    return loads.map((usedWeight, index) => ({
      setNumber: index + 1,
      status: 'success' as const,
      completedReps: 15,
      usedWeight,
    }));
  }

  it('uses one consistent actual load from all planned successful work sets', () => {
    const evidence = qualifyingSetEvidence(target, successfulSets([82.5, 82.5, 82.5]));

    expect(evidence).toMatchObject({
      complete: true,
      successful: true,
      load: { source: 'recorded', value: 82.5, distinctValues: [82.5], differsFromTarget: true },
    });
  });

  it('does not treat out-of-range or non-work rows as qualifying mixed-load evidence', () => {
    const evidence = qualifyingSetEvidence(target, [
      ...successfulSets([80, 80, 80]),
      { setNumber: 4, status: 'success' as const, completedReps: 15, usedWeight: 75 },
      { setNumber: 1, status: 'success' as const, completedReps: 15, usedWeight: 70, setKind: 'warmup' as const },
    ]);

    expect(evidence).toMatchObject({
      complete: true,
      successful: true,
      load: { source: 'recorded', value: 80, distinctValues: [80] },
    });
  });

  it('classifies inconsistent qualifying actual loads as mixed regardless of set order', () => {
    const firstOrder = qualifyingSetEvidence(target, successfulSets([80, 80, 75]));
    const secondOrder = qualifyingSetEvidence(target, successfulSets([75, 80, 80]));

    expect(firstOrder.load).toMatchObject({ source: 'mixed-actual-loads', value: null, distinctValues: [75, 80] });
    expect(secondOrder.load).toMatchObject({ source: 'mixed-actual-loads', value: null, distinctValues: [75, 80] });
  });

  it('keeps one consistent observed load as partial evidence when some planned set loads are missing', () => {
    const evidence = qualifyingSetEvidence(target, successfulSets([82.5, null, 82.5]));

    expect(evidence.load).toMatchObject({
      source: 'partial-actual',
      value: 82.5,
      distinctValues: [82.5],
      differsFromTarget: true,
    });
  });

  it('uses target fallback only when every qualifying work-set load is missing', () => {
    const evidence = qualifyingSetEvidence(target, successfulSets([null, null, null]));

    expect(evidence.load).toMatchObject({ source: 'target-fallback', value: 80, distinctValues: [] });
  });

  it('keeps duration evidence load-independent', () => {
    const evidence = qualifyingSetEvidence(
      { ...target, repMode: 'duration-range', targetSets: 2, currentWeight: 0 },
      successfulSets([80, 75]).slice(0, 2),
    );

    expect(evidence).toMatchObject({ complete: true, successful: true, load: { source: 'not-applicable', value: null } });
  });

  it('does not mutate source results or the target', () => {
    const inputTarget = { ...target };
    const results = successfulSets([80, null, 80]);
    const beforeTarget = structuredClone(inputTarget);
    const beforeResults = structuredClone(results);

    qualifyingSetEvidence(inputTarget, results);

    expect(inputTarget).toEqual(beforeTarget);
    expect(results).toEqual(beforeResults);
  });
});

describe('decideProgression qualifying-load behavior', () => {
  const target = {
    repMode: 'range' as const,
    targetSets: 3,
    successesRequired: 1,
    targetRepsMin: 10,
    targetRepsMax: 15,
    currentWeight: 80,
    weightStep: 2.5,
  };

  function successfulSets(loads: Array<number | null>) {
    return loads.map((usedWeight, index) => ({
      setNumber: index + 1,
      status: 'success' as const,
      completedReps: 15,
      usedWeight,
    }));
  }

  it('does not advance or retain a streak for mixed actual working loads', () => {
    const decision = decideProgression({
      target,
      results: successfulSets([80, 80, 75]),
      previousConsecutiveSuccesses: 1,
    });

    expect(decision).toMatchObject({
      reason: 'mixed-actual-loads',
      progressed: false,
      consecutiveSuccesses: 0,
      nextTarget: { currentWeight: 80 },
      actual: { load: { source: 'mixed-actual-loads', distinctValues: [75, 80] } },
    });
    expect(decision.explanation).toContain('mitut');
  });

  it('can advance from one consistent partial actual load and respects its cap', () => {
    const decision = decideProgression({
      target,
      results: successfulSets([82.5, null, 82.5]),
      previousConsecutiveSuccesses: 0,
      maxWeight: 82.5,
    });

    expect(decision).toMatchObject({
      reason: 'ceiling',
      progressed: false,
      nextTarget: { currentWeight: 82.5 },
      actual: { load: { source: 'partial-actual', value: 82.5 } },
    });
  });

  it('advances from one consistent partial actual load using that load as its base', () => {
    const decision = decideProgression({
      target,
      results: successfulSets([82.5, null, 82.5]),
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({
      reason: 'advanced',
      progressed: true,
      nextTarget: { currentWeight: 85 },
      actual: { load: { source: 'partial-actual', value: 82.5 } },
    });
  });

  it('keeps duration decisions independent of mixed load observations', () => {
    const decision = decideProgression({
      target: { ...target, repMode: 'duration-range', targetSets: 2, currentWeight: 0, weightStep: 5 },
      results: successfulSets([80, 75]).slice(0, 2),
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({
      reason: 'advanced',
      nextTarget: { targetRepsMin: 15, targetRepsMax: 20, currentWeight: 0 },
      actual: { load: { source: 'not-applicable', value: null } },
    });
  });

  it('treats a missing planned work set as incomplete even when extra rows exist', () => {
    const decision = decideProgression({
      target,
      results: [
        ...successfulSets([80, 80]).slice(0, 2),
        { setNumber: 4, status: 'success' as const, completedReps: 15, usedWeight: 80 },
      ],
      previousConsecutiveSuccesses: 0,
    });

    expect(decision).toMatchObject({ reason: 'incomplete', progressed: false });
  });
});

describe('recomputeProgressionFromHistory', () => {
  const ownerDayExerciseId = 'day-exercise-a';

  function historyEntry(params: {
    sessionId: string;
    performedAt: string;
    status?: 'completed' | 'partial';
    currentWeight?: number;
    results?: Array<{ status?: 'success' | 'failed'; completedReps?: number; usedWeight?: number | null }>;
  }) {
    const {
      sessionId,
      performedAt,
      status = 'completed',
      currentWeight = 80,
      results = [{}, {}, {}],
    } = params;
    const sessionExerciseId = `exercise-${sessionId}`;

    return {
      session: {
        id: sessionId,
        workoutDayId: 'day-a',
        performedAt,
        status,
        createdAt: performedAt,
        updatedAt: performedAt,
      },
      sessionExercise: {
        id: sessionExerciseId,
        workoutSessionId: sessionId,
        dayExerciseId: ownerDayExerciseId,
        exerciseName: 'Chest Press',
        machineNumber: '12',
        targetSets: 3,
        successesRequired: 2,
        repMode: 'range' as const,
        targetRepsMin: 10,
        targetRepsMax: 15,
        currentWeight,
        weightStep: 2.5,
        orderIndex: 0,
      },
      results: results.map((result, index) => ({
        id: `${sessionExerciseId}-${index + 1}`,
        workoutSessionExerciseId: sessionExerciseId,
        setNumber: index + 1,
        status: result.status ?? 'success' as const,
        completedReps: result.completedReps ?? 15,
        usedWeight: result.usedWeight === undefined ? currentWeight : result.usedWeight,
      })),
    };
  }

  it('recomputes the latest target from chronological completed history with an id tiebreaker', () => {
    const result = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'b', performedAt: '2026-01-02T10:00:00.000Z' }),
        historyEntry({ sessionId: 'a', performedAt: '2026-01-02T10:00:00.000Z', results: [{ status: 'failed', completedReps: 12 }, {}, {}] }),
      ],
    });

    expect(result?.decision).toMatchObject({
      reason: 'success',
      nextTarget: { currentWeight: 80 },
    });
  });

  it('removes a later advance when an earlier success is corrected to failure', () => {
    const result = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z', results: [{ status: 'failed', completedReps: 12 }, {}, {}] }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
      ],
    });

    expect(result?.decision).toMatchObject({ reason: 'success', nextTarget: { currentWeight: 80 } });
  });

  it('adds a later advance when an earlier failure is corrected to success', () => {
    const result = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z' }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
      ],
    });

    expect(result?.decision).toMatchObject({ reason: 'advanced', nextTarget: { currentWeight: 82.5 } });
  });

  it('uses a corrected latest actual load instead of a stale target fallback', () => {
    const legacy = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z' }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z', results: [{ usedWeight: null }, { usedWeight: null }, { usedWeight: null }] }),
      ],
    });
    const corrected = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z' }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z', results: [{ usedWeight: 75 }, { usedWeight: 75 }, { usedWeight: 75 }] }),
      ],
    });

    expect(legacy?.decision).toMatchObject({
      nextTarget: { currentWeight: 82.5 },
      actual: { load: { source: 'target-fallback', value: 80 } },
    });
    expect(corrected?.decision).toMatchObject({
      reason: 'advanced',
      nextTarget: { currentWeight: 77.5 },
      actual: { load: { source: 'recorded', value: 75 } },
    });
  });

  it('makes a corrected mixed historical session eligible once its loads become consistent', () => {
    const mixed = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z', results: [{ usedWeight: 80 }, { usedWeight: 75 }, { usedWeight: 80 }] }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
      ],
    });
    const corrected = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z', results: [{ usedWeight: 80 }, { usedWeight: 80 }, { usedWeight: 80 }] }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
      ],
    });

    expect(mixed?.decision).toMatchObject({ reason: 'success', nextTarget: { currentWeight: 80 } });
    expect(corrected?.decision).toMatchObject({ reason: 'advanced', nextTarget: { currentWeight: 82.5 } });
  });

  it('removes a later advance when a previously consistent session is corrected to mixed loads', () => {
    const result = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [
        historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z', results: [{ usedWeight: 80 }, { usedWeight: 75 }, { usedWeight: 80 }] }),
        historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
      ],
    });

    expect(result?.decision).toMatchObject({ reason: 'success', nextTarget: { currentWeight: 80 } });
  });

  it('keeps duration history load-independent while recalculating corrected success evidence', () => {
    const durationEntry = (sessionId: string, performedAt: string, status: 'success' | 'failed') => {
      const entry = historyEntry({ sessionId, performedAt, results: [{ status }, { status }, { status }] });
      return {
        ...entry,
        sessionExercise: {
          ...entry.sessionExercise,
          repMode: 'duration-range' as const,
          currentWeight: 0,
          weightStep: 5,
        },
      };
    };
    const failed = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [durationEntry('first', '2026-01-01T10:00:00.000Z', 'failed'), durationEntry('second', '2026-01-02T10:00:00.000Z', 'success')],
    });
    const corrected = recomputeProgressionFromHistory({
      dayExerciseId: ownerDayExerciseId,
      entries: [durationEntry('first', '2026-01-01T10:00:00.000Z', 'success'), durationEntry('second', '2026-01-02T10:00:00.000Z', 'success')],
    });

    expect(failed?.decision).toMatchObject({ reason: 'success', nextTarget: { targetRepsMin: 10, targetRepsMax: 15, currentWeight: 0 } });
    expect(corrected?.decision).toMatchObject({
      reason: 'advanced',
      nextTarget: { targetRepsMin: 15, targetRepsMax: 20, currentWeight: 0 },
      actual: { load: { source: 'not-applicable' } },
    });
  });

  it('is deterministic, applies caps, and does not mutate historical evidence', () => {
    const entries = [
      historyEntry({ sessionId: 'first', performedAt: '2026-01-01T10:00:00.000Z' }),
      historyEntry({ sessionId: 'second', performedAt: '2026-01-02T10:00:00.000Z' }),
    ];
    const before = structuredClone(entries);
    const first = recomputeProgressionFromHistory({ dayExerciseId: ownerDayExerciseId, entries, maxWeight: 80 });
    const second = recomputeProgressionFromHistory({ dayExerciseId: ownerDayExerciseId, entries, maxWeight: 80 });

    expect(first).toEqual(second);
    expect(first?.decision).toMatchObject({ reason: 'ceiling', nextTarget: { currentWeight: 80 } });
    expect(entries).toEqual(before);
  });
});
