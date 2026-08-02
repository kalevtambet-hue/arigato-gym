import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../db/appDb';
import {
  addExerciseChangeEvent,
  addExerciseNote,
  completeSessionPartially,
  ensureSeedData,
} from '../../db/repositories';
import type {
  DayExerciseRecord,
  ExerciseEventRecord,
  ExerciseRecord,
  RepMode,
  SetResultRecord,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
  WorkoutDayRecord,
} from '../../db/types';
import { computeNextTarget } from '../../domain/progression';
import { countConsecutiveSuccesses } from '../../domain/consecutiveProgression';
import { buildSessionExercises } from '../../domain/session';
import { formatTarget, getSuccessValue, isDurationMode } from '../../domain/targetMode';
import { createId } from '../../lib/id';
import { getSessionCompletionKind } from './workoutPresentation';
import { ActiveExerciseCard } from './ActiveExerciseCard';
import { SetActionBar } from './SetActionBar';
import { useWakeLock } from './useWakeLock';

type DayExerciseView = DayExerciseRecord & {
  exercise?: ExerciseRecord;
};

const REST_TIMER_STORAGE_KEY = 'treeninguabiline-rest-timer';

type PersistedRestTimer = {
  workoutSessionId: string;
  sessionExerciseId: string;
  endsAt: number;
};

function nowIso() {
  return new Date().toISOString();
}

function readPersistedRestTimer() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(REST_TIMER_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedRestTimer>;
    if (
      typeof parsed.workoutSessionId !== 'string' ||
      typeof parsed.sessionExerciseId !== 'string' ||
      typeof parsed.endsAt !== 'number'
    ) {
      return null;
    }

    return parsed as PersistedRestTimer;
  } catch {
    return null;
  }
}

function writePersistedRestTimer(timer: PersistedRestTimer | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!timer) {
    window.localStorage.removeItem(REST_TIMER_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(timer));
}

function isSuccessfulAttempt(
  item: Pick<
    WorkoutSessionExerciseRecord,
    'repMode' | 'targetSets' | 'targetRepsMin' | 'targetRepsMax'
  >,
  reps: number[],
) {
  const fullCount = reps.length === item.targetSets;
  if (!fullCount) {
    return false;
  }

  if (item.repMode === 'range' || item.repMode === 'duration-range') {
    return reps.every((value) => value >= item.targetRepsMax);
  }

  return reps.every((value) => value >= item.targetRepsMin);
}

function getSortedReps(results: SetResultRecord[]) {
  return results.sort((left, right) => left.setNumber - right.setNumber).map((entry) => entry.completedReps);
}

function formatRepsValue(repMode: RepMode, min: number, max: number) {
  if (repMode === 'fixed' || repMode === 'duration-fixed') {
    return String(min);
  }

  return `${min}-${max}`;
}

function formatWeightValue(weight: number) {
  return `${weight} kg`;
}

function formatRestTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatExerciseEventDescription(event: ExerciseEventRecord) {
  if (event.type === 'note') {
    return `Märkus: ${event.noteText ?? ''}`;
  }

  const label =
    event.field === 'targetSets'
      ? 'Seeriad'
      : event.field === 'targetReps'
        ? 'Kordused'
        : 'Raskus';

  return `${label} ${event.fromValue ?? ''} -> ${event.toValue ?? ''}`;
}

function getSetStates(
  targetSets: number,
  results: SetResultRecord[],
): Array<'pending' | 'success' | 'failed'> {
  const bySetNumber = new Map(results.map((item) => [item.setNumber, item.status]));

  return Array.from({ length: targetSets }, (_, index) => {
    const status = bySetNumber.get(index + 1);
    if (status === 'success') {
      return 'success';
    }
    if (status === 'failed') {
      return 'failed';
    }
    return 'pending';
  });
}

function buildHistoricalAttempts(
  item: WorkoutSessionExerciseRecord,
  completedSessions: WorkoutSessionRecord[],
  historicalSessionExercises: WorkoutSessionExerciseRecord[],
  historicalResultsByExercise: Map<string, SetResultRecord[]>,
) {
  const completedSessionsById = new Map(completedSessions.map((entry) => [entry.id, entry]));

  return historicalSessionExercises
    .filter(
      (entry) =>
        entry.dayExerciseId === item.dayExerciseId && completedSessionsById.has(entry.workoutSessionId),
    )
    .sort((left, right) => {
      const leftSession = completedSessionsById.get(left.workoutSessionId);
      const rightSession = completedSessionsById.get(right.workoutSessionId);
      return (leftSession?.performedAt ?? '').localeCompare(rightSession?.performedAt ?? '');
    })
    .map((entry) => ({
      matchedTarget:
        entry.repMode === item.repMode &&
        entry.targetRepsMin === item.targetRepsMin &&
        entry.targetRepsMax === item.targetRepsMax &&
        entry.currentWeight === item.currentWeight,
      success: isSuccessfulAttempt(entry, getSortedReps(historicalResultsByExercise.get(entry.id) ?? [])),
    }));
}

function shouldAdvanceTarget(
  item: WorkoutSessionExerciseRecord,
  reps: number[],
  completedSessions: WorkoutSessionRecord[],
  historicalSessionExercises: WorkoutSessionExerciseRecord[],
  historicalResultsByExercise: Map<string, SetResultRecord[]>,
) {
  const currentSuccess = isSuccessfulAttempt(item, reps);
  if (!currentSuccess) {
    return false;
  }

  const historicalAttempts = buildHistoricalAttempts(
    item,
    completedSessions,
    historicalSessionExercises,
    historicalResultsByExercise,
  );

  return (
    countConsecutiveSuccesses([...historicalAttempts, { matchedTarget: true, success: currentSuccess }]) >=
    item.successesRequired
  );
}

async function startWorkout(workoutDayId: string) {
  const timestamp = nowIso();
  const sessionId = createId('session');
  const dayExercises = await db.dayExercises.where('workoutDayId').equals(workoutDayId).sortBy('sortOrder');
  const exerciseIds = dayExercises.map((item) => item.exerciseId);
  const exercises = await db.exercises.bulkGet(exerciseIds);
  const seeds = dayExercises.map((item, index) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    exerciseName: exercises[index]?.name ?? 'Harjutus',
    machineNumber: exercises[index]?.machineNumber ?? '',
    targetSets: item.targetSets,
    successesRequired: item.successesRequired,
    repMode: item.repMode,
    targetRepsMin: item.targetRepsMin,
    targetRepsMax: item.targetRepsMax,
    currentWeight: item.currentWeight,
    weightStep: item.weightStep,
    sortOrder: item.sortOrder,
  }));

  await db.transaction('rw', db.sessions, db.sessionExercises, async () => {
    await db.sessions.add({
      id: sessionId,
      workoutDayId,
      performedAt: timestamp,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await db.sessionExercises.bulkAdd(buildSessionExercises(sessionId, seeds));
  });
}

async function saveSetResult(
  sessionExercise: WorkoutSessionExerciseRecord,
  setNumber: number,
  status: SetResultRecord['status'],
  completedReps: number,
) {
  let savedResultId = '';

  await db.transaction('rw', db.setResults, db.sessionExercises, async () => {
    const freshSessionExercise = (await db.sessionExercises.get(sessionExercise.id)) ?? sessionExercise;
    const existingResults = await db.setResults
      .where('workoutSessionExerciseId')
      .equals(freshSessionExercise.id)
      .toArray();
    const persistedSetNumber = Math.max(
      setNumber,
      existingResults.reduce((maxValue, item) => Math.max(maxValue, item.setNumber), 0) + 1,
    );

    if (freshSessionExercise.performedOrder == null) {
      const sessionItems = await db.sessionExercises
        .where('workoutSessionId')
        .equals(freshSessionExercise.workoutSessionId)
        .toArray();
      const nextPerformedOrder =
        sessionItems.reduce(
          (maxValue, item) =>
            item.performedOrder == null ? maxValue : Math.max(maxValue, item.performedOrder),
          -1,
        ) + 1;

      await db.sessionExercises.update(freshSessionExercise.id, {
        performedOrder: nextPerformedOrder,
      });
    }

    savedResultId = `${freshSessionExercise.id}-${persistedSetNumber}`;

    await db.setResults.put({
      id: savedResultId,
      workoutSessionExerciseId: freshSessionExercise.id,
      setNumber: persistedSetNumber,
      status,
      completedReps,
      usedWeight: isDurationMode(freshSessionExercise.repMode) ? null : freshSessionExercise.currentWeight,
    });
  });

  return {
    id: savedResultId,
    sessionExerciseId: sessionExercise.id,
  };
}

async function updateSessionExerciseTarget(params: {
  sessionExercise: WorkoutSessionExerciseRecord;
  exerciseId: string;
  targetSets: number;
  repMode: RepMode;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  restSeconds: number;
}) {
  const {
    sessionExercise,
    exerciseId,
    targetSets,
    repMode,
    targetRepsMin,
    targetRepsMax,
    currentWeight,
    restSeconds,
  } = params;

  const dayExercise = await db.dayExercises.get(sessionExercise.dayExerciseId);

  await db.transaction('rw', db.sessionExercises, db.dayExercises, db.exerciseEvents, async () => {
    await db.sessionExercises.update(sessionExercise.id, {
      targetSets,
      repMode,
      targetRepsMin,
      targetRepsMax,
      currentWeight,
    });

    if (dayExercise) {
      await db.dayExercises.update(sessionExercise.dayExerciseId, {
        targetSets,
        repMode,
        targetRepsMin,
        targetRepsMax,
        currentWeight,
        restSeconds,
        updatedAt: nowIso(),
      });
    }

    if (sessionExercise.targetSets !== targetSets && exerciseId) {
      await addExerciseChangeEvent({
        exerciseId,
        sessionExerciseId: sessionExercise.id,
        actor: 'user',
        field: 'targetSets',
        fromValue: String(sessionExercise.targetSets),
        toValue: String(targetSets),
      });
    }

    const previousReps = formatRepsValue(
      sessionExercise.repMode,
      sessionExercise.targetRepsMin,
      sessionExercise.targetRepsMax,
    );
    const nextReps = formatRepsValue(repMode, targetRepsMin, targetRepsMax);
    if ((previousReps !== nextReps || sessionExercise.repMode !== repMode) && exerciseId) {
      await addExerciseChangeEvent({
        exerciseId,
        sessionExerciseId: sessionExercise.id,
        actor: 'user',
        field: 'targetReps',
        fromValue: previousReps,
        toValue: nextReps,
      });
    }

    if (sessionExercise.currentWeight !== currentWeight && !isDurationMode(repMode) && exerciseId) {
      await addExerciseChangeEvent({
        exerciseId,
        sessionExerciseId: sessionExercise.id,
        actor: 'user',
        field: 'currentWeight',
        fromValue: formatWeightValue(sessionExercise.currentWeight),
        toValue: formatWeightValue(currentWeight),
      });
    }
  });
}

async function adjustSessionExerciseWeight(params: {
  sessionExerciseId: string;
  dayExerciseId: string;
  exerciseId: string;
  weightDelta: number;
}) {
  const { sessionExerciseId, dayExerciseId, exerciseId, weightDelta } = params;
  if (weightDelta === 0) {
    return;
  }

  await db.transaction('rw', db.sessionExercises, db.dayExercises, db.exerciseEvents, async () => {
    const sessionExercise = await db.sessionExercises.get(sessionExerciseId);
    if (!sessionExercise || isDurationMode(sessionExercise.repMode)) {
      return;
    }

    const nextWeight = Math.max(0, sessionExercise.currentWeight + weightDelta);
    if (nextWeight === sessionExercise.currentWeight) {
      return;
    }

    await db.sessionExercises.update(sessionExerciseId, { currentWeight: nextWeight });
    const dayExercise = await db.dayExercises.get(dayExerciseId);
    if (dayExercise) {
      await db.dayExercises.update(dayExerciseId, { currentWeight: nextWeight, updatedAt: nowIso() });
    }
    if (exerciseId) {
      await addExerciseChangeEvent({
        exerciseId,
        sessionExerciseId,
        actor: 'user',
        field: 'currentWeight',
        fromValue: formatWeightValue(sessionExercise.currentWeight),
        toValue: formatWeightValue(nextWeight),
      });
    }
  });
}

async function completeWorkout(
  session: WorkoutSessionRecord,
  sessionExercises: WorkoutSessionExerciseRecord[],
  setResults: SetResultRecord[],
) {
  const resultsByExercise = new Map<string, SetResultRecord[]>();
  for (const result of setResults) {
    const list = resultsByExercise.get(result.workoutSessionExerciseId) ?? [];
    list.push(result);
    resultsByExercise.set(result.workoutSessionExerciseId, list);
  }

  await db.transaction('rw', db.dayExercises, db.sessions, db.sessionExercises, db.setResults, db.exerciseEvents, async () => {
    const completedSessions = await db.sessions.where('status').equals('completed').toArray();
    const historicalSessionExercises = await db.sessionExercises.toArray();
    const historicalSetResults = await db.setResults.toArray();
    const historicalResultsByExercise = new Map<string, SetResultRecord[]>();

    for (const result of historicalSetResults) {
      const list = historicalResultsByExercise.get(result.workoutSessionExerciseId) ?? [];
      list.push(result);
      historicalResultsByExercise.set(result.workoutSessionExerciseId, list);
    }

    for (const item of sessionExercises) {
      const dayExercise = await db.dayExercises.get(item.dayExerciseId);
      if (!dayExercise) {
        continue;
      }

      const reps = getSortedReps(resultsByExercise.get(item.id) ?? []);
      const shouldAdvance = shouldAdvanceTarget(
        item,
        reps,
        completedSessions,
        historicalSessionExercises,
        historicalResultsByExercise,
      );

      const nextTarget = computeNextTarget(
        {
          repMode: item.repMode,
          targetSets: item.targetSets,
          successesRequired: item.successesRequired,
          targetRepsMin: item.targetRepsMin,
          targetRepsMax: item.targetRepsMax,
          currentWeight: item.currentWeight,
          weightStep: item.weightStep,
        },
        shouldAdvance ? reps : [],
      );

      await addExerciseChangeEvent({
        exerciseId: dayExercise.exerciseId,
        sessionExerciseId: item.id,
        actor: 'automation',
        field: 'targetSets',
        fromValue: String(dayExercise.targetSets),
        toValue: String(nextTarget.targetSets),
      });
      await addExerciseChangeEvent({
        exerciseId: dayExercise.exerciseId,
        sessionExerciseId: item.id,
        actor: 'automation',
        field: 'targetReps',
        fromValue: formatRepsValue(item.repMode, dayExercise.targetRepsMin, dayExercise.targetRepsMax),
        toValue: formatRepsValue(nextTarget.repMode, nextTarget.targetRepsMin, nextTarget.targetRepsMax),
      });
      if (!isDurationMode(item.repMode)) {
        await addExerciseChangeEvent({
          exerciseId: dayExercise.exerciseId,
          sessionExerciseId: item.id,
          actor: 'automation',
          field: 'currentWeight',
          fromValue: formatWeightValue(dayExercise.currentWeight),
          toValue: formatWeightValue(nextTarget.currentWeight),
        });
      }

      await db.dayExercises.update(item.dayExerciseId, {
        targetRepsMin: nextTarget.targetRepsMin,
        targetRepsMax: nextTarget.targetRepsMax,
        currentWeight: nextTarget.currentWeight,
        weightStep: nextTarget.weightStep,
        updatedAt: nowIso(),
      });
    }

    await db.sessions.update(session.id, {
      status: 'completed',
      updatedAt: nowIso(),
      performedAt: nowIso(),
    });
  });
}

async function moveSessionExerciseToNext(
  targetId: string,
  sessionExercises: WorkoutSessionExerciseRecord[],
  setResults: SetResultRecord[],
) {
  const resultsCount = new Map<string, number>();
  for (const item of setResults) {
    resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
  }

  const completed = sessionExercises.filter((item) => (resultsCount.get(item.id) ?? 0) >= item.targetSets);
  const pending = sessionExercises.filter((item) => (resultsCount.get(item.id) ?? 0) < item.targetSets);
  const target = pending.find((item) => item.id === targetId);
  if (!target) {
    return;
  }

  const reorderedPending = [target, ...pending.filter((item) => item.id !== targetId)];
  const reordered = [...completed, ...reorderedPending];

  await db.transaction('rw', db.sessionExercises, async () => {
    await Promise.all(
      reordered.map((item, index) =>
        db.sessionExercises.update(item.id, {
          orderIndex: index,
        }),
      ),
    );
  });
}

async function cancelWorkout(sessionId: string) {
  const sessionExerciseIds = await db.sessionExercises.where('workoutSessionId').equals(sessionId).primaryKeys();

  await db.transaction('rw', db.setResults, db.sessionExercises, db.sessions, async () => {
    if (sessionExerciseIds.length > 0) {
      await db.setResults.where('workoutSessionExerciseId').anyOf(sessionExerciseIds as string[]).delete();
    }
    await db.sessionExercises.where('workoutSessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

async function undoSetResult(setResultId: string) {
  await db.setResults.delete(setResultId);
}

async function updateSetResult(
  setResultId: string,
  changes: Pick<SetResultRecord, 'status' | 'completedReps'>,
) {
  await db.setResults.update(setResultId, changes);
}

export function WorkoutPage() {
  useEffect(() => {
    void ensureSeedData();
  }, []);

  const workoutDays = useLiveQuery(
    () => db.workoutDays.orderBy('sortOrder').filter((item) => !item.isArchived).toArray(),
    [],
  );
  const dayExercises = useLiveQuery(() => db.dayExercises.toArray(), []);
  const exercises = useLiveQuery(() => db.exercises.toArray(), []);
  const activeSession = useLiveQuery(() => db.sessions.where('status').equals('active').first(), []);
  useWakeLock(Boolean(activeSession));
  const sessionExercises = useLiveQuery<WorkoutSessionExerciseRecord[]>(
    () =>
      activeSession
        ? db.sessionExercises.where('workoutSessionId').equals(activeSession.id).sortBy('orderIndex')
        : Promise.resolve<WorkoutSessionExerciseRecord[]>([]),
    [activeSession?.id],
  );
  const setResults = useLiveQuery<SetResultRecord[]>(
    () =>
      activeSession
        ? db
            .setResults
            .where('workoutSessionExerciseId')
            .anyOf((sessionExercises ?? []).map((item) => item.id))
            .toArray()
        : Promise.resolve<SetResultRecord[]>([]),
    [activeSession?.id, sessionExercises?.length],
  );
  const exerciseEvents = useLiveQuery(() => db.exerciseEvents.toArray(), []);
  const [failureTarget, setFailureTarget] = useState<{
    sessionExerciseId: string;
    setNumber: number;
    reps: string;
  } | null>(null);
  const [weightEditTarget, setWeightEditTarget] = useState<{
    sessionExerciseId: string;
    exerciseId: string;
    targetSets: string;
    repMode: RepMode;
    targetRepsMin: string;
    targetRepsMax: string;
    currentWeight: string;
    restSeconds: string;
  } | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [notesOpenExerciseId, setNotesOpenExerciseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [completedSummary, setCompletedSummary] = useState<
    Array<{
      id: string;
      name: string;
      nextTarget: ReturnType<typeof computeNextTarget>;
    }>
  >([]);
  const [lastSavedSet, setLastSavedSet] = useState<{
    id: string;
    sessionExerciseId: string;
  } | null>(null);
  const [restTimer, setRestTimer] = useState<{
    workoutSessionId: string;
    sessionExerciseId: string;
    endsAt: number;
    remainingSeconds: number;
  } | null>(null);
  const [setEditTarget, setSetEditTarget] = useState<{
    id: string;
    sessionExerciseId: string;
    setNumber: number;
    status: SetResultRecord['status'];
    reps: string;
  } | null>(null);
  const [selectedReps, setSelectedReps] = useState<number | null>(null);
  const swipeStartX = useRef<Record<string, number>>({});
  const weightUpdateQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!workoutDays?.length) {
      if (selectedDayId !== null) {
        setSelectedDayId(null);
      }
      return;
    }

    if (!selectedDayId || !(workoutDays ?? []).some((day) => day.id === selectedDayId)) {
      setSelectedDayId(workoutDays[0].id);
    }
  }, [selectedDayId, workoutDays]);

  const dayExerciseGroups = useMemo(() => {
    const exerciseMap = new Map((exercises ?? []).map((item) => [item.id, item]));
    const groups = new Map<string, DayExerciseView[]>();

    for (const item of dayExercises ?? []) {
      const list = groups.get(item.workoutDayId) ?? [];
      list.push({ ...item, exercise: exerciseMap.get(item.exerciseId) });
      groups.set(item.workoutDayId, list);
    }

    for (const value of groups.values()) {
      value.sort((left, right) => left.sortOrder - right.sortOrder);
    }

    return groups;
  }, [dayExercises, exercises]);

  const selectedDay = useMemo<WorkoutDayRecord | null>(
    () => (workoutDays ?? []).find((day) => day.id === selectedDayId) ?? null,
    [selectedDayId, workoutDays],
  );

  const selectedDayExercises = useMemo(
    () => (selectedDay ? dayExerciseGroups.get(selectedDay.id) ?? [] : []),
    [dayExerciseGroups, selectedDay],
  );

  const dayExerciseMap = useMemo(
    () => new Map((dayExercises ?? []).map((item) => [item.id, item])),
    [dayExercises],
  );

  const nextExercise = useMemo(() => {
    const resultsCount = new Map<string, number>();
    for (const item of setResults ?? []) {
      resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
    }

    return (sessionExercises ?? []).find(
      (item) => (resultsCount.get(item.id) ?? 0) < item.targetSets,
    );
  }, [sessionExercises, setResults]);

  const upcomingExercises = useMemo(() => {
    const resultsCount = new Map<string, number>();
    for (const item of setResults ?? []) {
      resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
    }

    return (sessionExercises ?? []).filter((item) => {
      const remaining = (resultsCount.get(item.id) ?? 0) < item.targetSets;
      return remaining && item.id !== nextExercise?.id;
    });
  }, [nextExercise?.id, sessionExercises, setResults]);

  const nextSetNumber = useMemo(() => {
    if (!nextExercise) {
      return 1;
    }

    return (setResults ?? []).filter((item) => item.workoutSessionExerciseId === nextExercise.id).length + 1;
  }, [nextExercise, setResults]);

  const nextExerciseResults = useMemo(
    () => (setResults ?? []).filter((item) => item.workoutSessionExerciseId === nextExercise?.id),
    [nextExercise?.id, setResults],
  );

  const nextExerciseSetStates = useMemo(
    () => (nextExercise ? getSetStates(nextExercise.targetSets, nextExerciseResults) : []),
    [nextExercise, nextExerciseResults],
  );

  const nextExerciseRepTarget = nextExercise
    ? getSuccessValue(nextExercise.repMode, nextExercise.targetRepsMin, nextExercise.targetRepsMax)
    : null;
  const nextExerciseRepResetKey = nextExercise
    ? `${nextExercise.id}:${nextExercise.repMode}:${nextExercise.targetRepsMin}:${nextExercise.targetRepsMax}`
    : null;

  const sessionCompletionKind = useMemo(() => {
    const resultsByExercise = new Map<string, SetResultRecord[]>();
    for (const result of setResults ?? []) {
      const results = resultsByExercise.get(result.workoutSessionExerciseId) ?? [];
      results.push(result);
      resultsByExercise.set(result.workoutSessionExerciseId, results);
    }

    return (sessionExercises ?? []).every(
      (item) =>
        getSessionCompletionKind(item.targetSets, resultsByExercise.get(item.id) ?? []) === 'completed',
    )
      ? 'completed'
      : 'partial';
  }, [sessionExercises, setResults]);

  const progress = useMemo(() => {
    const totalExercises = (sessionExercises ?? []).length;
    const resultsCount = new Map<string, number>();

    for (const item of setResults ?? []) {
      resultsCount.set(item.workoutSessionExerciseId, (resultsCount.get(item.workoutSessionExerciseId) ?? 0) + 1);
    }

    const completedExercises = (sessionExercises ?? []).filter(
      (item) => (resultsCount.get(item.id) ?? 0) >= item.targetSets,
    ).length;

    const remainingExercises = Math.max(totalExercises - completedExercises, 0);
    const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    return {
      totalExercises,
      completedExercises,
      remainingExercises,
      progressPercent,
    };
  }, [sessionExercises, setResults]);

  const failureExercise = useMemo(
    () => (sessionExercises ?? []).find((item) => item.id === failureTarget?.sessionExerciseId) ?? null,
    [failureTarget?.sessionExerciseId, sessionExercises],
  );

  const nextExerciseBaseId = useMemo(
    () => (nextExercise ? dayExerciseMap.get(nextExercise.dayExerciseId)?.exerciseId ?? null : null),
    [dayExerciseMap, nextExercise],
  );

  const activeExerciseEvents = useMemo(
    () =>
      nextExerciseBaseId
        ? (exerciseEvents ?? [])
            .filter((item) => item.exerciseId === nextExerciseBaseId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    [exerciseEvents, nextExerciseBaseId],
  );

  useEffect(() => {
    setNotesOpenExerciseId(null);
    setNoteDraft('');
  }, [nextExercise?.id]);

  useEffect(() => {
    setSetEditTarget(null);
  }, [nextExercise?.id]);

  useEffect(() => {
    setSelectedReps(nextExerciseRepTarget);
  }, [nextExerciseRepResetKey, nextExerciseRepTarget]);

  useEffect(() => {
    if (activeSession === undefined) {
      return;
    }

    if (!activeSession) {
      writePersistedRestTimer(null);
      return;
    }

    if (restTimer) {
      return;
    }

    const persistedTimer = readPersistedRestTimer();
    if (!persistedTimer || persistedTimer.workoutSessionId !== activeSession.id) {
      return;
    }

    const remainingSeconds = Math.max(Math.ceil((persistedTimer.endsAt - Date.now()) / 1000), 0);
    if (remainingSeconds <= 0) {
      writePersistedRestTimer(null);
      return;
    }

    setRestTimer({
      ...persistedTimer,
      remainingSeconds,
    });
  }, [activeSession, restTimer]);

  useEffect(() => {
    if (!restTimer) {
      return;
    }

    writePersistedRestTimer({
      workoutSessionId: restTimer.workoutSessionId,
      sessionExerciseId: restTimer.sessionExerciseId,
      endsAt: restTimer.endsAt,
    });
  }, [restTimer]);

  useEffect(() => {
    if (!restTimer || restTimer.remainingSeconds <= 0) {
      return;
    }

    const handle = window.setInterval(() => {
      setRestTimer((current) => {
        if (!current) {
          return null;
        }

        const remainingSeconds = Math.max(Math.ceil((current.endsAt - Date.now()) / 1000), 0);
        if (remainingSeconds <= 0) {
          writePersistedRestTimer(null);
          return null;
        }

        return {
          ...current,
          remainingSeconds,
        };
      });
    }, 1000);

    return () => window.clearInterval(handle);
  }, [restTimer]);

  async function handleSetSave(
    sessionExercise: WorkoutSessionExerciseRecord,
    setNumber: number,
    status: SetResultRecord['status'],
    completedReps: number,
  ) {
    const savedSet = await saveSetResult(sessionExercise, setNumber, status, completedReps);
    setLastSavedSet(savedSet);

    const restSeconds = dayExerciseMap.get(sessionExercise.dayExerciseId)?.restSeconds ?? 0;
    setRestTimer(
      restSeconds > 0
        ? {
            workoutSessionId: sessionExercise.workoutSessionId,
            sessionExerciseId: sessionExercise.id,
            endsAt: Date.now() + restSeconds * 1000,
            remainingSeconds: restSeconds,
          }
        : null,
    );
  }

  function openTargetEditor(sessionExercise: WorkoutSessionExerciseRecord, exerciseId: string) {
    setWeightEditTarget({
      sessionExerciseId: sessionExercise.id,
      exerciseId,
      targetSets: String(sessionExercise.targetSets),
      repMode: sessionExercise.repMode,
      targetRepsMin: String(sessionExercise.targetRepsMin),
      targetRepsMax: String(sessionExercise.targetRepsMax),
      currentWeight: String(sessionExercise.currentWeight),
      restSeconds: String(dayExerciseMap.get(sessionExercise.dayExerciseId)?.restSeconds ?? 60),
    });
  }

  function queueWeightAdjustment(sessionExercise: WorkoutSessionExerciseRecord, exerciseId: string, requestedWeight: number) {
    const weightDelta = requestedWeight - sessionExercise.currentWeight;
    weightUpdateQueue.current = weightUpdateQueue.current
      .catch(() => undefined)
      .then(() =>
        adjustSessionExerciseWeight({
          sessionExerciseId: sessionExercise.id,
          dayExerciseId: sessionExercise.dayExerciseId,
          exerciseId,
          weightDelta,
        }),
      );
  }

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Tänane logi</p>
          <h2>Tänane treening</h2>
        </div>
      </div>

      {activeSession && progress.totalExercises > 0 ? (
        <div className="panel progress-panel">
          <div className="config-head">
            <strong>{`Tehtud ${progress.completedExercises} / ${progress.totalExercises}`}</strong>
            <span>{`Jäänud ${progress.remainingExercises}`}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress.progressPercent}%` }} />
          </div>
        </div>
      ) : null}

      {!activeSession ? (
        <>
          {workoutDays?.length === 0 ? (
            <p className="empty-card">Lisa esmalt treeningpäevad ja harjutused Kavad lehel.</p>
          ) : (
            <>
              <div className="panel">
                <p className="eyebrow">Valitud päev</p>
                <div className="day-tabs">
                  {(workoutDays ?? []).map((day) => (
                    <button
                      key={day.id}
                      type="button"
                      className={selectedDayId === day.id ? 'tab-chip active' : 'tab-chip'}
                      onClick={() => setSelectedDayId(day.id)}
                    >
                      {day.name}
                    </button>
                  ))}
                </div>
                {selectedDay?.notes ? <p className="muted note-copy">{selectedDay.notes}</p> : null}
              </div>

              <div className="panel">
                <p className="eyebrow">Päeva harjutused</p>
                {selectedDayExercises.length === 0 ? null : (
                  <button
                    type="button"
                    className="hero-button"
                    onClick={() => {
                      if (selectedDay) {
                        void startWorkout(selectedDay.id);
                      }
                    }}
                  >
                    Alusta treeningut
                  </button>
                )}
                <ul className="stack-list preview-list">
                  {selectedDayExercises.map((item) => (
                    <li key={item.id} className="list-card">
                      <strong>{item.exercise?.name ?? 'Harjutus'}</strong>
                      <span>Masin #{item.exercise?.machineNumber || '-'}</span>
                      <span>
                        {item.targetSets} x{' '}
                        {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}
                      </span>
                    </li>
                  ))}
                </ul>
                {selectedDayExercises.length === 0 ? (
                  <p className="empty-card">Sellel päeval pole veel harjutusi.</p>
                ) : null}
              </div>
            </>
          )}
        </>
      ) : null}

      {activeSession && nextExercise ? (
        <>
          <ActiveExerciseCard
            exercise={nextExercise}
            setNumber={nextSetNumber}
            setStates={nextExerciseSetStates}
            selectedReps={selectedReps ?? getSuccessValue(nextExercise.repMode, nextExercise.targetRepsMin, nextExercise.targetRepsMax)}
            onRepsChange={setSelectedReps}
            onWeightChange={(weight) =>
              queueWeightAdjustment(nextExercise, nextExerciseBaseId ?? '', weight)
            }
            onSetClick={(setNumber) => {
              const targetResult = nextExerciseResults.find((item) => item.setNumber === setNumber);
              if (!targetResult) return;
              setSetEditTarget({
                id: targetResult.id,
                sessionExerciseId: targetResult.workoutSessionExerciseId,
                setNumber: targetResult.setNumber,
                status: targetResult.status,
                reps: String(targetResult.completedReps),
              });
            }}
          >
            {restTimer?.sessionExerciseId === nextExercise.id ? (
              <div className="rest-timer-panel">
                <strong>Puhkus</strong>
                <span>{formatRestTime(restTimer.remainingSeconds)}</span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    writePersistedRestTimer(null);
                    setRestTimer(null);
                  }}
                >
                  Jätan vahele
                </button>
              </div>
            ) : null}
            {lastSavedSet?.sessionExerciseId === nextExercise.id ? (
              <div className="undo-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={async () => {
                    await undoSetResult(lastSavedSet.id);
                    setLastSavedSet(null);
                    writePersistedRestTimer(null);
                    setRestTimer(null);
                  }}
                >
                  Võta tagasi
                </button>
              </div>
            ) : null}
            <div className="utility-button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => openTargetEditor(nextExercise, nextExerciseBaseId ?? '')}
              >
                Muuda sihti
              </button>
              {nextExerciseBaseId ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setNotesOpenExerciseId((current) => (current === nextExercise.id ? null : nextExercise.id))
                  }
                >
                  Märkmed
                </button>
              ) : null}
            </div>
            {weightEditTarget?.sessionExerciseId === nextExercise.id ? (
              <div className="inline-target-editor">
                <h4>Muuda sihti</h4>
                <label htmlFor="sessionTargetSets">
                  Seeriate arv
                  <input
                    id="sessionTargetSets"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={weightEditTarget.targetSets}
                    onChange={(event) =>
                      setWeightEditTarget((current) =>
                        current ? { ...current, targetSets: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <label htmlFor="sessionRepMode">
                  Tüüp
                  <select
                    id="sessionRepMode"
                    value={weightEditTarget.repMode}
                    onChange={(event) =>
                      setWeightEditTarget((current) =>
                        current ? { ...current, repMode: event.target.value as RepMode } : current,
                      )
                    }
                  >
                    <option value="range">Korduste vahemik + raskus</option>
                    <option value="fixed">Fikseeritud kordused + raskus</option>
                    <option value="duration-range">Ajavahemik</option>
                    <option value="duration-fixed">Fikseeritud aeg</option>
                  </select>
                </label>
                <label htmlFor="sessionTargetMin">
                  {weightEditTarget.repMode === 'fixed' || weightEditTarget.repMode === 'duration-fixed'
                    ? weightEditTarget.repMode === 'duration-fixed'
                      ? 'Kestus (min)'
                      : 'Kordused'
                    : weightEditTarget.repMode === 'duration-range'
                      ? 'Min kestus (min)'
                      : 'Min kordused'}
                  <input
                    id="sessionTargetMin"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={weightEditTarget.targetRepsMin}
                    onChange={(event) =>
                      setWeightEditTarget((current) =>
                        current ? { ...current, targetRepsMin: event.target.value } : current,
                      )
                    }
                  />
                </label>
                {weightEditTarget.repMode === 'range' || weightEditTarget.repMode === 'duration-range' ? (
                  <label htmlFor="sessionTargetMax">
                    {weightEditTarget.repMode === 'duration-range' ? 'Max kestus (min)' : 'Max kordused'}
                    <input
                      id="sessionTargetMax"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={weightEditTarget.targetRepsMax}
                      onChange={(event) =>
                        setWeightEditTarget((current) =>
                          current ? { ...current, targetRepsMax: event.target.value } : current,
                        )
                      }
                    />
                  </label>
                ) : null}
                {!isDurationMode(weightEditTarget.repMode) ? (
                  <label htmlFor="sessionWeight">
                    Raskus (kg)
                    <input
                      id="sessionWeight"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={weightEditTarget.currentWeight}
                      onChange={(event) =>
                        setWeightEditTarget((current) =>
                          current ? { ...current, currentWeight: event.target.value } : current,
                        )
                      }
                    />
                  </label>
                ) : null}
                <label htmlFor="sessionRestSeconds">
                  Puhkeaeg seeriate vahel (sek)
                  <input
                    id="sessionRestSeconds"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={weightEditTarget.restSeconds}
                    onChange={(event) =>
                      setWeightEditTarget((current) =>
                        current ? { ...current, restSeconds: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <p className="muted note-copy">
                  Muudatus rakendub kohe käimasolevale harjutusele ja salvestatakse ka järgmise korra sihiks.
                </p>
                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setWeightEditTarget(null)}
                  >
                    Loobu
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      const target = (sessionExercises ?? []).find(
                        (item) => item.id === weightEditTarget.sessionExerciseId,
                      );
                      if (!target) {
                        return;
                      }

                      const parsedTargetSets = Number(weightEditTarget.targetSets);
                      const parsedMin = Number(weightEditTarget.targetRepsMin);
                      const parsedMax =
                        weightEditTarget.repMode === 'range' || weightEditTarget.repMode === 'duration-range'
                          ? Number(weightEditTarget.targetRepsMax)
                          : parsedMin;
                      const parsedWeight = isDurationMode(weightEditTarget.repMode)
                        ? 0
                        : Number(weightEditTarget.currentWeight);
                      const parsedRestSeconds = Number(weightEditTarget.restSeconds);
                      const completedSetCount = nextExerciseResults.length;

                      if (
                        !Number.isFinite(parsedTargetSets) ||
                        !Number.isFinite(parsedMin) ||
                        !Number.isFinite(parsedMax) ||
                        !Number.isFinite(parsedWeight) ||
                        !Number.isFinite(parsedRestSeconds) ||
                        parsedTargetSets < Math.max(completedSetCount, 1) ||
                        parsedMin < 1 ||
                        parsedMax < parsedMin ||
                        parsedWeight < 0 ||
                        parsedRestSeconds < 0
                      ) {
                        return;
                      }

                      await updateSessionExerciseTarget({
                        sessionExercise: target,
                        exerciseId: weightEditTarget.exerciseId,
                        targetSets: parsedTargetSets,
                        repMode: weightEditTarget.repMode,
                        targetRepsMin: parsedMin,
                        targetRepsMax: parsedMax,
                        currentWeight: parsedWeight,
                        restSeconds: parsedRestSeconds,
                      });
                      setWeightEditTarget(null);
                    }}
                  >
                    Salvesta siht
                  </button>
                </div>
              </div>
            ) : null}
            {setEditTarget?.sessionExerciseId === nextExercise.id ? (
              <div className="inline-set-editor">
                <h4>{`Muuda seeriat ${setEditTarget.setNumber}`}</h4>
                <div className="button-row">
                  <button
                    type="button"
                    className={setEditTarget.status === 'success' ? 'success-button' : 'secondary-button'}
                    onClick={() =>
                      setSetEditTarget((current) =>
                        current
                          ? {
                              ...current,
                              status: 'success',
                              reps: String(
                                getSuccessValue(
                                  nextExercise.repMode,
                                  nextExercise.targetRepsMin,
                                  nextExercise.targetRepsMax,
                                ),
                              ),
                            }
                          : current,
                      )
                    }
                  >
                    Tehtud
                  </button>
                  <button
                    type="button"
                    className={setEditTarget.status === 'failed' ? 'warning-button' : 'secondary-button'}
                    onClick={() =>
                      setSetEditTarget((current) =>
                        current ? { ...current, status: 'failed', reps: current.reps || '' } : current,
                      )
                    }
                  >
                    Ei tulnud täis
                  </button>
                </div>
                {setEditTarget.status === 'failed' ? (
                  <label htmlFor="editCompletedReps">
                    {isDurationMode(nextExercise.repMode) ? 'Tegelik kestus (min)' : 'Tegelikud kordused'}
                    <input
                      id="editCompletedReps"
                      type="number"
                      inputMode="numeric"
                      value={setEditTarget.reps}
                      onChange={(event) =>
                        setSetEditTarget((current) =>
                          current ? { ...current, reps: event.target.value } : current,
                        )
                      }
                    />
                  </label>
                ) : null}
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={async () => {
                      await undoSetResult(setEditTarget.id);
                      setSetEditTarget(null);
                    }}
                  >
                    Kustuta seeria
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSetEditTarget(null)}
                  >
                    Loobu
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      await updateSetResult(setEditTarget.id, {
                        status: setEditTarget.status,
                        completedReps:
                          setEditTarget.status === 'success'
                            ? getSuccessValue(
                                nextExercise.repMode,
                                nextExercise.targetRepsMin,
                                nextExercise.targetRepsMax,
                              )
                            : Number(setEditTarget.reps || '0'),
                      });
                      setSetEditTarget(null);
                    }}
                  >
                    Salvesta muudatus
                  </button>
                </div>
              </div>
            ) : null}
            {failureTarget?.sessionExerciseId === nextExercise.id ? (
              <div className="inline-failure-form">
                <label htmlFor="completedReps">
                  {failureExercise && isDurationMode(failureExercise.repMode)
                    ? 'Tegelik kestus (min)'
                    : 'Tegelikud kordused'}
                  <input
                    id="completedReps"
                    type="number"
                    inputMode="numeric"
                    value={failureTarget.reps}
                    onChange={(event) =>
                      setFailureTarget((current) => (current ? { ...current, reps: event.target.value } : current))
                    }
                  />
                </label>
                <div className="button-row">
                  <button type="button" className="secondary-button" onClick={() => setFailureTarget(null)}>
                    Loobu
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      const target = (sessionExercises ?? []).find((item) => item.id === failureTarget.sessionExerciseId);
                      if (!target) {
                        return;
                      }

                      await handleSetSave(
                        target,
                        failureTarget.setNumber,
                        'failed',
                        Number(failureTarget.reps || '0'),
                      );
                      setFailureTarget(null);
                    }}
                  >
                    Salvesta seeria
                  </button>
                </div>
              </div>
            ) : null}
            {notesOpenExerciseId === nextExercise.id && nextExerciseBaseId ? (
              <div className="inline-notes-panel">
                <h4>Sama harjutuse märkmed ja muudatused</h4>
                <label htmlFor="exerciseNote">
                  Lisa märkus
                  <textarea
                    id="exerciseNote"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary-button"
                  onClick={async () => {
                    await addExerciseNote({
                      exerciseId: nextExerciseBaseId,
                      sessionExerciseId: nextExercise.id,
                      noteText: noteDraft,
                    });
                    setNoteDraft('');
                  }}
                >
                  Salvesta märkus
                </button>
                <ul className="stack-list">
                  {activeExerciseEvents.length === 0 ? (
                    <li className="empty-card">Selle harjutuse kohta veel märkmeid ega muudatusi ei ole.</li>
                  ) : (
                    activeExerciseEvents.map((item) => (
                      <li
                        key={item.id}
                        className={`list-card exercise-event-card event-${item.type} event-${item.actor}`}
                      >
                        <strong>{new Date(item.createdAt).toLocaleString('et-EE')}</strong>
                        <span>{item.actor === 'automation' ? 'Automaatika' : 'Kasutaja'}</span>
                        <span>{formatExerciseEventDescription(item)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              className="ghost-button"
              onClick={async () => {
                if (!activeSession) {
                  return;
                }
                if (window.confirm('Katkestada käimasolev treening?')) {
                  await cancelWorkout(activeSession.id);
                }
              }}
            >
              Katkesta treening
            </button>
          </ActiveExerciseCard>

          {upcomingExercises.length > 0 ? (
            <div className="panel">
              <p className="eyebrow">Tulemas</p>
              <ul className="stack-list">
                {upcomingExercises.map((item) => (
                  <li
                    key={item.id}
                    className="list-card swipe-card"
                    data-testid={`upcoming-row-${item.id}`}
                    onPointerDown={(event) => {
                      swipeStartX.current[item.id] = event.clientX;
                    }}
                    onPointerUp={(event) => {
                      const startX = swipeStartX.current[item.id];
                      if (startX - event.clientX > 60) {
                        void moveSessionExerciseToNext(item.id, sessionExercises ?? [], setResults ?? []);
                      }
                      delete swipeStartX.current[item.id];
                    }}
                    onTouchStart={(event) => {
                      swipeStartX.current[item.id] = event.changedTouches[0]?.clientX ?? 0;
                    }}
                    onTouchEnd={(event) => {
                      const startX = swipeStartX.current[item.id];
                      const endX = event.changedTouches[0]?.clientX ?? startX;
                      if (startX - endX > 60) {
                        void moveSessionExerciseToNext(item.id, sessionExercises ?? [], setResults ?? []);
                      }
                      delete swipeStartX.current[item.id];
                    }}
                  >
                    <strong>{item.exerciseName}</strong>
                    <span>
                      Masin #{item.machineNumber || '-'} · {item.targetSets} x{' '}
                      {formatTarget(item.repMode, item.targetRepsMin, item.targetRepsMax, item.currentWeight)}
                    </span>
                    <span className="swipe-hint">Tõmba vasakule, et teha järgmisena</span>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-label={`Tee ${item.exerciseName} järgmisena`}
                      onClick={() => void moveSessionExerciseToNext(item.id, sessionExercises ?? [], setResults ?? [])}
                    >
                      Tee järgmisena
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {activeSession && nextExercise ? (
        <SetActionBar
          onFailed={() => setFailureTarget({ sessionExerciseId: nextExercise.id, setNumber: nextSetNumber, reps: '' })}
          onSuccess={() =>
            void handleSetSave(
              nextExercise,
              nextSetNumber,
              'success',
              selectedReps ?? getSuccessValue(nextExercise.repMode, nextExercise.targetRepsMin, nextExercise.targetRepsMax),
            )
          }
        />
      ) : null}

      {activeSession && !nextExercise && sessionCompletionKind === 'completed' && completedSummary.length === 0 ? (
        <div className="panel">
          <h3>Treening valmis</h3>
          <p className="muted">Kõik seeriad said kirja. Genereeri järgmised sihid.</p>
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              if (sessionCompletionKind !== 'completed') {
                return;
              }

              const completedSessions = await db.sessions.where('status').equals('completed').toArray();
              const historicalSessionExercises = await db.sessionExercises.toArray();
              const historicalSetResults = await db.setResults.toArray();
              const currentResultsByExercise = new Map<string, SetResultRecord[]>();
              const historicalResultsByExercise = new Map<string, SetResultRecord[]>();

              for (const result of setResults ?? []) {
                const list = currentResultsByExercise.get(result.workoutSessionExerciseId) ?? [];
                list.push(result);
                currentResultsByExercise.set(result.workoutSessionExerciseId, list);
              }

              for (const result of historicalSetResults) {
                const list = historicalResultsByExercise.get(result.workoutSessionExerciseId) ?? [];
                list.push(result);
                historicalResultsByExercise.set(result.workoutSessionExerciseId, list);
              }

              const nextSummary = (sessionExercises ?? []).map((item) => {
                const reps = getSortedReps(currentResultsByExercise.get(item.id) ?? []);
                const shouldAdvance = shouldAdvanceTarget(
                  item,
                  reps,
                  completedSessions,
                  historicalSessionExercises,
                  historicalResultsByExercise,
                );

                return {
                  id: item.id,
                  name: item.exerciseName,
                  nextTarget: computeNextTarget(
                    {
                      repMode: item.repMode,
                      targetSets: item.targetSets,
                      successesRequired: item.successesRequired,
                      targetRepsMin: item.targetRepsMin,
                      targetRepsMax: item.targetRepsMax,
                      currentWeight: item.currentWeight,
                      weightStep: item.weightStep,
                    },
                    shouldAdvance ? reps : [],
                  ),
                };
              });

              setCompletedSummary(nextSummary);
              await completeWorkout(activeSession, sessionExercises ?? [], setResults ?? []);
            }}
          >
            Lõpeta treening
          </button>
        </div>
      ) : null}

      {activeSession && !nextExercise && sessionCompletionKind === 'partial' && completedSummary.length === 0 ? (
        <div className="panel">
          <h3>Treening jäi poolikuks</h3>
          <p className="muted">Kõik planeeritud seeriad ei ole korrektselt kirjas.</p>
          <button
            type="button"
            className="warning-button"
            onClick={async () => {
              if (sessionCompletionKind !== 'partial') {
                return;
              }

              await completeSessionPartially(activeSession.id);
            }}
          >
            Lõpeta poolikuna
          </button>
        </div>
      ) : null}

      {completedSummary.length > 0 ? (
        <div className="panel">
          <h3>Järgmine siht</h3>
          <ul className="stack-list">
            {completedSummary.map((item) => (
              <li key={item.id} className="list-card">
                <strong>{item.name}</strong>
                <span>
                  {item.nextTarget.targetSets} x{' '}
                  {formatTarget(
                    item.nextTarget.repMode,
                    item.nextTarget.targetRepsMin,
                    item.nextTarget.targetRepsMax,
                    item.nextTarget.currentWeight,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

    </section>
  );
}
