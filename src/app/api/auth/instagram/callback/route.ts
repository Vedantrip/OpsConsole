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

  // Meta's webhook validator calls this same callback URL with hub.* query
  // parameters. Handle verification before OAuth processing.
  const hubMode = searchParams.get("hub.mode");
  const hubVerifyToken = searchParams.get("hub.verify_token");
  const hubChallenge = searchParams.get("hub.challenge");

  if (hubMode === "subscribe") {
    const expectedVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;

    if (!expectedVerifyToken) {
      console.error("Instagram webhook verification failed: INSTAGRAM_WEBHOOK_VERIFY_TOKEN is not configured.");
      return new Response("Webhook verify token is not configured.", { status: 500 });
    }

    if (hubVerifyToken !== expectedVerifyToken) {
      console.warn("Instagram webhook verification failed: invalid verify token.");
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(hubChallenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

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
