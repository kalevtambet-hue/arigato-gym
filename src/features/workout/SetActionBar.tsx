type SetActionBarProps = {
  onFailed: () => void;
  onSuccess: (completedReps?: number) => void;
  successReps?: number[];
};

export function SetActionBar({ onFailed, onSuccess, successReps }: SetActionBarProps) {
  const hasRepChoices = (successReps?.length ?? 0) > 0;

  return (
    <div
      className={hasRepChoices ? 'sticky-action-bar rep-choice-bar' : 'sticky-action-bar'}
      data-testid="sticky-action-bar"
      aria-label="Seeria tulemuse kinnitamine"
    >
      {hasRepChoices
        ? successReps?.map((reps) => (
            <button type="button" className="success-button" key={reps} onClick={() => onSuccess(reps)}>
              {reps}
            </button>
          ))
        : null}
      <button type="button" className="warning-button" onClick={onFailed}>
        Ei tulnud täis
      </button>
      {!hasRepChoices ? (
        <button type="button" className="success-button" onClick={() => onSuccess()}>
          Tehtud
        </button>
      ) : null}
    </div>
  );
}
