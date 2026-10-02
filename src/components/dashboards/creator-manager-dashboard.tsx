import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, ChevronRight, Clapperboard, Clock3, Sparkles, Users, Layers, Award, TrendingUp, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireContext, creatorScope } from "@/lib/access";
import AITrendingHub from "@/components/content/ai-trending-hub";

const statusStyles = {
  PLANNED: "border-line bg-paper text-muted",
  IN_PROGRESS: "border-gold/30 bg-gold/10 text-gold",
  SUBMITTED: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  LIVE: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
} as const;

const statusLabels = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  LIVE: "Live",
} as const;

function typeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function dueLabel(date: Date | null) {
  if (!date) return "No due date set";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export default async function CreatorManagerDashboard() {
  const context = await requireContext();
  const creatorWhere = creatorScope(context);
  const [creators, updates, deliverables] = await Promise.all([
    prisma.creator.findMany({
      where: creatorWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { deliverables: true } },
        insights: { take: 1, orderBy: { createdAt: "desc" }, select: { engagementRate: true } },
      },
    }),
    prisma.managerUpdate.findMany({
      where: { targetClerkUserId: context.clerkUserId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.deliverable.findMany({
      where: { creator: creatorWhere },
      include: {
        creator: { select: { id: true, name: true, handle: true } },
        campaign: { select: { id: true, name: true, brand: { select: { name: true } } } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const igReady = creators.filter((c) => c.handle && (!c.platform || c.platform.toLowerCase().includes("insta"))).length;
  const openDeliverables = deliverables.filter((d) => !["LIVE", "APPROVED"].includes(d.status)).length;
  const dueSoon = deliverables.filter(
    (d) => d.dueDate && !["LIVE", "APPROVED"].includes(d.status) && (d.dueDate.getTime() - Date.now()) / 86_400_000 <= 7
  ).length;

  return (
    <div className="space-y-8 animate-fade-up relative">
      {/* Subtle Background Pattern & Ambient Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-60 dark:opacity-30">
        <div
          className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-gold/10 blur-3xl"
        />
        <div
          className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl"
        />
        <svg
          className="absolute inset-0 w-full h-full stroke-line/40 [mask-image:radial-gradient(ellipse_at_top,white,transparent_75%)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="creator-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M0 32V.5H32" fill="none" strokeWidth="0.75" strokeDasharray="2 2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#creator-grid-pattern)" />
        </svg>
      </div>

      {/* Hero Header */}
      <div className="card p-6 border-line/80 bg-paper/70 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-gold/5 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow mb-0">Creative Studio & Roster</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="text-[10px] font-mono text-muted uppercase">Ops Console v2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-ink">
              What&apos;s in motion
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
              {openDeliverables
                ? `${openDeliverables} deliverable${openDeliverables === 1 ? "" : "s"} actively in production across brand partnerships.`
                : "All creator collaborations, content reviews, and deliverables are up to date."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/creators"
              className="btn btn-secondary btn-small flex items-center gap-1.5"
            >
              <Users size={13} />
              <span>Explore Roster ({creators.length})</span>
            </Link>
            <Link
              href="/insights"
              className="btn btn-primary btn-small flex items-center gap-1.5"
            >
              <BarChart3 size={13} />
              <span>Performance Radar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          label="Creators in Focus"
          value={creators.length}
          note="Active roster partnerships"
          icon={<Users size={16} className="text-gold" />}
          wide
        />
        <Metric
          label="In Production"
          value={openDeliverables}
          note="Deliverables being crafted"
          icon={<Clapperboard size={16} className="text-gold" />}
          lift
        />
        <Metric
          label="Due This Week"
          value={dueSoon}
          note="Landing in next 7 days"
          icon={<CalendarDays size={16} className={dueSoon > 0 ? "text-viz-rose" : "text-gold"} />}
          alert={dueSoon > 0}
        />
        <Metric
          label="Graph API Verified"
          value={igReady}
          note="Profiles with active intelligence"
          icon={<Award size={16} className="text-emerald-500" />}
          lift
        />
      </div>

      {/* Daily AI Trending Topics Radar */}
      <section className="space-y-3">
        <AITrendingHub />
      </section>

      {/* Upcoming Deliverables Section */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow">Production Timeline</p>
            <h2 className="text-base font-display font-semibold text-ink">Upcoming Deliverables</h2>
          </div>
          <Link href="/campaigns" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium w-fit">
            <span>Explore all campaigns</span> <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card overflow-hidden bg-paper/50 backdrop-blur-sm border-line">
          {deliverables.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 size={24} className="mx-auto text-gold mb-2 opacity-70" />
              <p className="text-sm font-semibold text-ink">All caught up! No pending deliverables.</p>
              <p className="text-xs text-muted">When new brand campaigns kick off, upcoming deliverables will land right here.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {deliverables.map((d) => {
                const overdue = d.dueDate && d.dueDate.getTime() < Date.now() && !["LIVE", "APPROVED"].includes(d.status);
                return (
                  <Link
                    key={d.id}
                    href={`/campaigns/${d.campaign.id}`}
                    className="group block px-4 py-3.5 sm:px-5 hover:bg-paper/80 transition-colors"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-paper border border-line text-muted flex items-center justify-center group-hover:border-gold/40 group-hover:text-gold transition-colors">
                        <Clapperboard size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium text-ink">{typeLabel(d.type)}</span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${statusStyles[d.status]}`}>
                            {statusLabels[d.status]}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 truncate">
                          <span className="text-ink font-medium">{d.creator.name}</span>
                          <span className="mx-1.5 text-line">·</span>
                          {d.campaign.name}
                          <span className="mx-1.5 text-line">·</span>
                          <span className="text-muted">{d.campaign.brand.name}</span>
                        </p>
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-mono mt-1.5 ${
                            overdue ? "text-viz-rose font-medium" : "text-muted"
                          }`}
                        >
                          <CalendarDays size={12} />
                          <span>{dueLabel(d.dueDate)}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className="text-muted mt-2 shrink-0 group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {deliverables.length > 0 && (
            <div className="px-5 py-2.5 border-t border-line bg-paper/40 flex items-center gap-2 text-[11px] text-muted font-mono">
              <Clock3 size={13} />
              <span>Showing next {deliverables.length} upcoming deliverable{deliverables.length === 1 ? "" : "s"}, ordered by deadline.</span>
            </div>
          )}
        </div>
      </section>

      {/* Quick Links & Team Briefs Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="card overflow-hidden xl:col-span-2 bg-paper/50 backdrop-blur-sm">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-paper/30">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium">Team Briefs & Notes</h2>
            <span className="text-[10px] font-mono text-muted bg-paper px-2 py-0.5 rounded border border-line">DIRECT</span>
          </div>
          {updates.length === 0 ? (
            <p className="p-6 text-sm text-muted text-center">No active briefs or notes right now.</p>
          ) : (
            <div className="divide-y divide-line">
              {updates.map((u) => (
                <article key={u.id} className="px-5 py-3.5 space-y-1">
                  <h3 className="text-sm font-semibold text-ink">{u.title}</h3>
                  <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">{u.body}</p>
                  <time className="text-[10px] font-mono text-muted block pt-1">{u.createdAt.toLocaleDateString()}</time>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-semibold text-ink">Featured Creators</h2>
            <Link href="/creators" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium">
              <span>View all {creators.length} creators</span> <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creators.length === 0 ? (
              <div className="col-span-full card p-6 text-center text-sm text-muted">
                No creators in your roster yet.
              </div>
            ) : (
              creators.slice(0, 6).map((c) => {
                const insight = c.insights[0];
                return (
                  <Link
                    key={c.id}
                    href={`/creators/${c.id}`}
                    className="card p-4 flex flex-col justify-between hover:border-gold/50 hover:shadow-sm transition-all duration-200 bg-paper/40 hover:bg-paper/70"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 text-gold flex items-center justify-center font-display font-semibold text-xs uppercase shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{c.name}</div>
                        <div className="text-xs text-muted font-mono truncate">
                          {c.handle ? (c.handle.startsWith("@") ? c.handle : `@${c.handle}`) : "No handle"}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                      <span className="text-muted">{c._count.deliverables} active</span>
                      <span className={insight ? "text-gold font-medium" : "text-muted"}>
                        {insight?.engagementRate != null
                          ? `${insight.engagementRate.toFixed(1)}% ER`
                          : "Ready"}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  lift,
  alert,
  wide,
  icon,
}: {
  label: string;
  value: number;
  note: string;
  lift?: boolean;
  alert?: boolean;
  wide?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`card p-5 border-line bg-paper/50 backdrop-blur-sm flex flex-col justify-between ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted font-medium">{label}</span>
        {icon}
      </div>
      <div className={`font-display font-semibold stat-number ${wide ? "text-3xl" : "text-2xl"} ${alert ? "text-viz-rose" : lift ? "text-gold" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted mt-1 truncate">{note}</div>
    </div>
  );
}
