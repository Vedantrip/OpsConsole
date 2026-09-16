import Link from "next/link";
import { AlertTriangle, ArrowRight, FileSpreadsheet, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";

function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }
function plural(count: number, noun: string) { return `${count} ${noun}${count === 1 ? "" : "s"}`; }

export default async function AdminDashboard() {
  const [active, campaignCount, brandCount, creatorCount, pending, invoices, payoutQueue, recentCreators] = await Promise.all([
    prisma.campaign.findMany({ where: { status: "ACTIVE" }, include: { brand: true, _count: { select: { deliverables: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.campaign.count(), prisma.brand.count(), prisma.creator.count(),
    prisma.payout.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PENDING" } }),
    prisma.invoice.aggregate({ _sum: { amount: true }, _count: true, where: { status: { in: ["SENT", "OVERDUE"] } } }),
    prisma.payout.findMany({ where: { status: "PENDING" }, take: 4, orderBy: { createdAt: "desc" }, include: { deliverable: { include: { creator: true, campaign: true } } } }),
    prisma.creator.findMany({ take: 4, orderBy: { createdAt: "desc" }, include: { _count: { select: { deliverables: true } } } }),
  ]);
  const payoutTotal = Number(pending._sum.amount ?? 0);
  const invoiceTotal = Number(invoices._sum.amount ?? 0);
  const activeBudget = active.reduce((sum, campaign) => sum + Number(campaign.budget), 0);
  const attention = pending._count + invoices._count;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operations & Finance</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Today&apos;s desk</h1>
          <p className="text-xs text-muted mt-0.5">
            {attention ? `${plural(attention, "financial item")} need attention.` : "All accounts and payouts are currently settled."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/campaigns" className="quick-link">
            <Plus size={13} />
            <span>Campaign</span>
          </Link>
          <Link href="/creators" className="quick-link">
            <Plus size={13} />
            <span>Creator</span>
          </Link>
          <Link href="/api/export/finance" className="quick-link" download>
            <FileSpreadsheet size={13} />
            <span>Export ledger</span>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <Link
          href="/finance?status=OUTSTANDING"
          className={`lg:col-span-4 card p-5 transition-colors ${
            payoutTotal > 0 ? "border-gold/50 bg-gold/[0.04]" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">Creator payouts to clear</p>
              <div className="text-2xl font-bold font-mono text-gold stat-number mt-2">
                {money(payoutTotal)}
              </div>
              <p className="text-xs text-muted mt-1.5">
                {pending._count ? `${plural(pending._count, "payout")} pending clearance` : "All payouts settled"}
              </p>
            </div>
            {payoutTotal > 0 && <AlertTriangle size={18} className="text-gold shrink-0 mt-0.5" />}
          </div>
        </Link>

        <Link
          href="/finance?status=OUTSTANDING"
          className="lg:col-span-3 card p-5 transition-colors"
        >
          <p className="text-xs font-medium text-muted">Client invoices open</p>
          <div className="text-2xl font-bold font-mono text-ink stat-number mt-2">
            {money(invoiceTotal)}
          </div>
          <p className="text-xs text-muted mt-1.5">
            {invoices._count ? `${plural(invoices._count, "invoice")} awaiting payment` : "No receivables open"}
          </p>
        </Link>

        <Link href="/campaigns" className="lg:col-span-2 card p-5 transition-colors">
          <p className="text-xs font-medium text-muted">Active campaigns</p>
          <div className="text-2xl font-bold font-mono text-ink stat-number mt-2">
            {active.length}
          </div>
          <p className="text-xs text-muted mt-1.5">{plural(campaignCount, "campaign")} total</p>
        </Link>

        <Link href="/creators" className="lg:col-span-3 card p-5 transition-colors">
          <p className="text-xs font-medium text-muted">Creator roster</p>
          <div className="text-2xl font-bold font-mono text-ink stat-number mt-2">
            {creatorCount}
          </div>
          <p className="text-xs text-muted mt-1.5">Across {plural(brandCount, "brand")}</p>
        </Link>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Active campaigns</h2>
              <p className="text-xs text-muted mt-0.5">{money(activeBudget)} currently committed</p>
            </div>
            <Link href="/campaigns" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {active.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No active campaigns running right now.</div>
            ) : (
              active.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="table-row flex items-center justify-between gap-4 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-xs text-ink truncate">{c.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {c.brand.name} • {plural(c._count.deliverables, "deliverable")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs text-gold font-semibold">{money(Number(c.budget))}</p>
                    <p className="text-[10px] text-muted uppercase">Budget</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="text-sm font-semibold text-ink">Payout queue</h2>
            <p className="text-xs text-muted mt-0.5">Items awaiting settlement</p>
          </div>
          {payoutQueue.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted">No creator payouts waiting.</div>
          ) : (
            <div className="divide-y divide-line">
              {payoutQueue.map((p) => (
                <Link
                  key={p.id}
                  href="/finance?status=OUTSTANDING"
                  className="table-row block px-5 py-3"
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{p.deliverable.creator.name}</p>
                      <p className="text-[11px] text-muted truncate mt-0.5">{p.deliverable.campaign.name}</p>
                    </div>
                    <p className="font-mono text-xs text-gold font-semibold shrink-0">
                      {money(Number(p.amount))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-line bg-paper/30">
            <Link href="/finance?status=OUTSTANDING" className="text-xs text-gold hover:underline font-medium">
              Review all payouts →
            </Link>
          </div>
        </aside>
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Recently Added Creators
          </h2>
          <Link href="/creators" className="text-xs text-gold hover:underline font-medium">
            Roster ({creatorCount}) →
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {recentCreators.map((creator) => (
            <Link
              key={creator.id}
              href={`/creators/${creator.id}`}
              className="text-xs hover:text-gold transition-colors py-1 inline-flex items-center gap-1.5"
            >
              <span className="font-medium text-ink">{creator.name}</span>
              <span className="text-muted font-mono text-[11px]">
                {creator.handle ? (creator.handle.startsWith("@") ? creator.handle : `@${creator.handle}`) : "no handle"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
