import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markPayoutPaid, markInvoicePaid, updateInvoice, updatePayout } from "./actions";
import { requireAccess } from "@/lib/require-access";

function money(n: number) {
  return n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: { q?: string; status?: string };
}) {
  await requireAccess("/finance");

  const query = searchParams?.q?.trim() ?? "";
  const statusFilter = searchParams?.status?.trim() ?? "";

  const [payouts, invoices] = await Promise.all([
    prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      include: { deliverable: { include: { creator: true, campaign: true } } },
    }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      include: { brand: true, campaign: true },
    }),
  ]);

  const totalPayable = payouts.filter((p) => p.status !== "PAID").reduce((s, p) => s + Number(p.amount), 0);
  const totalReceivable = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + Number(i.amount), 0);

  const filteredPayouts = payouts.filter((p) => {
    const matchesQuery = query
      ? p.deliverable.creator.name.toLowerCase().includes(query.toLowerCase()) ||
        p.deliverable.campaign.name.toLowerCase().includes(query.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === "OUTSTANDING" ? p.status !== "PAID"
        : statusFilter === "PAID" ? p.status === "PAID"
        : true;
    return matchesQuery && matchesStatus;
  });

  const filteredInvoices = invoices.filter((i) => {
    const matchesQuery = query
      ? i.brand.name.toLowerCase().includes(query.toLowerCase()) ||
        (i.campaign?.name ?? "").toLowerCase().includes(query.toLowerCase())
      : true;
    const matchesStatus =
      statusFilter === "OUTSTANDING" ? i.status !== "PAID"
        : statusFilter === "PAID" ? i.status === "PAID"
        : true;
    return matchesQuery && matchesStatus;
  });

  const hasFilter = Boolean(query || statusFilter);
  const exportUrl = `/api/export/finance${hasFilter ? `?q=${encodeURIComponent(query)}&status=${encodeURIComponent(statusFilter)}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink mb-0.5">Finance Ledger</h1>
          <p className="text-xs text-muted">Manage money flow: what you owe creators and what client brands owe you.</p>
        </div>
        <a
          href={exportUrl}
          className="btn btn-secondary btn-small"
          download
        >
          <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </a>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">To pay creators (Payables)</span>
            {totalPayable > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-viz-rose/10 text-viz-rose border border-viz-rose/20 font-medium">
                Action needed
              </span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono text-gold stat-number mt-1.5">{money(totalPayable)}</div>
          <p className="text-xs text-muted mt-1">Outstanding payouts awaiting settlement</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted font-medium">To collect from brands (Receivables)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-ink stat-number mt-1.5">{money(totalReceivable)}</div>
          <p className="text-xs text-muted mt-1">Outstanding brand invoices issued</p>
        </div>
      </div>

      {/* Filter */}
      <form method="GET" className="flex items-center gap-2.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input name="q" defaultValue={query} placeholder="Search creator, brand, or campaign…" className="input text-xs pl-8" />
          <svg className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select name="status" defaultValue={statusFilter} className="input text-xs w-36">
          <option value="">All Statuses</option>
          <option value="OUTSTANDING">Outstanding</option>
          <option value="PAID">Paid</option>
        </select>
        <button type="submit" className="btn btn-small">Filter</button>
        {hasFilter && <Link href="/finance" className="text-xs text-muted hover:text-gold underline px-1">Clear</Link>}
      </form>

      {/* Payouts Ledger */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between">
          <span>Creator Payouts (Payables)</span>
          <span className="font-mono text-[11px]">{filteredPayouts.length} entries</span>
        </h2>
        <div className="card divide-y divide-line overflow-hidden">
          {filteredPayouts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              {hasFilter ? "No payouts match your filter criteria." : "No payouts logged yet."}
            </div>
          ) : (
            filteredPayouts.map((p) => (
              <div key={p.id} className="table-row flex items-center justify-between px-5 py-3.5 text-xs group">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="font-semibold text-ink">{p.deliverable.creator.name}</div>
                  <div className="text-muted text-[11px] flex items-center gap-2 mt-0.5 font-mono">
                    <span>Campaign: {p.deliverable.campaign.name}</span>
                    <span>•</span>
                    <span className={p.status === "PAID" ? "text-viz-teal font-medium" : "text-gold font-medium"}>
                      {p.status}
                    </span>
                  </div>
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[11px] text-muted hover:text-gold list-none transition-colors">
                      Edit payout <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span>
                    </summary>
                    <form action={updatePayout.bind(null, p.id)} className="mt-2 flex flex-wrap items-center gap-2">
                      <input className="input w-32 py-1 text-xs font-mono" name="amount" type="number" min="0" step="0.01" defaultValue={Number(p.amount)} aria-label="Payout amount" required />
                      <select className="input w-32 py-1 text-xs" name="status" defaultValue={p.status}>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PAID">Paid</option>
                      </select>
                      <button className="btn btn-small">Save</button>
                    </form>
                  </details>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="font-mono text-ink font-bold text-sm">{money(Number(p.amount))}</div>
                  {p.status !== "PAID" ? (
                    <form action={markPayoutPaid.bind(null, p.id)}>
                      <button className="text-xs font-medium text-gold hover:underline bg-gold/10 border border-gold/25 px-2.5 py-1 rounded transition-colors" type="submit">
                        Mark Paid
                      </button>
                    </form>
                  ) : (
                    <span className="text-[11px] font-mono text-viz-teal px-2 py-0.5 bg-viz-teal/10 border border-viz-teal/20 rounded font-medium">
                      ✓ Paid
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invoices Ledger */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between">
          <span>Brand Invoices (Receivables)</span>
          <span className="font-mono text-[11px]">{filteredInvoices.length} entries</span>
        </h2>
        <div className="card divide-y divide-line overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              {hasFilter ? "No invoices match your filter criteria." : "No invoices logged yet."}
            </div>
          ) : (
            filteredInvoices.map((i) => (
              <div key={i.id} className="table-row flex items-center justify-between px-5 py-3.5 text-xs group">
                <div className="min-w-0 flex-1 pr-4">
                  <div className="font-semibold text-ink">{i.brand.name}</div>
                  <div className="text-muted text-[11px] flex items-center gap-2 mt-0.5 font-mono">
                    <span>Campaign: {i.campaign?.name ?? "—"}</span>
                    <span>•</span>
                    <span className={i.status === "PAID" ? "text-viz-teal font-medium" : "text-gold font-medium"}>
                      {i.status}
                    </span>
                  </div>
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[11px] text-muted hover:text-gold list-none transition-colors">
                      Edit invoice <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span>
                    </summary>
                    <form action={updateInvoice.bind(null, i.id)} className="mt-2 flex flex-wrap items-center gap-2">
                      <input className="input w-32 py-1 text-xs font-mono" name="amount" type="number" min="0" step="0.01" defaultValue={Number(i.amount)} aria-label="Invoice amount" required />
                      <select className="input w-32 py-1 text-xs" name="status" defaultValue={i.status}>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                        <option value="OVERDUE">Overdue</option>
                      </select>
                      <button className="btn btn-small">Save</button>
                    </form>
                  </details>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="font-mono text-ink font-bold text-sm">{money(Number(i.amount))}</div>
                  {i.status !== "PAID" ? (
                    <form action={markInvoicePaid.bind(null, i.id)}>
                      <button className="text-xs font-medium text-gold hover:underline bg-gold/10 border border-gold/25 px-2.5 py-1 rounded transition-colors" type="submit">
                        Mark Paid
                      </button>
                    </form>
                  ) : (
                    <span className="text-[11px] font-mono text-viz-teal px-2 py-0.5 bg-viz-teal/10 border border-viz-teal/20 rounded font-medium">
                      ✓ Paid
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
