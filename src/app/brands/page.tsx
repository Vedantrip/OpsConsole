import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BrandForm from "./brand-form";
import BrandRow from "./brand-row";
import { requireAccess } from "@/lib/require-access";
import { requireContext, brandScope } from "@/lib/access";

export default async function BrandsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  await requireAccess("/brands");
  const context = await requireContext();

  const query = searchParams?.q?.trim() ?? "";
  const whereClause: any = { ...brandScope(context) };
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { contactName: { contains: query, mode: "insensitive" } },
      { contactEmail: { contains: query, mode: "insensitive" } },
    ];
  }

  const [brands, totalBrands, totalCampaigns] = await Promise.all([
    prisma.brand.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { campaigns: true } } },
    }),
    prisma.brand.count({ where: brandScope(context) }),
    prisma.campaign.count({ where: { brand: brandScope(context) } }),
  ]);

  const hasFilter = Boolean(query);

  return (
    <div className="space-y-6">
      {context.role === "ADMIN" && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-0.5">Brands</h1>
          <p className="text-xs text-muted">Client brand partnerships and linked campaigns.</p>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-medium mb-1">Total Client Brands</div>
            <div className="text-2xl font-bold font-mono text-gold stat-number">{totalBrands}</div>
          </div>
          <div className="p-2.5 rounded bg-gold/10 border border-gold/20 text-gold">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-medium mb-1">Total Linked Campaigns</div>
            <div className="text-2xl font-bold font-mono text-ink stat-number">{totalCampaigns}</div>
          </div>
          <div className="p-2.5 rounded bg-paper border border-line text-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-0.5">Add New Brand</h2>
          <p className="text-xs text-muted">
            Add company or client name first. Contact details can be filled in or edited later.
          </p>
        </div>
        <BrandForm />
      </div>

      <form method="GET" className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <input name="q" defaultValue={query} placeholder="Search brand name, contact person, or email…" className="input text-xs pl-8" />
          <svg className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button type="submit" className="btn btn-small">Search</button>
        {hasFilter && <Link href="/brands" className="text-xs text-muted hover:text-gold underline px-1">Clear</Link>}
      </form>

      <div className="card divide-y divide-line overflow-hidden">
        {brands.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            {hasFilter ? "No brands match your search query." : "No brands yet — add one above."}
          </div>
        ) : (
          brands.map((b) => <BrandRow key={b.id} brand={b} canManage={context.role === "ADMIN"} />)
        )}
      </div>
    </div>
  );
}
