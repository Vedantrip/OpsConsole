import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, CircleDot, Clock3, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireContext, campaignScope } from "@/lib/access";

const statusTone = {
  PLANNED: "text-paper border-paper/20 bg-paper/10",
  IN_PROGRESS: "text-lift border-lift/25 bg-lift/10",
  SUBMITTED: "text-sky-200 border-sky-300/25 bg-sky-300/10",
  APPROVED: "text-emerald-200 border-emerald-300/25 bg-emerald-300/10",
  LIVE: "text-violet-200 border-violet-300/25 bg-violet-300/10",
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
  return `Due ${dateText(date)}`;
}

export default async function AccountManagerDashboard() {
  const context = await requireContext();
  const campaigns = await prisma.campaign.findMany({
    where: campaignScope(context),
    orderBy: [{ status: "asc" }, { endDate: { sort: "asc", nulls: "last" } }],
    include: {
      brand: { select: { name: true } },
      deliverables: { select: { id: true, type: true, status: true, dueDate: true, creator: { select: { id: true, name: true } } } },
    },
  });

  const deliverables = campaigns.flatMap((campaign) => campaign.deliverables.map((deliverable) => ({ ...deliverable, campaign })));
  const completed = deliverables.filter((d) => ["APPROVED", "LIVE"].includes(d.status)).length;
  const active = deliverables.filter((d) => !["APPROVED", "LIVE"].includes(d.status)).length;
  const budget = campaigns.reduce((total, campaign) => total + Number(campaign.budget), 0);
  const creatorMap = new Map<string, { name: string; campaignNames: Set<string>; deliverableCount: number }>();
  for (const d of deliverables) {
    const creator = creatorMap.get(d.creator.id) ?? { name: d.creator.name, campaignNames: new Set<string>(), deliverableCount: 0 };
    creator.campaignNames.add(d.campaign.name);
    creator.deliverableCount += 1;
    creatorMap.set(d.creator.id, creator);
  }
  const upcoming = deliverables.filter((d) => d.dueDate && !["APPROVED", "LIVE"].includes(d.status)).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime()).slice(0, 5);

  return <div className="space-y-8 animate-fade-up">
    <div className="card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Brand partnerships & accounts</p>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-ink">Client portfolio pulse</h1>
          <p className="text-sm text-muted mt-1">
            Track campaign execution, creator milestones, and budget delivery across your assigned brand accounts.
          </p>
        </div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md bg-ink text-paper hover:bg-charcoal transition-colors w-fit">
          Explore campaigns <ArrowRight size={14} />
        </Link>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up">
      <Metric label="Managed budget" value={budget.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} note="Across your assigned brand campaigns" accent />
      <Metric label="Active campaigns" value={String(campaigns.length)} note="Campaigns in execution" />
      <Metric label="Active creators" value={String(creatorMap.size)} note="Creators delivering for your brands" />
      <Metric label="Delivery progress" value={deliverables.length ? `${completed}/${deliverables.length}` : "—"} note={deliverables.length ? `${active} deliverables in progress` : "No deliverables scheduled yet"} accent />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow">Delivery timeline</p>
            <h2 className="text-base font-display font-semibold text-ink">Upcoming campaign deliverables</h2>
          </div>
          <span className="text-xs text-muted font-mono">{upcoming.length} upcoming</span>
        </div>
        <div className="card overflow-hidden">
          {upcoming.length === 0 ? (
            <div className="p-7 text-center">
              <CheckCircle2 size={22} className="mx-auto text-gold mb-2 opacity-60" />
              <p className="text-sm font-medium text-ink">All campaign deliverables are up to date</p>
              <p className="text-xs text-muted mt-1">Upcoming creator deadlines will appear here once scheduled.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map((d) => {
                const overdue = d.dueDate && d.dueDate.getTime() < Date.now();
                return (
                  <Link key={d.id} href={`/campaigns/${d.campaign.id}`} className="group block px-5 py-3.5 hover:bg-paper/80 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-paper border border-line text-muted flex items-center justify-center shrink-0">
                        <CalendarDays size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-sm font-medium text-ink">{d.type.charAt(0) + d.type.slice(1).toLowerCase()} by {d.creator.name}</span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${statusTone[d.status]}`}>{d.status.replace("_", " ")}</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 truncate"><span className="font-medium text-ink">{d.campaign.brand.name}</span> · {d.campaign.name}</p>
                        <p className={`text-[11px] font-mono mt-1.5 ${overdue ? "text-viz-rose font-medium" : "text-muted"}`}>{dueText(d.dueDate)}</p>
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
      
      <section className="xl:col-span-2">
        <div className="mb-4">
          <p className="eyebrow">Collaborating talent</p>
          <h2 className="text-base font-display font-semibold text-ink">Creators on your accounts</h2>
        </div>
        <div className="card divide-y divide-line overflow-hidden">
          {creatorMap.size === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Creator assignments will appear once campaign deliverables are scheduled.</p>
          ) : (
            Array.from(creatorMap.entries()).map(([id, creator]) => (
              <div key={id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-paper border border-line text-ink flex items-center justify-center font-display font-semibold text-xs uppercase">
                    {creator.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{creator.name}</p>
                    <p className="text-[11px] text-muted font-mono truncate">{creator.deliverableCount} deliverable{creator.deliverableCount === 1 ? "" : "s"} · {Array.from(creator.campaignNames).join(", ")}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-2.5 text-[11px] text-muted flex gap-1.5 items-center"><Users size={13} className="shrink-0" />Creators actively delivering for your assigned brand accounts.</p>
      </section>
    </div>

    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="eyebrow">Account portfolio</p>
          <h2 className="text-base font-display font-semibold text-ink">Active campaign status</h2>
        </div>
        <Link href="/campaigns" className="text-xs text-gold hover:underline inline-flex items-center gap-1 font-medium">All campaign details <ArrowRight size={12} /></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.length === 0 ? (
          <div className="col-span-full card p-7 text-center text-sm text-muted">No campaigns have been assigned to your accounts yet.</div>
        ) : (
          campaigns.map((campaign) => {
            const done = campaign.deliverables.filter((d) => ["APPROVED", "LIVE"].includes(d.status)).length;
            const progress = campaign.deliverables.length ? Math.round((done / campaign.deliverables.length) * 100) : 0;
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`} className="card p-5 hover:border-gold transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{campaign.name}</h3>
                    <p className="text-xs text-muted mt-0.5">{campaign.brand.name}</p>
                  </div>
                  <CircleDot size={16} className={campaign.status === "ACTIVE" ? "text-gold" : "text-muted"} />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-mono text-muted mb-1.5">
                    <span>{done}/{campaign.deliverables.length} delivered</span>
                    <span className="text-ink font-medium">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                    <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-line flex justify-between items-center text-[11px] font-mono">
                  <span className="text-muted">{campaign.endDate ? `Brand due ${dateText(campaign.endDate)}` : "Timeline to be confirmed"}</span>
                  <span className="text-gold inline-flex items-center gap-1 font-medium">View <ArrowRight size={12} /></span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  </div>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-muted font-medium mb-1">{label}</p>
      <p className={`text-2xl font-display font-semibold stat-number ${accent ? "text-gold" : "text-ink"}`}>{value}</p>
      <p className="text-[11px] text-muted mt-1">{note}</p>
    </div>
  );
}
