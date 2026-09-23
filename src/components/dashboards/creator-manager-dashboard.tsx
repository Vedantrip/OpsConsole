import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, ChevronRight, Clapperboard, Clock3, Sparkles } from "lucide-react";
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
        creator: { select: { id: true, name: true } },
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
    <div className="space-y-8 animate-fade-up">
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Creative studio</p>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-ink">What&apos;s in motion</h1>
            <p className="text-sm text-muted mt-1">
              {openDeliverables
                ? `${openDeliverables} deliverable${openDeliverables === 1 ? "" : "s"} actively in production across brand collaborations.`
                : "All creator collaborations and content deliveries are up to date."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/creators"
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-line hover:bg-paper transition-colors text-ink"
            >
              Explore creators
            </Link>
            <Link
              href="/insights"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md bg-ink text-paper hover:bg-charcoal transition-colors"
            >
              <BarChart3 size={14} />
              Performance intelligence
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
        <Metric
          label="Creators in focus"
          value={creators.length}
          note="Active creator partnerships"
          wide
        />
        <Metric
          label="In production"
          value={openDeliverables}
          note="Deliverables currently being crafted"
          lift
        />
        <Metric
          label="Due this week"
          value={dueSoon}
          note="Landing in the next 7 days"
          alert={dueSoon > 0}
        />
        <Metric
          label="Audited & ready"
          value={igReady}
          note="Profiles with performance data ready"
          lift
        />
      </div>

      {/* Daily AI Trending Topics Radar */}
      <section className="space-y-3">
        <AITrendingHub />
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow">Content timeline</p>
            <h2 className="text-base font-display font-semibold text-ink">Upcoming deliverables</h2>
          </div>
          <Link href="/campaigns" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium w-fit">
            Explore campaigns <ArrowRight size={12} />
          </Link>
        </div>
        <div className="card overflow-hidden">
          {deliverables.length === 0 ? (
            <div className="p-8 text-center">
              <Clapperboard size={24} className="mx-auto text-gold mb-3 opacity-60" />
              <p className="text-sm font-medium text-ink">All caught up! No open deliverables right now.</p>
              <p className="text-xs text-muted mt-1">When new campaigns kick off, upcoming deliverables will land right here.</p>
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
                      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-md bg-paper border border-line text-muted flex items-center justify-center">
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
                          {d.campaign.brand.name}
                        </p>
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-mono mt-1.5 ${
                            overdue ? "text-viz-rose font-medium" : "text-muted"
                          }`}
                        >
                          <CalendarDays size={12} />
                          {dueLabel(d.dueDate)}
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
            <div className="px-5 py-2.5 border-t border-line bg-paper/50 flex items-center gap-2 text-[11px] text-muted font-mono">
              <Clock3 size={13} />
              Showing the next {deliverables.length} upcoming deliverable{deliverables.length === 1 ? "" : "s"}, ordered by deadline.
            </div>
          )}
        </div>
      </section>

      <Link
        href="/insights"
        className="card p-5 flex items-center justify-between hover:border-gold transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-paper border border-line text-gold">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink group-hover:text-gold transition-colors">
              Explore creator performance intelligence
            </div>
            <div className="text-xs text-muted">
              Analyze engagement rates, view patterns, and audience demographics across your creators
            </div>
          </div>
        </div>
        <ArrowRight size={16} className="text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-paper/30">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted">Team briefs & notes</h2>
            <span className="text-[10px] font-mono text-muted">DIRECT</span>
          </div>
          {updates.length === 0 ? (
            <p className="p-5 text-sm text-muted">No active briefs or notes right now.</p>
          ) : (
            <div className="divide-y divide-line">
              {updates.map((u) => (
                <article key={u.id} className="px-5 py-3.5">
                  <h3 className="text-sm font-medium text-ink">{u.title}</h3>
                  <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{u.body}</p>
                  <time className="text-[10px] font-mono text-muted mt-2 block">{u.createdAt.toLocaleDateString()}</time>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-semibold text-ink">Featured creators</h2>
            <Link href="/creators" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium">
              View all {creators.length} creators <ArrowRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {creators.length === 0 ? (
              <div className="col-span-full card p-6 text-center text-sm text-muted">
                No creators in your circle yet.
              </div>
            ) : (
              creators.slice(0, 6).map((c) => {
                const insight = c.insights[0];
                return (
                  <Link
                    key={c.id}
                    href={`/creators/${c.id}`}
                    className="card p-4 flex flex-col justify-between hover:border-gold transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-paper border border-line text-ink flex items-center justify-center font-display font-semibold text-xs uppercase">
                        {c.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                        <div className="text-xs text-muted font-mono truncate">
                          {c.handle ? (c.handle.startsWith("@") ? c.handle : `@${c.handle}`) : "No handle"}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                      <span className="text-muted">{c._count.deliverables} in progress</span>
                      <span className={insight ? "text-gold font-medium" : "text-muted"}>
                        {insight?.engagementRate != null
                          ? `${insight.engagementRate.toFixed(1)}% ER`
                          : insight
                          ? "Audited"
                          : "No audit"}
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
}: {
  label: string;
  value: number;
  note: string;
  lift?: boolean;
  alert?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`card p-5 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <div className="text-xs text-muted font-medium mb-1">{label}</div>
      <div className={`font-display font-semibold stat-number ${wide ? "text-3xl" : "text-2xl"} ${alert ? "text-viz-rose" : lift ? "text-gold" : "text-ink"}`}>{value}</div>
      <div className="text-[11px] text-muted mt-1">{note}</div>
    </div>
  );
}
