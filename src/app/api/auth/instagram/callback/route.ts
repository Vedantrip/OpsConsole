import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, fetchInstagramCreatorInsights } from "@/lib/instagram-graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const connectToken = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const origin = request.nextUrl.origin;

  if (errorParam || !code || !connectToken) {
    const errorMsg = encodeURIComponent(errorDescription || errorParam || "Authentication was cancelled or failed.");
    const redirectTarget = connectToken ? `${origin}/portal/${connectToken}?error=${errorMsg}` : `${origin}/?error=${errorMsg}`;
    return NextResponse.redirect(redirectTarget);
  }

  try {
    const creator = await prisma.creator.findUnique({
      where: { connectToken },
      select: { id: true, handle: true },
    });

    if (!creator) {
      return NextResponse.redirect(`${origin}/?error=${encodeURIComponent("Creator profile not found for this token.")}`);
    }

    // Exchange authorization code for 60-day long-lived token
    const { accessToken, expiresInSeconds } = await exchangeCodeForToken(code, origin);

    // Fetch official demographics & media performance from Instagram Graph API
    const insightsData = await fetchInstagramCreatorInsights(accessToken);

    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Persist verified Instagram connection and MountLift intelligence score
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        instagramAccountId: insightsData.instagramAccountId,
        instagramAccessToken: accessToken,
        tokenExpiresAt,
        instagramConnectedAt: new Date(),
        mountliftScore: insightsData.scores.overall,
        engagementScore: insightsData.scores.engagement,
        audienceScore: insightsData.scores.audience,
        contentScore: insightsData.scores.content,
        consistencyScore: insightsData.scores.consistency,
        profileScore: insightsData.scores.profile,
        scoreCalculatedAt: new Date(),
        privateInsights: insightsData as any,
        handle: creator.handle || (insightsData.profile.username ? `@${insightsData.profile.username}` : creator.handle),
        platform: "Instagram",
      },
    });

    return NextResponse.redirect(`${origin}/portal/${connectToken}?connected=true`);
  } catch (err: any) {
    console.error("Instagram OAuth callback error:", err);
    const errorMsg = encodeURIComponent(err?.message || "Failed to process Instagram insights.");
    return NextResponse.redirect(`${origin}/portal/${connectToken}?error=${errorMsg}`);
  }
}
