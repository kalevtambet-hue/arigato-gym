# Exercise Personal Records Design

## Goal

Show compact, exercise-specific personal-record and history statistics in
History without creating a second progression model or persisting derived data.

## Data boundary

`exercisePerformance.ts` is a pure, immutable domain module. It accepts only
completed sessions, their frozen `WorkoutSessionExerciseRecord` snapshots, and
`SetResultRecord` values. It uses `completedReps`, `usedWeight`, `status`, and
`setKind`; an omitted `setKind` means a legacy work set. It never reads target
fallbacks, V1 fields, current `DayExerciseRecord` targets, or progression
helpers.

## Summary rules

For repetition modes, successful work sets with an explicit `usedWeight` are
eligible. The summary exposes highest actual load and the highest completed
reps at that load. For duration modes, successful work sets are eligible and
the highest `completedReps` is the longest duration. Both forms include useful
successful-set and completed-session counts plus latest evidence. Equal metric
ties select the latest session, then lexicographic session ID and set ID.

## UI boundary

History recomputes the summary from its live Dexie inputs. It renders the
compact panel only when an explicit `exerciseId` resolves to an exercise, or a
case-insensitive text filter exactly resolves to one known exercise name. A
partial, ambiguous, missing, or unfiltered name renders no summary. Existing
unfiltered History remains unchanged.

## Correctness

No PR counter is stored. A historical correction changes the live set record,
so the next History query derives changed statistics automatically. Domain,
History UI, and correction integration tests protect the policy.
