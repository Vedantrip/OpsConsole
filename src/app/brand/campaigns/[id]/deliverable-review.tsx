"use client";

import { useState } from "react";
import { reviewDeliverable } from "./actions";

export default function DeliverableReview({ deliverableId, status, feedback }: { deliverableId: string; status: string; feedback: string | null }) {
  const [revision, setRevision] = useState(false);

  if (status === "APPROVED") {
    return <span className="text-[11px] text-emerald-600 font-medium">✓ Approved</span>;
  }

  return (
    <div className="w-full sm:w-auto">
      {revision ? (
        <form action={async (formData) => { await reviewDeliverable(deliverableId, formData); setRevision(false); }} className="space-y-2 sm:min-w-[280px]">
          <input type="hidden" name="status" value="IN_PROGRESS" />
          <textarea name="feedback" required maxLength={1000} defaultValue={feedback ?? ""} placeholder="Tell the creator what needs changing…" className="input min-h-20 resize-none text-xs" />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-small">Request changes</button>
            <button type="button" onClick={() => setRevision(false)} className="text-xs text-muted hover:text-ink px-2">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={async (formData) => { await reviewDeliverable(deliverableId, formData); }}>
            <input type="hidden" name="status" value="APPROVED" />
            <button className="btn btn-small" type="submit">Approve</button>
          </form>
          <button type="button" onClick={() => setRevision(true)} className="btn btn-secondary btn-small">Request changes</button>
        </div>
      )}
    </div>
  );
}
