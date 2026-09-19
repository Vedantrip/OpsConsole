import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";

export default async function CreatorPortalPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { connected?: string; error?: string };
}) {
  const { token } = params;

  if (!token) notFound();

  const creator = await prisma.creator.findUnique({
    where: { connectToken: token },
    select: {
      id: true,
      name: true,
      handle: true,
      instagramAccountId: true,
      instagramConnectedAt: true,
      mountliftScore: true,
      engagementScore: true,
      audienceScore: true,
      contentScore: true,
      consistencyScore: true,
      profileScore: true,
      scoreCalculatedAt: true,
      privateInsights: true,
    },
  });

  if (!creator) notFound();

  return (
    <PortalClient
      token={token}
      creator={creator}
      justConnected={searchParams?.connected === "true"}
      errorMessage={searchParams?.error}
    />
  );
}
