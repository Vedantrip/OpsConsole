import Link from "next/link";
import { prisma } from "@/lib/prisma";
import DeliverableForm from "./deliverable-form";
import CampaignHeader from "./campaign-header";
import DeleteButton from "@/components/delete-button";
import { deleteDeliverable } from "../actions";
import { requireAccess } from "@/lib/require-access";
import { canSeeMoney } from "@/lib/roles";
import { notFound } from "next/navigation";
import { requireContext, campaignScope, creatorScope } from "@/lib/access";
import { createInvoice, createPayout } from "@/app/finance/actions";
import { CalendarPlus } from "lucide-react";

function money(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

function googleCalendarUrl(title: string, dueDate: Date, details: string) {
  const format = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const endDate = new Date(dueDate);
  endDate.setDate(endDate.getDate() + 1);
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${format(dueDate)}/${format(endDate)}`, details });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const role = await requireAccess("/campaigns");
  const context = await requireContext();
  const showMoney = canSeeMoney(role);

  const [campaign, creators] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: params.id, ...campaignScope(context) },
      include: {
        brand: true,
        deliverables: {
          where: context.role === "CREATOR_MANAGER" ? { creator: creatorScope(context) } : undefined,
          include: { creator: true, payouts: true },
          orderBy: { createdAt: "desc" },
        },
        invoices: true,
      },
    }),
    prisma.creator.findMany({ where: creatorScope(context), orderBy: { name: "asc" } }),
  ]);

  if (!campaign) notFound();

  const totalPayouts = campaign.deliverables.reduce(
    (sum, d) => sum + d.payouts.reduce((s, p) => s + Number(p.amount), 0),
    0
  );
  const totalInvoiced = campaign.invoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const profit = totalInvoiced - totalPayouts;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Breadcrumb */}
      <div>
        <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-lift mb-3 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Campaigns</span>
        </Link>

        {/* Hero Banner */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-gold uppercase tracking-wider mb-1">Brand: {campaign.brand.name}</div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-semibold tracking-tight text-ink">{campaign.name}</h1>
                {role === "ADMIN" && <CampaignHeader
                  campaign={{
                    id: campaign.id,
                    name: campaign.name,
                    budget: Number(campaign.budget),
                    status: campaign.status,
                    brand: { name: campaign.brand.name },
                  }}
                  showBudget={showMoney}
                  inlineEditOnly
                />}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-gold/10 text-gold border border-gold/20 w-fit">
              Status: {campaign.status}
            </span>
          </div>

          {(campaign.startDate || campaign.endDate) && <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-4 border-t border-line text-xs font-mono text-muted">
            {campaign.startDate && <span>Starts: <strong className="text-ink">{campaign.startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span>}
            {campaign.endDate && <span>Brand due: <strong className="text-gold">{campaign.endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span>}
          </div>}

          {showMoney && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-line">
              <div>
                <div className="text-xs text-muted font-medium mb-0.5">Campaign Budget</div>
                <div className="text-xl font-display font-semibold text-gold stat-number">{money(Number(campaign.budget))}</div>
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-0.5">Payouts Committed</div>
                <div className="text-xl font-display font-semibold text-gold stat-number">{money(totalPayouts)}</div>
              </div>
              <div>
                <div className="text-xs text-muted font-medium mb-0.5">Profit</div>
                <div className={`text-xl font-display font-semibold stat-number ${profit >= 0 ? "text-gold" : "text-viz-rose"}`}>
                  {money(profit)}
                </div>
              </div>
            </div>
          )}

          {!showMoney && (
            <div className="mt-6 pt-4 border-t border-line">
              <div className="text-xs text-muted font-medium mb-0.5">Deliverables Count</div>
              <div className="text-xl font-display font-semibold text-ink">{campaign.deliverables.length}</div>
            </div>
          )}
        </div>
      </div>

      {role === "ADMIN" && <section className="card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div><p className="eyebrow">Campaign finance</p><h2 className="text-base font-display font-semibold text-ink">Invoice the brand</h2></div>
          <span className="text-xs text-muted font-mono">{campaign.invoices.length} invoice{campaign.invoices.length === 1 ? "" : "s"} · {money(totalInvoiced)} invoiced</span>
        </div>
        <form action={createInvoice.bind(null, campaign.brandId, campaign.id)} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1"><span className="sr-only">Invoice amount</span><input className="input font-mono" name="amount" type="number" min="0" step="0.01" required defaultValue={Number(campaign.budget)} placeholder="Invoice amount in ₹" /></label>
          <button className="btn px-5">Create invoice</button>
        </form>
      </section>}

      {/* Add Deliverable */}
      {role === "ADMIN" && <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Add Deliverable</h2>
        <DeliverableForm campaignId={campaign.id} creators={creators} showRate={showMoney} />
      </div>}

      {/* Deliverables List */}
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Campaign Deliverables</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {campaign.deliverables.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted">No deliverables added yet — create one above.</div>
          ) : (
            campaign.deliverables.map((d) => (
              <div key={d.id} className="table-row flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 text-sm group">
                <div>
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>{d.creator.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper text-muted border border-line">
                      {d.type}
                    </span>
                  </div>
                  <div className="text-muted text-xs flex items-center gap-2 mt-1 font-mono">
                    <span>Status: {d.status}</span>
                    {showMoney && (
                      <>
                        <span>•</span>
                        <span>Payout: {d.payouts.length > 0 ? d.payouts[0].status : "No payout logged"}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                  {showMoney && (
                    <div className="text-right">
                      <div className="text-lift font-mono font-semibold">{money(Number(d.agreedRate))}</div>
                      <div className="text-[10px] text-muted font-mono uppercase">Agreed Rate</div>
                    </div>
                  )}
                  {role === "ADMIN" && d.payouts.length === 0 && (
                    <form action={createPayout.bind(null, d.id, campaign.id)} className="flex items-center gap-2">
                      <input className="input w-28 py-1.5 text-xs font-mono" name="amount" type="number" min="0" step="0.01" defaultValue={Number(d.agreedRate)} aria-label={`Payout amount for ${d.creator.name}`} />
                      <button className="btn btn-small whitespace-nowrap">Create payout</button>
                    </form>
                  )}
                  {role === "ADMIN" && d.payouts.length > 0 && <Link href="/finance" className="text-xs text-lift hover:underline">Edit payout →</Link>}
                  {d.dueDate && <a
                    href={googleCalendarUrl(`${d.type.toLowerCase()} due: ${d.creator.name}`, d.dueDate, `${campaign.name} · ${campaign.brand.name}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-lift hover:underline"
                  >
                    <CalendarPlus size={13} /> Remind me
                  </a>}
                  {role === "ADMIN" && <DeleteButton
                    onDelete={deleteDeliverable.bind(null, d.id, campaign.id)}
                    confirmMessage={`Remove this ${d.type.toLowerCase()} from ${d.creator.name}? This also removes any payout logged against it.`}
                  />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
