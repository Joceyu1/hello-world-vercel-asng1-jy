import { Spinner } from "@/app/components/feedback";

export default function ProfileLoading() {
  return (
    <section className="account-page">
      <div className="action-feedback is-pending" role="status" aria-live="polite">
        <Spinner /> Loading your profile…
      </div>
      <div aria-hidden="true">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-short" />
        <span className="skeleton-block skeleton-input" />
        <span className="skeleton-block skeleton-input" />
        <span className="skeleton-block skeleton-input" />
        <span className="skeleton-block skeleton-button" />
      </div>
    </section>
  );
}
