# Workout and History UX Cleanup Design

## Scope

Deliver six bounded interaction and presentation repairs while retaining the
training-console layout, current visual patterns, Dexie schema, and progression
domain behavior. No new product capability or visual system is introduced.

## Workout interaction changes

The failure form remains inside the active exercise card. Opening it focuses
the actual-repetitions input and scrolls that input into view. A blank,
non-finite, or negative value is rejected visibly before any persistence call.

The latest saved set is held in `WorkoutPage` state rather than only in the
currently active card. It remains undoable across the automatic transition to
the next exercise, and is replaced by the next saved set. Undo continues to
use the existing persistence boundary and restores the recorded exercise/set
state only.

The persisted rest timer is rendered at workout-page scope, so an existing
active timer continues to be visible and skippable after an exercise change.
Its storage, expiry, and completion behavior are unchanged.

For repetition `range` targets, the redundant editable repetition stepper is
not rendered because the existing range buttons are the authoritative logging
control. Weight controls remain. Fixed-repetition and duration-mode controls
are unchanged.

## History and completion presentation

History uses the persisted result status to label a recorded exercise as
successful or failed. Range upper-bound eligibility is not reinterpreted as a
failure; if it is displayed, it is supporting progression context only.

After a workout completes, the existing completion/progression panel is placed
ahead of normal start-workout content. This changes content order only and
preserves the existing completion data and progression explanations.

## Validation and accessibility

Touched controls keep their existing large tap targets, visible focus, and
numeric input modes. Failure validation uses text, not color alone. The
failure form focus/scroll behavior is exercised in rendered mobile and desktop
views. The validation pass compares only the requested six flows; it does not
propose new layout or styling.

## Verification

Tests cover failure-form focus and invalid values, cross-exercise undo, History
range success presentation, rest timer continuity and skipping, control
visibility by target mode, and completion-summary ordering. The final pass runs
focused tests, the full suite, lint, TypeScript, production build, diff check,
rendered mobile/desktop validation, and a deployed production smoke check.
