# History Set Editing Design

## Goal

Allow correction of recorded sets in completed workout history while retaining
History's compact, read-first exercise cards and the existing actual-result
data policy.

## Interaction

A completed historical exercise card with recorded sets shows a small `Muuda
seeriaid` action. It opens a compact modal containing the frozen target as
read-only context and a selectable list of recorded sets. Selecting a set
opens its edit fields in the same modal. The card itself remains aggregated.

Repetition sets can change actual repetitions, explicit actual weight, and
success/failed status. Duration sets can change actual duration and status;
they never render or write weight. Cancel closes without persistence. Save
validates finite non-negative metrics and, where applicable, finite
non-negative weight before persisting.

## Persistence and refresh

The modal calls only `correctHistoricalSetResult`. That transaction updates
the set and recomputes its `dayExerciseId` owner atomically. The History live
queries and the existing pure PR helper recompute from Dexie data, so no local
PR cache or manual refresh is needed. Session-exercise targets are never
edited.

## Guardrails

Actions appear only for `completed` sessions with one or more recorded sets.
No schema, V1, revision-table, target snapshot, exercise identity, session, or
owner edits are introduced. Transaction failures leave the editor open with an
error and rely on the existing transaction rollback.
