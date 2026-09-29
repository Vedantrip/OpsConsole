import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/access";
import { BRAND_TERMS_SECTIONS, BRAND_TERMS_VERSION } from "@/lib/brand-terms";
import { acceptBrandTerms } from "./actions";

function money(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function statusTone(status: string) {
  if (status === "ACTIVE" || status === "APPROVED") return "bg-gold/10 text-gold border-gold/30";
  if (status === "COMPLETE" || status === "LIVE") return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  if (status === "CANCELLED") return "bg-viz-rose/10 text-viz-rose border-viz-rose/30";
  return "bg-paper text-muted border-line";
}

export default async function BrandDashboardPage() {
  const context = await requireBrandContext();
  const brand = context.brand;

  const [campaigns, invoices, acceptance] = await Promise.all([
    prisma.campaign.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "desc" },
      include: {
        deliverables: {
          orderBy: { dueDate: "asc" },
          include: { creator: { select: { name: true, handle: true } } },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { brandId: brand.id },
      orderBy: { issuedAt: "desc" },
      take: 8,
      include: { campaign: { select: { name: true } } },
    }),
    prisma.brandTermsAcceptance.findUnique({
      where: { brandId_termsVersion: { brandId: brand.id, termsVersion: BRAND_TERMS_VERSION } },
    }),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const openDeliverables = campaigns.flatMap((c) => c.deliverables).filter((d) => !["APPROVED", "LIVE"].includes(d.status));
  const outstanding = invoices.filter((i) => i.status !== "PAID").reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="space-y-7 animate-fade-up">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">MountLift · Client Portal</p>
          <h1 className="font-display font-bold text-3xl">{brand.name}<span className="text-lift">.</span></h1>
          <p className="mt-2 text-sm text-muted">Your campaigns, creator work and billing — all in one place.</p>
        </div>
        <Link href="/messages" className="btn btn-small w-fit">Open messages</Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-5">
          <p className="text-xs text-muted">Active campaigns</p>
          <p className="mt-2 text-3xl font-bold font-mono text-gold">{activeCampaigns}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Open deliverables</p>
          <p className="mt-2 text-3xl font-bold font-mono text-ink">{openDeliverables.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-muted">Outstanding invoices</p>
          <p className="mt-2 text-2xl font-bold font-mono text-ink">{money(outstanding)}</p>
        </div>
      </div>

      {!acceptance && (
        <div className="card p-5 border-gold/30 bg-gold/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-gold">Action required · Terms v{BRAND_TERMS_VERSION}</p>
              <h2 className="mt-1 font-display font-semibold text-ink">Review and accept MountLift Brand Terms</h2>
              <p className="mt-1 text-xs text-muted">You need to accept the current terms before we treat this portal as your campaign workspace.</p>
            </div>
            <Link href="/brand/terms" className="btn btn-small w-fit">Review terms</Link>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Campaigns</h2>
          <span className="text-[11px] font-mono text-muted">{campaigns.length} total</span>
        </div>
        <div className="card divide-y divide-line overflow-hidden">
          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">Your MountLift campaigns will appear here.</div>
          ) : campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/brand/campaigns/${campaign.id}`} className="block px-5 py-4 hover:bg-paper/60 transition-colors">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{campaign.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusTone(campaign.status)}`}>{campaign.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{campaign.deliverables.length} deliverable{campaign.deliverables.length === 1 ? "" : "s"} · {campaign._count.messages} message{campaign._count.messages === 1 ? "" : "s"}</p>
                </div>
                <span className="text-xs font-semibold text-lift">View campaign →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Recent billing</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {invoices.length === 0 ? <div className="p-6 text-sm text-muted">No invoices yet.</div> : invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-xs">
              <div><p className="font-semibold text-ink">{invoice.campaign?.name ?? "MountLift services"}</p><p className="mt-0.5 text-muted font-mono">Issued {invoice.issuedAt.toLocaleDateString("en-IN")}</p></div>
              <div className="text-right"><p className="font-mono font-bold text-ink">{money(Number(invoice.amount))}</p><p className={`text-[10px] font-mono mt-0.5 ${invoice.status === "PAID" ? "text-emerald-600" : "text-gold"}`}>{invoice.status}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
