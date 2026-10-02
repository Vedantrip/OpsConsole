import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  PieChart,
  ShieldCheck,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireContext, campaignScope } from "@/lib/access";

const statusTone = {
  PLANNED: "text-muted border-line bg-paper",
  IN_PROGRESS: "text-gold border-gold/30 bg-gold/10 font-semibold",
  SUBMITTED: "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10",
  APPROVED: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  LIVE: "text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
} as const;

function dateText(date: Date | null) {
  if (!date) return "No date set";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function dueText(date: Date | null) {
  if (!date) return "No deadline set";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(date); due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${dateText(date)}`;
}

export default async function AccountManagerDashboard() {
  const context = await requireContext();
  const campaigns = await prisma.campaign.findMany({
    where: campaignScope(context),
    orderBy: [{ status: "asc" }, { endDate: { sort: "asc", nulls: "last" } }],
    include: {
      brand: { select: { id: true, name: true, contactName: true, contactEmail: true } },
      deliverables: {
        include: {
          creator: { select: { id: true, name: true, handle: true, platform: true } },
          payouts: { select: { amount: true, status: true } },
        },
      },
    },
  });

  const deliverables = campaigns.flatMap((campaign) =>
    campaign.deliverables.map((deliverable) => ({ ...deliverable, campaign }))
  );

  const completed = deliverables.filter((d) => ["APPROVED", "LIVE"].includes(d.status)).length;
  const inReview = deliverables.filter((d) => d.status === "SUBMITTED").length;
  const active = deliverables.filter((d) => !["APPROVED", "LIVE"].includes(d.status)).length;
  const totalBudget = campaigns.reduce((total, campaign) => total + Number(campaign.budget), 0);
  const totalSpendCommitted = deliverables.reduce(
    (sum, d) => sum + Number(d.agreedRate || 0),
    0
  );

  // Group by Brand for Brand Portfolio & Budget Utilization
  const brandMap = new Map<string, {
    brandId: string;
    brandName: string;
    contactName: string | null;
    campaigns: typeof campaigns;
    totalBudget: number;
    spendCommitted: number;
    totalDeliverables: number;
    completedDeliverables: number;
  }>();

  for (const c of campaigns) {
    const existing = brandMap.get(c.brand.id) || {
      brandId: c.brand.id,
      brandName: c.brand.name,
      contactName: c.brand.contactName,
      campaigns: [],
      totalBudget: 0,
      spendCommitted: 0,
      totalDeliverables: 0,
      completedDeliverables: 0,
    };
    existing.campaigns.push(c);
    existing.totalBudget += Number(c.budget);
    const campaignDeliverables = c.deliverables;
    existing.totalDeliverables += campaignDeliverables.length;
    existing.completedDeliverables += campaignDeliverables.filter((d) =>
      ["APPROVED", "LIVE"].includes(d.status)
    ).length;
    existing.spendCommitted += campaignDeliverables.reduce((s, d) => s + Number(d.agreedRate || 0), 0);
    brandMap.set(c.brand.id, existing);
  }

  // Creator Map
  const creatorMap = new Map<string, {
    id: string;
    name: string;
    handle: string | null;
    campaignNames: Set<string>;
    deliverableCount: number;
  }>();

  for (const d of deliverables) {
    const creator = creatorMap.get(d.creator.id) ?? {
      id: d.creator.id,
      name: d.creator.name,
      handle: d.creator.handle,
      campaignNames: new Set<string>(),
      deliverableCount: 0,
    };
    creator.campaignNames.add(d.campaign.name);
    creator.deliverableCount += 1;
    creatorMap.set(d.creator.id, creator);
  }

  // At-Risk & Upcoming Deliverables
  const atRisk = deliverables.filter(
    (d) => d.dueDate && !["APPROVED", "LIVE"].includes(d.status) && d.dueDate.getTime() < Date.now()
  );
  const upcoming = deliverables
    .filter((d) => d.dueDate && !["APPROVED", "LIVE"].includes(d.status))
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 6);

  const deliveryRate = deliverables.length
    ? Math.round((completed / deliverables.length) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fade-up relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
        <div className="absolute -top-32 right-10 w-96 h-96 rounded-full bg-gold/15 blur-3xl" />
        <svg
          className="absolute inset-0 w-full h-full stroke-line/40 [mask-image:radial-gradient(ellipse_at_top,white,transparent_70%)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="brands-grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M0 28V.5H28" fill="none" strokeWidth="0.75" strokeDasharray="1 3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#brands-grid-pattern)" />
        </svg>
      </div>

      {/* Hero Header */}
      <div className="card p-6 bg-paper/70 backdrop-blur-sm border-line/80 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow mb-0">Client Portfolio Management</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="text-[10px] font-mono text-muted uppercase">Executive Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-ink">
              Brand Accounts & Delivery Pulse
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
              Track multi-brand campaign progress, client budget pacing, and creator delivery milestones across your active account portfolio.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/brands"
              className="btn btn-secondary btn-small flex items-center gap-1.5"
            >
              <Building2 size={13} />
              <span>All Brands ({brandMap.size})</span>
            </Link>
            <Link
              href="/campaigns"
              className="btn btn-primary btn-small flex items-center gap-1.5"
            >
              <Briefcase size={13} />
              <span>All Campaigns ({campaigns.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 bg-paper/50 backdrop-blur-sm border-line flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">Managed Portfolio Budget</span>
            <Building2 size={16} className="text-gold" />
          </div>
          <div className="text-2xl font-display font-semibold text-gold stat-number">
            ₹{totalBudget.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted mt-1 truncate">
            ₹{totalSpendCommitted.toLocaleString("en-IN")} committed across {campaigns.length} campaigns
          </div>
        </div>

        <div className="card p-5 bg-paper/50 backdrop-blur-sm border-line flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">Delivery Completion</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-display font-semibold text-ink stat-number flex items-baseline gap-2">
            <span>{deliveryRate}%</span>
            <span className="text-xs font-mono text-muted font-normal">({completed}/{deliverables.length})</span>
          </div>
          <div className="text-[11px] text-muted mt-1 truncate">
            {active} deliverables actively in progress
          </div>
        </div>

        <div className="card p-5 bg-paper/50 backdrop-blur-sm border-line flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">Active Collaborators</span>
            <Users size={16} className="text-gold" />
          </div>
          <div className="text-2xl font-display font-semibold text-ink stat-number">
            {creatorMap.size}
          </div>
          <div className="text-[11px] text-muted mt-1 truncate">
            Creators engaged across accounts
          </div>
        </div>

        <div className="card p-5 bg-paper/50 backdrop-blur-sm border-line flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">At-Risk / Overdue</span>
            <AlertTriangle size={16} className={atRisk.length > 0 ? "text-viz-rose" : "text-emerald-500"} />
          </div>
          <div className={`text-2xl font-display font-semibold stat-number ${atRisk.length > 0 ? "text-viz-rose" : "text-emerald-600 dark:text-emerald-400"}`}>
            {atRisk.length}
          </div>
          <div className="text-[11px] text-muted mt-1 truncate">
            {atRisk.length > 0 ? "Immediate attention required" : "100% on schedule"}
          </div>
        </div>
      </div>

      {/* Brand Budget Utilization & Financial Velocity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Financial Velocity</p>
            <h2 className="text-base font-display font-semibold text-ink">Brand Budget Pacing & Allocation</h2>
          </div>
          <span className="text-xs font-mono text-muted">{brandMap.size} active brand client{brandMap.size === 1 ? "" : "s"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brandMap.size === 0 ? (
            <div className="col-span-full card p-8 text-center text-sm text-muted">
              No brand accounts assigned yet.
            </div>
          ) : (
            Array.from(brandMap.values()).map((b) => {
              const utilPct = b.totalBudget > 0 ? Math.min(100, Math.round((b.spendCommitted / b.totalBudget) * 100)) : 0;
              const delivProgress = b.totalDeliverables > 0 ? Math.round((b.completedDeliverables / b.totalDeliverables) * 100) : 0;

              return (
                <div key={b.brandId} className="card p-5 bg-paper/50 backdrop-blur-sm border-line hover:border-gold/40 transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink truncate">{b.brandName}</h3>
                        <p className="text-[11px] text-muted font-mono mt-0.5">
                          {b.campaigns.length} campaign{b.campaigns.length === 1 ? "" : "s"} · {b.totalDeliverables} deliverable{b.totalDeliverables === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper border border-line text-muted uppercase">
                        Client
                      </span>
                    </div>

                    {/* Spend Pacing Bar */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-muted">
                        <span>Budget Pacing</span>
                        <span className="text-ink font-medium">₹{b.spendCommitted.toLocaleString("en-IN")} / ₹{b.totalBudget.toLocaleString("en-IN")} ({utilPct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${utilPct > 90 ? "bg-viz-rose" : "bg-gold"}`}
                          style={{ width: `${utilPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Deliverable Progress Bar */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-muted">
                        <span>Content Delivery</span>
                        <span className="text-ink font-medium">{b.completedDeliverables}/{b.totalDeliverables} ({delivProgress}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${delivProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted">
                      {b.totalBudget - b.spendCommitted >= 0
                        ? `₹${(b.totalBudget - b.spendCommitted).toLocaleString("en-IN")} remaining`
                        : "Budget exceeded"}
                    </span>
                    <Link
                      href="/campaigns"
                      className="text-gold hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Campaigns</span> <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Main Delivery & Creators Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left 3 cols: Upcoming Deliverables */}
        <section className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Timeline & Milestones</p>
              <h2 className="text-base font-display font-semibold text-ink">Upcoming Deliverables</h2>
            </div>
            <span className="text-xs text-muted font-mono">{upcoming.length} scheduled</span>
          </div>

          <div className="card overflow-hidden bg-paper/50 backdrop-blur-sm border-line">
            {upcoming.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 size={22} className="mx-auto text-gold mb-2 opacity-60" />
                <p className="text-sm font-semibold text-ink">All campaign deliverables are up to date</p>
                <p className="text-xs text-muted">Upcoming creator deadlines will appear here once scheduled.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {upcoming.map((d) => {
                  const overdue = d.dueDate && d.dueDate.getTime() < Date.now();
                  return (
                    <Link
                      key={d.id}
                      href={`/campaigns/${d.campaign.id}`}
                      className="group block px-5 py-3.5 hover:bg-paper/80 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-md bg-paper border border-line text-muted flex items-center justify-center shrink-0 group-hover:border-gold/40 group-hover:text-gold transition-colors">
                          <CalendarDays size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm font-semibold text-ink">
                              {d.type.charAt(0) + d.type.slice(1).toLowerCase()} by {d.creator.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${statusTone[d.status]}`}>
                              {d.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5 truncate">
                            <span className="font-medium text-ink">{d.campaign.brand.name}</span>
                            <span className="mx-1 text-line">·</span>
                            <span>{d.campaign.name}</span>
                          </p>
                          <p className={`text-[11px] font-mono mt-1.5 ${overdue ? "text-viz-rose font-semibold" : "text-muted"}`}>
                            {dueText(d.dueDate)}
                          </p>
                        </div>
                        <ArrowRight size={15} className="mt-2 text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right 2 cols: Collaborating Creators */}
        <section className="xl:col-span-2 space-y-3">
          <div>
            <p className="eyebrow">Talent Execution</p>
            <h2 className="text-base font-display font-semibold text-ink">Creators on Your Accounts</h2>
          </div>

          <div className="card divide-y divide-line overflow-hidden bg-paper/50 backdrop-blur-sm">
            {creatorMap.size === 0 ? (
              <p className="p-6 text-center text-sm text-muted">
                Creator assignments will appear once deliverables are scheduled.
              </p>
            ) : (
              Array.from(creatorMap.values()).slice(0, 7).map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creators/${creator.id}`}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-paper/70 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 text-gold flex items-center justify-center font-display font-semibold text-xs uppercase shrink-0">
                      {creator.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">{creator.name}</p>
                      <p className="text-[11px] text-muted font-mono truncate">
                        {creator.handle ? (creator.handle.startsWith("@") ? creator.handle : `@${creator.handle}`) : "No handle"} · {creator.deliverableCount} deliverable{creator.deliverableCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted group-hover:text-ink shrink-0" />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
