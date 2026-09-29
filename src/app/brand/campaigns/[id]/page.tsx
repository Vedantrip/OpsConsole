import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/access";

function statusTone(status: string) {
  if (["ACTIVE", "APPROVED"].includes(status)) return "bg-gold/10 text-gold border-gold/30";
  if (["COMPLETE", "LIVE"].includes(status)) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  if (status === "CANCELLED") return "bg-viz-rose/10 text-viz-rose border-viz-rose/30";
  return "bg-paper text-muted border-line";
}

export default async function BrandCampaignPage({ params }: { params: { id: string } }) {
  const context = await requireBrandContext();
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, brandId: context.brand.id },
    include: {
      deliverables: {
        orderBy: { dueDate: "asc" },
        include: { creator: { select: { name: true, handle: true } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });
  if (!campaign) notFound();

  return (
    <div className="space-y-7">
      <div>
        <Link href="/brand" className="text-xs text-muted hover:text-gold">← Back to dashboard</Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Campaign workspace</p>
            <h1 className="text-3xl font-display font-bold text-ink">{campaign.name}</h1>
            <p className="mt-1 text-sm text-muted">{context.brand.name}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-mono border w-fit ${statusTone(campaign.status)}`}>{campaign.status}</span>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted">Campaign timeline</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs text-muted">Start</p><p className="mt-1 font-medium text-ink">{campaign.startDate?.toLocaleDateString("en-IN") ?? "Not set"}</p></div>
          <div><p className="text-xs text-muted">End</p><p className="mt-1 font-medium text-ink">{campaign.endDate?.toLocaleDateString("en-IN") ?? "Not set"}</p></div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Creator deliverables</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {campaign.deliverables.length === 0 ? <div className="p-7 text-sm text-muted">Creators will appear here once assigned.</div> : campaign.deliverables.map((d) => (
            <div key={d.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">{d.creator.name}</p>
                <p className="mt-1 text-xs text-muted">{d.creator.handle ? `@${d.creator.handle} · ` : ""}{d.type}</p>
              </div>
              <div className="sm:text-right">
                <span className={`px-2.5 py-1 rounded text-[10px] font-mono border ${statusTone(d.status)}`}>{d.status}</span>
                <p className="mt-1 text-[11px] text-muted">{d.dueDate ? `Due ${d.dueDate.toLocaleDateString("en-IN")}` : "No deadline set"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href={`/messages?campaign=${campaign.id}`} className="btn">Open campaign messages</Link>
        <Link href="/brand" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    </div>
  );
}
