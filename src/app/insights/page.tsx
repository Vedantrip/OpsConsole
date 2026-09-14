import { prisma } from "@/lib/prisma";
import AuditPanel from "./audit-panel";
import { requireAccess } from "@/lib/require-access";
import { BarChart3 } from "lucide-react";
import { requireContext, creatorScope } from "@/lib/access";

export default async function InsightsPage() {
  await requireAccess("/insights");
  const context = await requireContext();

  const creators = await prisma.creator.findMany({
    where: creatorScope(context),
    orderBy: { name: "asc" },
    select: { id: true, name: true, handle: true, platform: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 size={22} className="text-lift" />
          <h1 className="text-2xl font-display font-bold tracking-tight">Analytics & Insights</h1>
        </div>
        <p className="text-sm text-muted">
          Creator intelligence across public performance signals and estimated audience patterns.
        </p>
        <div className="mt-3 max-w-3xl rounded-xl border border-lift/20 bg-lift/8 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-paper">Audience Intelligence · Estimated from public signals.</span>{" "}
          Demographics shown here are estimates, not official Instagram Insights. Official Meta-connected data can later be labeled <span className="font-semibold text-paper">Verified Instagram Insights</span>.
        </div>
      </div>

      <AuditPanel creators={creators} />
    </div>
  );
}
