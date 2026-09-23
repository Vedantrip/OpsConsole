import { NextRequest, NextResponse } from "next/server";
import { getDailyTrendingTopics } from "@/lib/ai-trending";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "ALL";
    const creatorId = searchParams.get("creatorId");

    let creatorHandle: string | undefined;
    let platform: string | undefined;
    let niche: string | undefined;

    if (creatorId) {
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
        select: { handle: true, platform: true, notes: true },
      });
      if (creator) {
        creatorHandle = creator.handle || undefined;
        platform = creator.platform || undefined;
        niche = creator.notes || undefined;
      }
    }

    const data = await getDailyTrendingTopics({
      category: category !== "ALL" ? category : undefined,
      creatorHandle,
      platform,
      niche,
      forceRefresh: false,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Trending API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve trending topics." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const category = body.category || "ALL";
    const creatorId = body.creatorId;

    let creatorHandle: string | undefined;
    let platform: string | undefined;
    let niche: string | undefined;

    if (creatorId) {
      const creator = await prisma.creator.findUnique({
        where: { id: creatorId },
        select: { handle: true, platform: true, notes: true },
      });
      if (creator) {
        creatorHandle = creator.handle || undefined;
        platform = creator.platform || undefined;
        niche = creator.notes || undefined;
      }
    }

    const data = await getDailyTrendingTopics({
      category: category !== "ALL" ? category : undefined,
      creatorHandle,
      platform,
      niche,
      forceRefresh: true,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Trending API Error on Refresh]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to refresh trending topics." },
      { status: 500 }
    );
  }
}
