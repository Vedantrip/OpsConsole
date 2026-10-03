import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Clock3,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  Zap,
  Flame,
  Rocket,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireContext, creatorScope } from "@/lib/access";
import AITrendingHub from "@/components/content/ai-trending-hub";
import CreatorVibeStudio from "@/components/content/creator-vibe-studio";

const statusStyles = {
  PLANNED: "border-line bg-paper text-muted",
  IN_PROGRESS: "border-gold/30 bg-gold/10 text-gold",
  SUBMITTED: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  LIVE: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
} as const;

const statusLabels = {
  PLANNED: "🎯 Briefed",
  IN_PROGRESS: "🎬 Filming",
  SUBMITTED: "✨ In Review",
  APPROVED: "💎 Approved",
  LIVE: "🚀 Live / Paid 💸",
} as const;

function typeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function dueLabel(date: Date | null) {
  if (!date) return "No deadline set";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "🔥 Due Today";
  if (days === 1) return "⚡ Due Tomorrow";
  if (days < 0) return `⚠️ ${Math.abs(days)}d Overdue`;
  if (days <= 7) return `Landing in ${days} days`;
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
        insights: { take: 1, orderBy: { createdAt: "desc" }, select: { engagementRate: true, overallScore: true } },
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
        creator: { select: { id: true, name: true, handle: true, connectToken: true } },
        campaign: { select: { id: true, name: true, brand: { select: { name: true } } } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const igReady = creators.filter((c) => c.instagramAccountId || (c.handle && (!c.platform || c.platform.toLowerCase().includes("insta")))).length;
  const openDeliverables = deliverables.filter((d) => !["LIVE", "APPROVED"].includes(d.status)).length;
  const dueSoon = deliverables.filter(
    (d) => d.dueDate && !["LIVE", "APPROVED"].includes(d.status) && (d.dueDate.getTime() - Date.now()) / 86_400_000 <= 7
  ).length;

  const scoresWithValues = creators.map((c) => c.mountliftScore || c.insights[0]?.overallScore).filter((s): s is number => s != null);
  const averageScore = scoresWithValues.length > 0 ? scoresWithValues.reduce((a, b) => a + b, 0) / scoresWithValues.length : null;

  return (
    <div className="space-y-8 animate-fade-up relative">
      {/* Background Ambient Glow matching MountLift warm theme */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-40 dark:opacity-25">
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
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
      <div className="card p-6 sm:p-7 border-line bg-paper/60 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-gold/5 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-gold/15 text-gold text-[10px] font-mono font-bold border border-gold/30 flex items-center gap-1.5">
                <Sparkles size={11} className="text-gold" />
                <span>CREATIVE STUDIO & VIRAL OPS</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="text-[10px] font-mono text-muted uppercase">Ops Console v2</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
              Creator Launchpad & Studio
            </h1>

            <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl leading-relaxed">
              {openDeliverables
                ? `⚡ ${openDeliverables} collab drop${openDeliverables === 1 ? "" : "s"} actively crafting in the pipeline across brand partnerships.`
                : "All creator collaborations, content approvals, and deliverables are running on schedule."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link
              href="/creators"
              className="btn btn-secondary btn-small flex items-center gap-1.5"
            >
              <Users size={13} />
              <span>Explore Roster ({creators.length})</span>
            </Link>
            <Link
              href="/campaigns"
              className="btn btn-primary btn-small flex items-center gap-1.5"
            >
              <Rocket size={13} />
              <span>Collab Drops ({deliverables.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-line bg-panel/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">Creators in Focus</span>
            <Users size={16} className="text-gold" />
          </div>
          <div className="text-3xl font-display font-bold text-ink stat-number mt-1">
            {creators.length}
          </div>
          <div className="text-[11px] font-mono text-muted mt-1">
            Active roster partnerships
          </div>
        </div>

        <div className="card p-5 border-line bg-panel/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">In Production</span>
            <Clapperboard size={16} className="text-gold" />
          </div>
          <div className="text-3xl font-display font-bold text-gold stat-number mt-1">
            {openDeliverables}
          </div>
          <div className="text-[11px] font-mono text-muted mt-1">
            Collab briefs & reels in edit
          </div>
        </div>

        <div className="card p-5 border-line bg-panel/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">Due This Week</span>
            <CalendarDays size={16} className={dueSoon > 0 ? "text-viz-rose" : "text-gold"} />
          </div>
          <div className={`text-3xl font-display font-bold stat-number mt-1 ${dueSoon > 0 ? "text-viz-rose" : "text-ink"}`}>
            {dueSoon}
          </div>
          <div className="text-[11px] font-mono text-muted mt-1">
            {dueSoon > 0 ? "⚡ Priority drops next 7 days" : "Landing in next 7 days"}
          </div>
        </div>

        <div className="card p-5 border-line bg-panel/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted font-medium">Graph Verified</span>
            <Award size={16} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-display font-bold text-emerald-500 stat-number mt-1">
            {igReady}
          </div>
          <div className="text-[11px] font-mono text-muted mt-1">
            Official Graph API intelligence
          </div>
        </div>
      </div>

      {/* Interactive Gen-Z Vibe Studio (Hook Generator + Audio Radar) */}
      <section>
        <CreatorVibeStudio
          averageScore={averageScore}
          activeRosterCount={creators.length}
          verifiedCount={igReady}
          openDeliverablesCount={openDeliverables}
        />
      </section>

      {/* Daily AI Trending Topics Radar */}
      <section className="space-y-3">
        <AITrendingHub />
      </section>

      {/* Upcoming Collab Deliverables Pipeline */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow">Production Runway</p>
            <h2 className="text-base font-display font-semibold text-ink">Collab Drops & Deliverables</h2>
          </div>
          <Link href="/campaigns" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium">
            <span>Explore all campaigns</span> <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card overflow-hidden bg-paper/50 backdrop-blur-sm border-line">
          {deliverables.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CheckCircle2 size={24} className="mx-auto text-gold mb-2 opacity-70" />
              <p className="text-sm font-semibold text-ink">All caught up! No pending creator drops.</p>
              <p className="text-xs text-muted">When new brand briefs are assigned to creators, upcoming deliverables will land right here.</p>
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
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-paper border border-line text-muted flex items-center justify-center group-hover:border-gold/40 group-hover:text-gold transition-colors">
                          <Clapperboard size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-ink">{typeLabel(d.type)}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium ${statusStyles[d.status]}`}>
                              {statusLabels[d.status]}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                            <span className="text-ink font-medium">{d.creator.name}</span>
                            <span className="text-line">·</span>
                            <span className="text-gold">{d.campaign.name}</span>
                            <span className="text-line">·</span>
                            <span>{d.campaign.brand.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`text-right text-xs font-mono px-2.5 py-1 rounded-md border ${
                            overdue
                              ? "bg-viz-rose/10 text-viz-rose border-viz-rose/30 font-medium"
                              : "bg-paper text-muted border-line"
                          }`}
                        >
                          {dueLabel(d.dueDate)}
                        </div>
                        <ChevronRight
                          size={15}
                          className="text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
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

      {/* Featured Talent Roster Spotlight */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow">Talent Roster</p>
            <h2 className="text-base font-display font-semibold text-ink">Creator Spotlight</h2>
          </div>
          <Link href="/creators" className="text-xs text-gold hover:underline flex items-center gap-1 font-medium">
            <span>View all {creators.length} creators</span> <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {creators.length === 0 ? (
            <div className="col-span-full card p-6 text-center text-sm text-muted">
              No creators in your roster yet. Click Creators tab to onboard talent.
            </div>
          ) : (
            creators.slice(0, 6).map((c) => {
              const insight = c.insights[0];
              const score = c.mountliftScore || insight?.overallScore;
              return (
                <Link
                  key={c.id}
                  href={`/creators/${c.id}`}
                  className="card p-4 flex flex-col justify-between hover:border-gold/50 transition-all duration-200 bg-paper/40 hover:bg-paper/70"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 text-gold flex items-center justify-center font-display font-semibold text-xs uppercase shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink truncate">{c.name}</div>
                        <div className="text-xs text-muted font-mono truncate">
                          {c.handle ? (c.handle.startsWith("@") ? c.handle : `@${c.handle}`) : "No handle"}
                        </div>
                      </div>
                    </div>

                    {score != null && (
                      <div className="text-right shrink-0">
                        <div className="text-sm font-display font-bold text-gold">
                          {score}
                        </div>
                        <div className="text-[9px] font-mono text-muted uppercase">Score</div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-line flex items-center justify-between text-xs font-mono">
                    <span className="text-muted">{c._count.deliverables} deals</span>
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
      </section>

      {/* Team Notes & Agency Quick Briefs */}
      {updates.length > 0 && (
        <div className="card overflow-hidden bg-paper/50 backdrop-blur-sm">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-paper/30">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium">Team Briefs & Operational Directives</h2>
            <span className="text-[10px] font-mono text-muted bg-paper px-2 py-0.5 rounded border border-line">DIRECT DISPATCH</span>
          </div>
          <div className="divide-y divide-line">
            {updates.map((u) => (
              <article key={u.id} className="px-5 py-3.5 space-y-1">
                <h3 className="text-sm font-semibold text-ink">{u.title}</h3>
                <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">{u.body}</p>
                <time className="text-[10px] font-mono text-muted block pt-1">{u.createdAt.toLocaleDateString()}</time>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
