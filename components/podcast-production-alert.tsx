import Link from "next/link";
import type { PodcastInquiryAlertSummary } from "../lib/server/podcast-inquiry-alerts";

const ADMIN_URL = "https://fireside-chat-preview.onrender.com/admin/production-inquiries";

export function PodcastProductionAlert({ summary }: { summary: PodcastInquiryAlertSummary | null }) {
  if (!summary || summary.uniqueOffices < 1) return null;
  const names = summary.offices.slice(0, 8).map(({ memberName, chamber, state, district }) =>
    memberName + " (" + (chamber === "HOUSE" ? "Rep." + (district ? " " + district : "") : "Sen.") + ", " + state + ")");
  return (
    <section className="podcast-production-alert" role="alert" aria-live="polite">
      <div className="podcast-production-alert-header">
        <span aria-hidden="true" className="podcast-production-alarm">!</span>
        <div>
          <p className="podcast-production-overline">ACTION REQUIRED · PODCAST PRODUCTION INQUIRIES</p>
          <h2>{summary.uniqueOffices} {summary.uniqueOffices === 1 ? "congressional office has" : "congressional offices have"} inquired about podcast production.</h2>
        </div>
      </div>
      <p className="podcast-production-alert-names">{names.join(" · ")}
        {summary.uniqueOffices > names.length ? " · +" + (summary.uniqueOffices - names.length) + " more" : ""}
      </p>
      <p className="podcast-production-disclaimer">Office identity is self-reported and has not yet been independently verified. Private contact details remain in FiresideChat.</p>
      <Link className="podcast-production-alert-link" href={ADMIN_URL} target="_blank" rel="noopener noreferrer">
        Open protected inquiries in FiresideChat →
      </Link>
    </section>
  );
}
