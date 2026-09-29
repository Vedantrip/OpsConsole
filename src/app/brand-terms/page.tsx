"use client";

import Link from "next/link";
import { BRAND_TERMS_SECTIONS, BRAND_TERMS_VERSION } from "@/lib/brand-terms";

export default function BrandTermsPage() {
  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <Link href="/brands" className="text-xs text-muted hover:text-gold">← Back to Brands</Link>
        <div className="eyebrow mt-5">MountLift · Brand Agreement</div>
        <h1 className="text-3xl font-display font-semibold tracking-tight text-ink mt-1">Brand Terms & Conditions</h1>
        <p className="text-sm text-muted mt-2">Version {BRAND_TERMS_VERSION} · Please review these terms before accepting a campaign relationship with MountLift.</p>
      </div>

      <div className="card p-5 border-gold/20 bg-gold/5">
        <p className="text-sm text-ink leading-6">
          These terms cover campaign payments, Creator deliverables, content licensing, cancellations, taxes,
          confidentiality, liability, disputes and other commercial campaign conditions.
        </p>
      </div>

      <div className="space-y-4">
        {BRAND_TERMS_SECTIONS.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="font-display font-semibold text-ink">{section.title}</h2>
            <p className="text-sm text-muted leading-6 mt-2">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted leading-5">
        This page is a readable summary of the current MountLift Brand Terms. The full commercial agreement and
        campaign-specific terms may contain additional provisions. Have your legal counsel review the final
        agreement before relying on it for commercial transactions.
      </p>
    </div>
  );
}
