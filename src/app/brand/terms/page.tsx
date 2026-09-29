import Link from "next/link";
import { requireBrandContext } from "@/lib/access";
import { BRAND_TERMS_SECTIONS, BRAND_TERMS_VERSION } from "@/lib/brand-terms";
import { acceptBrandTerms } from "../actions";

export default async function BrandTermsPage() {
  const context = await requireBrandContext();
  const acceptance = await import("@/lib/prisma").then(({ prisma }) =>
    prisma.brandTermsAcceptance.findUnique({
      where: { brandId_termsVersion: { brandId: context.brand.id, termsVersion: BRAND_TERMS_VERSION } },
    })
  );

  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <Link href="/brand" className="text-xs text-muted hover:text-gold">← Back to portal</Link>
        <p className="eyebrow mt-5">MountLift · Brand Agreement</p>
        <h1 className="mt-1 text-3xl font-display font-semibold tracking-tight text-ink">Brand Terms & Conditions</h1>
        <p className="mt-2 text-sm text-muted">Version {BRAND_TERMS_VERSION} · Please review before accepting.</p>
      </div>

      <div className="space-y-4">
        {BRAND_TERMS_SECTIONS.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="font-display font-semibold text-ink">{section.title}</h2>
            <p className="text-sm text-muted leading-6 mt-2">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="card p-5 border-gold/30 bg-gold/5">
        {acceptance ? (
          <div>
            <p className="font-semibold text-ink">✓ Terms accepted</p>
            <p className="text-xs text-muted mt-1">Version {BRAND_TERMS_VERSION} accepted on {acceptance.acceptedAt.toLocaleString("en-IN")}.</p>
          </div>
        ) : (
          <form action={acceptBrandTerms}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input name="accepted" type="checkbox" required className="mt-0.5 h-4 w-4 accent-[var(--gold)]" />
              <span className="text-sm text-ink leading-6">I have read and understood these Brand Terms & Conditions and agree to them on behalf of my organization.</span>
            </label>
            <button type="submit" className="btn mt-4">I accept these terms</button>
          </form>
        )}
      </div>

      <p className="text-xs text-muted leading-5">Please have your legal counsel review the final commercial agreement where appropriate. Campaign-specific terms may supplement these terms.</p>
    </div>
  );
}
