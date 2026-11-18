export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`feedback-spinner ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

/** Decorative placeholders: the caller supplies the loading announcement. */
export function NoteSkeletons({
  count = 3,
  compact = false,
  className = "",
}: {
  count?: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`note-skeleton-grid ${compact ? "is-compact" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="note-skeleton" key={index}>
          <span className="skeleton-block skeleton-eyebrow" />
          <span className="skeleton-block skeleton-title" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block skeleton-medium" />
          {!compact && (
            <>
              <span className="skeleton-block skeleton-short" />
              <div className="skeleton-tags">
                <span className="skeleton-block skeleton-pill" />
                <span className="skeleton-block skeleton-pill" />
              </div>
              <span className="skeleton-block skeleton-button" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
