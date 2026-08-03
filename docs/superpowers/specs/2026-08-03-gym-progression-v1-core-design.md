# Gym progression V1 core design

## Goal

Extend the existing offline-first progression core so that stored session data is
auditable and the pure evaluator follows the confirmed V1 rules. This release
does not introduce the large workout-editor UI, backup-format replacement, or
analytics screens; it creates their stable persistence and policy foundation.

## Data model

The new records are additive and optional for existing UI flows. A target group
contains its metric, load type, fixed available-load step, progression axis,
threshold, ceiling, and whether it is the primary group. A planned-set snapshot
contains the complete target and eligibility rule in effect when the set was
recorded. Set results store actual metric/load data and derive their assessment
from that snapshot rather than persisting an independent success flag.

Sessions gain `aborted` status and an optional measured bodyweight. Exercise
and configuration changes are represented by immutable audit events with a
reason and before/after snapshots. Existing v8 rows receive compatible default
values in a v9 migration; legacy fields remain available to the current UI.

## Progression policy

The evaluator only advances a primary group. All originally planned primary
sets must meet the minimum metric; qualifying extra primary sets may contribute
to the threshold count. A lighter actual load never qualifies. A skipped whole
exercise is neutral, while a started partial exercise resets the streak.

An eligible session contributes at most one success and at most one target
advance. The evaluator supports fixed/range metrics, standard load and assisted
load directions, zero-step manual behaviour, clamped ceilings, and explicit
failure reasons. Related groups are evaluated for adherence separately and do
not influence the primary group.

## Testing

Use Vitest test-first for every policy branch and fake-indexeddb migration
coverage. Run the full test suite, linter, and production build before
publication.
