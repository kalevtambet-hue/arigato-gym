type SetActionBarProps = {
  onFailed: () => void;
  onSuccess: () => void;
};

export function SetActionBar({ onFailed, onSuccess }: SetActionBarProps) {
  return (
    <div
      className="sticky-action-bar"
      data-testid="sticky-action-bar"
      aria-label="Seeria tulemuse kinnitamine"
    >
      <button type="button" className="warning-button" onClick={onFailed}>
        Ei tulnud täis
      </button>
      <button type="button" className="success-button" onClick={onSuccess}>
        Tehtud
      </button>
    </div>
  );
}
