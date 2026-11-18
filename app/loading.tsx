import { NoteSkeletons, Spinner } from "@/app/components/feedback";

export default function Loading() {
  return (
    <section className="page-loading">
      <div className="action-feedback is-pending" role="status" aria-live="polite">
        <Spinner />
        <div>
          <strong>Loading SIDE B…</strong>
          <p>Getting the next page ready.</p>
        </div>
      </div>
      <div className="page-loading-studio" aria-hidden="true">
        <div className="loading-studio-intro">
          <span className="skeleton-block skeleton-eyebrow" />
          <span className="skeleton-block skeleton-title" />
          <span className="skeleton-block skeleton-title skeleton-medium" />
          <span className="skeleton-block" />
          <span className="skeleton-block skeleton-short" />
        </div>
        <div className="loading-studio-form">
          <span className="skeleton-block skeleton-eyebrow" />
          <span className="skeleton-block skeleton-input" />
          <span className="skeleton-block skeleton-input" />
          <span className="skeleton-block skeleton-multiline" />
          <span className="skeleton-block skeleton-button" />
        </div>
      </div>
      <NoteSkeletons />
    </section>
  );
}
