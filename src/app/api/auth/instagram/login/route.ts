import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstagramOAuthUrl } from "@/lib/instagram-graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing creator connect token." }, { status: 400 });
  }

  const creator = await prisma.creator.findUnique({
    where: { connectToken: token },
    select: { id: true, name: true },
  });

  if (!creator) {
    return NextResponse.json({ error: "Invalid or expired connect token." }, { status: 404 });
  }

  const origin = request.nextUrl.origin;

  try {
    const authUrl = getInstagramOAuthUrl(token, origin);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Instagram OAuth login configuration error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Instagram Login is not configured on this deployment.";
    return NextResponse.redirect(
      `${origin}/portal/${token}?error=${encodeURIComponent(message)}`
    );
  }
}
