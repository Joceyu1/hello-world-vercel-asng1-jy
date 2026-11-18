import { Spinner } from "@/app/components/feedback";

export default function MembersLoading() {
  return (
    <section className="account-page">
      <div className="action-feedback is-pending" role="status" aria-live="polite">
        <Spinner /> Loading your listening room…
      </div>
      <div aria-hidden="true">
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block" />
        <span className="skeleton-block skeleton-medium" />
        <span className="skeleton-block skeleton-button" />
      </div>
    </section>
  );
}
