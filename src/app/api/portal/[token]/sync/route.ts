import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchInstagramCreatorInsights } from "@/lib/instagram-graph";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const creator = await prisma.creator.findUnique({
    where: { connectToken: token },
    select: { id: true, instagramAccessToken: true, tokenExpiresAt: true },
  });

  if (!creator) {
    return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  }

  if (!creator.instagramAccessToken) {
    return NextResponse.json({ error: "Instagram account is not connected yet." }, { status: 400 });
  }

  // Check token expiration
  if (creator.tokenExpiresAt && creator.tokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Instagram connection has expired. Please reconnect your account." },
      { status: 401 }
    );
  }

  try {
    const insightsData = await fetchInstagramCreatorInsights(creator.instagramAccessToken);

    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        mountliftScore: insightsData.scores.overall,
        engagementScore: insightsData.scores.engagement,
        audienceScore: insightsData.scores.audience,
        contentScore: insightsData.scores.content,
        consistencyScore: insightsData.scores.consistency,
        profileScore: insightsData.scores.profile,
        scoreCalculatedAt: new Date(),
        privateInsights: insightsData as any,
      },
    });

    return NextResponse.json({ success: true, insights: insightsData });
  } catch (err: any) {
    console.error("Error syncing Instagram insights:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to refresh insights from Instagram." },
      { status: 500 }
    );
  }
}
