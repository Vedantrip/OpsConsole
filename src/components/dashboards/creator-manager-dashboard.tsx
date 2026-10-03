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
  Layers,
  Award,
  TrendingUp,
  CheckCircle2,
  Zap,
  Flame,
  Rocket,
  ShieldCheck,
  ExternalLink,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireContext, creatorScope } from "@/lib/access";
import AITrendingHub from "@/components/content/ai-trending-hub";
import CreatorVibeStudio from "@/components/content/creator-vibe-studio";

const statusStyles = {
  PLANNED: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  IN_PROGRESS: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  SUBMITTED: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  LIVE: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
} as const;

const statusLabels = {
  PLANNED: "🎯 Briefed",
  IN_PROGRESS: "🎬 Filming",
  SUBMITTED: "✨ In Review",
  APPROVED: "💎 Approved",
  LIVE: "🚀 Live / Bag Secured 💸",
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

  return (
    <div className="space-y-8 animate-fade-up relative">
      {/* Dynamic Gen-Z Ambient Glows */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-70">
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -left-32 w-[450px] h-[450px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[100px]" />
      </div>

      {/* Hero Bento Header (Gen-Z Bubbly Style) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900/90 via-indigo-950/30 to-purple-950/40 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={13} className="text-indigo-400 animate-spin-once" />
                <span>CREATIVE STUDIO & VIRAL OPS</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>ROSTER IN FLOW</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
              Creator Launchpad & Studio
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {openDeliverables
                ? `⚡ ${openDeliverables} collab drop${openDeliverables === 1 ? "" : "s"} actively crafting in the pipeline. High engagement momentum.`
                : "All creator collaborations, content approvals, and brand deliverables are running smoothly."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <Link
              href="/creators"
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
            >
              <Users size={15} className="text-indigo-400" />
              <span>Talent Roster ({creators.length})</span>
            </Link>
            <Link
              href="/campaigns"
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
            >
              <Rocket size={15} />
              <span>Collab Drops ({deliverables.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bubbly Bento Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 p-5 backdrop-blur-xl shadow-lg hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">Creators in Focus</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            {creators.length}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">Active talent</span> · Roster mapped
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-amber-950/30 to-slate-900/80 border border-amber-500/20 p-5 backdrop-blur-xl shadow-lg hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">In Production</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clapperboard size={16} />
            </div>
          </div>
          <div className="text-3xl font-display font-extrabold text-amber-400">
            {openDeliverables}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Collab briefs & reels in edit
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-500/20 p-5 backdrop-blur-xl shadow-lg hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">Due This Week</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <CalendarDays size={16} />
            </div>
          </div>
          <div className={`text-3xl font-display font-extrabold ${dueSoon > 0 ? "text-pink-400" : "text-white"}`}>
            {dueSoon}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {dueSoon > 0 ? "⚡ Priority drops next 7 days" : "Clean calendar ahead"}
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80 border border-emerald-500/20 p-5 backdrop-blur-xl shadow-lg hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">Graph Verified</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-3xl font-display font-extrabold text-emerald-400">
            {igReady}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">100% official API</span> · Zero scrape
          </div>
        </div>
      </div>

      {/* Interactive Gen-Z Vibe Studio (Hook Generator + Audio Radar) */}
      <section>
        <CreatorVibeStudio />
      </section>

      {/* Daily AI Trending Topics Radar */}
      <section className="space-y-3">
        <AITrendingHub />
      </section>

      {/* Upcoming Collab Deliverables Pipeline */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Production Runway</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">Live Drops</span>
            </div>
            <h2 className="text-xl font-display font-bold text-white mt-0.5">Collab Drops & Deliverables</h2>
          </div>
          <Link href="/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors">
            <span>Explore all campaign deals</span> <ArrowRight size={13} />
          </Link>
        </div>

        <div className="rounded-3xl overflow-hidden bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-xl">
          {deliverables.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-base font-bold text-white">All caught up! No pending creator drops.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When new brand briefs are assigned to creators, live production cards will update right here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {deliverables.map((d) => {
                const overdue = d.dueDate && d.dueDate.getTime() < Date.now() && !["LIVE", "APPROVED"].includes(d.status);
                return (
                  <Link
                    key={d.id}
                    href={`/campaigns/${d.campaign.id}`}
                    className="group block px-5 py-4 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Clapperboard size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{typeLabel(d.type)}</span>
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold ${statusStyles[d.status]}`}>
                              {statusLabels[d.status]}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 truncate flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-200 font-semibold">{d.creator.name}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-indigo-300">{d.campaign.name}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">{d.campaign.brand.name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`text-right text-xs font-mono px-3 py-1 rounded-xl border ${
                            overdue
                              ? "bg-pink-500/15 text-pink-300 border-pink-500/30 font-bold animate-pulse"
                              : "bg-white/5 text-slate-300 border-white/10"
                          }`}
                        >
                          {dueLabel(d.dueDate)}
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {deliverables.length > 0 && (
            <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Clock3 size={13} className="text-indigo-400" />
              <span>Ordered by delivery urgency · Real-time status sync</span>
            </div>
          )}
        </div>
      </section>

      {/* Featured Talent Roster Spotlight */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Talent Showcase</div>
            <h2 className="text-xl font-display font-bold text-white mt-0.5">Creator Roster Spotlight</h2>
          </div>
          <Link href="/creators" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition-colors">
            <span>View all {creators.length} creators</span> <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creators.length === 0 ? (
            <div className="col-span-full rounded-3xl bg-slate-900/60 border border-white/10 p-8 text-center text-sm text-slate-400">
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
                  className="group rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-indigo-950/30 border border-white/10 p-5 hover:border-indigo-500/40 hover:-translate-y-1 transition-all duration-300 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 font-display font-bold text-sm uppercase flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate">
                            {c.handle ? (c.handle.startsWith("@") ? c.handle : `@${c.handle}`) : "No handle"}
                          </div>
                        </div>
                      </div>

                      {score != null && (
                        <div className="text-right shrink-0">
                          <div className="text-base font-display font-extrabold text-indigo-300">
                            {score}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 uppercase">ML Score</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-400 border border-white/5">
                      {c._count.deliverables} deals
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Flame size={12} />
                      {insight?.engagementRate != null ? `${insight.engagementRate.toFixed(1)}% ER` : "Ready"}
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
        <section className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Team Briefs & Operational Directives
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-mono border border-white/10">
              DIRECT DISPATCH
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {updates.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <h4 className="text-sm font-bold text-white">{u.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{u.body}</p>
                <span className="text-[10px] font-mono text-slate-500 block pt-1">{u.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
