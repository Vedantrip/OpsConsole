import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CampaignForm from "./campaign-form";
import DeleteButton from "@/components/delete-button";
import { deleteCampaign } from "./actions";
import { requireAccess } from "@/lib/require-access";
import { canSeeMoney } from "@/lib/roles";
import { CampaignStatus } from "@prisma/client";
import { requireContext, brandScope, campaignScope } from "@/lib/access";

function money(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function statusPill(status: CampaignStatus) {
  switch (status) {
    case "ACTIVE": return "bg-gold/10 text-gold border-gold/30";
    case "PLANNING": return "bg-paper text-ink border-line";
    case "COMPLETE": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "CANCELLED": return "bg-viz-rose/10 text-viz-rose border-viz-rose/30";
    default: return "bg-paper text-muted border-line";
  }
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const role = await requireAccess("/campaigns");
  const context = await requireContext();
  const showMoney = canSeeMoney(role);

  const query = searchParams?.q?.trim() ?? "";
  const statusFilter = searchParams?.status?.trim() ?? "";

  const whereClause: any = { ...campaignScope(context) };
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { brand: { name: { contains: query, mode: "insensitive" } } },
    ];
  }
  if (statusFilter && Object.values(CampaignStatus).includes(statusFilter as CampaignStatus)) {
    whereClause.status = statusFilter;
  }

  const [campaigns, brands, activeCount, totalBudget] = await Promise.all([
    prisma.campaign.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        brand: true,
        _count: { select: { deliverables: true } },
        invoices: true,
        deliverables: { include: { payouts: true } },
      },
    }),
    context.role === "ADMIN" ? prisma.brand.findMany({ where: brandScope(context), orderBy: { name: "asc" } }) : Promise.resolve([]),
    prisma.campaign.count({ where: { ...campaignScope(context), status: "ACTIVE" } }),
    showMoney ? prisma.campaign.aggregate({ where: campaignScope(context), _sum: { budget: true } }) : Promise.resolve({ _sum: { budget: null } }),
  ]);

  const hasFilter = Boolean(query || statusFilter);

  return (
    <div className="space-y-6">
      {role === "ADMIN" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-0.5">Campaigns</h1>
          <p className="text-xs text-muted">Every campaign, linked to its brand and deliverables.</p>
        </div>
      )}
      {role === "CREATOR_MANAGER" && (
        <div>
          <p className="eyebrow">Roster work</p>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-0.5">Assigned campaigns</h1>
          <p className="text-xs text-muted">Only campaigns with deliverables assigned to your creators are shown here.</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-medium mb-1">Active Campaigns</div>
            <div className="text-2xl font-bold font-mono text-gold stat-number">{activeCount}</div>
          </div>
          <div className="p-2.5 rounded bg-gold/10 border border-gold/20 text-gold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        {showMoney && (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted font-medium mb-1">Total Allocated Budget</div>
              <div className="text-2xl font-bold font-mono text-ink stat-number">
                {money(Number(totalBudget._sum.budget ?? 0))}
              </div>
            </div>
            <div className="p-2.5 rounded bg-paper border border-line text-muted">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        )}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-medium mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold font-mono text-ink stat-number">{campaigns.length}</div>
          </div>
          <div className="p-2.5 rounded bg-paper border border-line text-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      {role === "ADMIN" && (
        <div className="card p-5 space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-0.5">Create Campaign</h2>
            <p className="text-xs text-muted">
              Pick a brand and campaign name first, then fill budget and details after saving.
            </p>
          </div>
          <CampaignForm brands={brands} showBudget={showMoney} />
        </div>
      )}

      <form method="GET" className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input name="q" defaultValue={query} placeholder="Search campaign name or brand…" className="input text-xs pl-8" />
          <svg className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select name="status" defaultValue={statusFilter} className="input text-xs w-36">
          <option value="">All Statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETE">Complete</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button type="submit" className="btn btn-small">Filter</button>
        {hasFilter && <Link href="/campaigns" className="text-xs text-muted hover:text-gold underline px-1">Clear</Link>}
      </form>

      <div className="card divide-y divide-line overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {hasFilter ? "No campaigns match your filter criteria." : "No campaigns yet — add one above."}
          </div>
        ) : (
          campaigns.map((c) => {
            const totalInvoiced = c.invoices.reduce((s, i) => s + Number(i.amount), 0);
            const totalPayouts = c.deliverables.reduce(
              (s, d) => s + d.payouts.reduce((ps, p) => ps + Number(p.amount), 0),
              0
            );
            const profit = totalInvoiced - totalPayouts;

            return (
              <div key={c.id} className="table-row flex items-center justify-between px-5 py-4 text-xs group">
                <Link href={`/campaigns/${c.id}`} className="flex-1 min-w-0 pr-4">
                  <div className="font-semibold text-ink group-hover:text-gold transition-colors flex items-center gap-2">
                    <span className="truncate">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusPill(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-muted text-[11px] flex items-center gap-2 mt-1 font-mono">
                    <span>Brand: {c.brand.name}</span>
                    <span>•</span>
                    <span>{c._count.deliverables} deliverable{c._count.deliverables === 1 ? "" : "s"}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-5 shrink-0">
                  {showMoney ? (
                    <div className="text-right font-mono">
                      <div className="text-gold font-bold text-sm">{money(Number(c.budget))}</div>
                      <div className={`text-[11px] ${profit >= 0 ? "text-muted" : "text-viz-rose"}`}>
                        {profit >= 0 ? "+" : ""}{money(profit)} profit
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted font-mono">{c._count.deliverables} deliverables</div>
                  )}
                  {role === "ADMIN" && (
                    <DeleteButton
                      onDelete={deleteCampaign.bind(null, c.id)}
                      confirmMessage={`Remove ${c.name}? This also removes its ${c._count.deliverables} deliverable${c._count.deliverables === 1 ? "" : "s"} and any payouts/invoices tied to it.`}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
