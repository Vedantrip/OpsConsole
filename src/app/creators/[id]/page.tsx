import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { notFound } from "next/navigation";
import { BarChart3, ChevronLeft, Instagram, Video } from "lucide-react";
import DeleteButton from "@/components/delete-button";
import { deleteCreator } from "../actions";
import { requireContext, creatorScope } from "@/lib/access";
import CreatorProfileView from "@/components/content/creator-profile-view";
import { generateComputedInsights } from "@/lib/insights-engine";
import { PostWithRelations } from "@/lib/types/content";

export default async function CreatorProfilePage({ params }: { params: { id: string } }) {
  await requireAccess("/creators");
  const context = await requireContext();

  const [creator, tags] = await Promise.all([
    prisma.creator.findUnique({
      where: { id: params.id, ...creatorScope(context) },
      include: {
        _count: { select: { deliverables: true } },
        insights: { orderBy: { createdAt: "desc" } },
        posts: {
          orderBy: { postedAt: "desc" },
          include: {
            tags: true,
            metrics: true,
            demographics: true,
          },
        },
      },
    }),
    prisma.contentTag.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  if (!creator) notFound();

  // Cast posts to PostWithRelations
  const typedPosts = creator.posts.map((p) => ({
    ...p,
    demographics: p.demographics
      ? {
          id: p.demographics.id,
          ageRanges: (p.demographics.ageRanges as any) ?? {},
          genderSplit: (p.demographics.genderSplit as any) ?? {},
          topLocations: (p.demographics.topLocations as any) ?? [],
        }
      : null,
  })) as PostWithRelations[];

  const computedInsights = generateComputedInsights(typedPosts);
  const tagNames = tags.map((t) => t.name);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/creators"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors mb-3 font-medium"
        >
          <ChevronLeft size={14} />
          <span>Back to Creators</span>
        </Link>

        {/* Creator Hero Header */}
        <div className="card p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded bg-gold/15 text-gold font-mono font-bold text-base flex items-center justify-center border border-gold/25 uppercase">
                {creator.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-ink">{creator.name}</h1>
                <div className="text-xs text-muted font-mono flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-gold font-medium">
                    {creator.handle ? (creator.handle.startsWith("@") ? creator.handle : `@${creator.handle}`) : "No handle"}
                  </span>
                  <span>•</span>
                  <span>{creator.platform || "Platform unassigned"}</span>
                  {creator.email && (
                    <>
                      <span>•</span>
                      <span>{creator.email}</span>
                    </>
                  )}
                  {creator.rateCard && (
                    <>
                      <span>•</span>
                      <span className="text-muted">{creator.rateCard}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-paper border border-line text-muted">
                {creator._count.deliverables} deliverable{creator._count.deliverables === 1 ? "" : "s"}
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-paper border border-line text-muted">
                {typedPosts.length} logged post{typedPosts.length === 1 ? "" : "s"}
              </span>
              <Link href="/insights" className="btn btn-secondary btn-small">
                <BarChart3 size={13} />
                <span>Run live audit</span>
              </Link>
              {context.role === "ADMIN" && (
                <DeleteButton
                  onDelete={deleteCreator.bind(null, creator.id)}
                  confirmMessage={`Remove ${creator.name}? This will remove deliverables, posts, and insight records.`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Tabs & Views */}
      <CreatorProfileView
        creator={creator}
        posts={typedPosts}
        computedInsights={computedInsights}
        existingTags={tagNames}
      />
    </div>
  );
}

