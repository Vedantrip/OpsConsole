"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Platform, ContentFormat } from "@prisma/client";
import { requireAccess } from "@/lib/require-access";
import { requireContext, creatorScope } from "@/lib/access";

export interface SavePostInput {
  postId?: string;
  creatorId: string;
  platform: Platform;
  format: ContentFormat;
  caption?: string;
  url?: string;
  postedAt: string; // ISO string
  tags: string[]; // array of tag names
  metrics?: {
    views?: number | null;
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    saves?: number | null;
    reach?: number | null;
    impressions?: number | null;
  };
  demographics?: {
    ageRanges?: Record<string, number>;
    genderSplit?: Record<string, number>;
    topLocations?: Array<{ location: string; percentage: number }>;
  };
}

export async function savePost(input: SavePostInput) {
  await requireAccess("/creators");
  const context = await requireContext();

  // Verify creator access
  const creator = await prisma.creator.findUnique({
    where: { id: input.creatorId, ...creatorScope(context) },
  });

  if (!creator) {
    throw new Error("Creator not found or access denied.");
  }

  // Connect or create tags
  const tagConnectOrCreate = input.tags
    .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
    .filter(Boolean)
    .map((tagName) => ({
      where: { name: tagName },
      create: { name: tagName },
    }));

  const postedAtDate = input.postedAt ? new Date(input.postedAt) : new Date();

  // If editing an existing post
  if (input.postId) {
    const existing = await prisma.post.findUnique({
      where: { id: input.postId, creatorId: input.creatorId },
      include: { metrics: true, demographics: true },
    });

    if (!existing) {
      throw new Error("Post not found.");
    }

    // Update Post details
    const updatedPost = await prisma.post.update({
      where: { id: input.postId },
      data: {
        platform: input.platform,
        format: input.format,
        caption: input.caption || null,
        url: input.url || null,
        postedAt: postedAtDate,
        tags: {
          set: [], // reset relations
          connectOrCreate: tagConnectOrCreate,
        },
      },
    });

    // Upsert Metrics
    if (input.metrics) {
      await prisma.postMetrics.upsert({
        where: { postId: input.postId },
        create: {
          postId: input.postId,
          views: input.metrics.views ?? null,
          likes: input.metrics.likes ?? null,
          comments: input.metrics.comments ?? null,
          shares: input.metrics.shares ?? null,
          saves: input.metrics.saves ?? null,
          reach: input.metrics.reach ?? null,
          impressions: input.metrics.impressions ?? null,
        },
        update: {
          views: input.metrics.views ?? null,
          likes: input.metrics.likes ?? null,
          comments: input.metrics.comments ?? null,
          shares: input.metrics.shares ?? null,
          saves: input.metrics.saves ?? null,
          reach: input.metrics.reach ?? null,
          impressions: input.metrics.impressions ?? null,
        },
      });
    }

    // Upsert Demographics
    if (input.demographics) {
      await prisma.postDemographics.upsert({
        where: { postId: input.postId },
        create: {
          postId: input.postId,
          ageRanges: input.demographics.ageRanges ?? {},
          genderSplit: input.demographics.genderSplit ?? {},
          topLocations: input.demographics.topLocations ?? [],
        },
        update: {
          ageRanges: input.demographics.ageRanges ?? {},
          genderSplit: input.demographics.genderSplit ?? {},
          topLocations: input.demographics.topLocations ?? [],
        },
      });
    }

    revalidatePath(`/creators/${input.creatorId}`);
    return { success: true, post: updatedPost };
  }

  // Creating a new post
  const newPost = await prisma.post.create({
    data: {
      creatorId: input.creatorId,
      platform: input.platform,
      format: input.format,
      caption: input.caption || null,
      url: input.url || null,
      postedAt: postedAtDate,
      tags: {
        connectOrCreate: tagConnectOrCreate,
      },
      metrics: input.metrics
        ? {
            create: {
              views: input.metrics.views ?? null,
              likes: input.metrics.likes ?? null,
              comments: input.metrics.comments ?? null,
              shares: input.metrics.shares ?? null,
              saves: input.metrics.saves ?? null,
              reach: input.metrics.reach ?? null,
              impressions: input.metrics.impressions ?? null,
            },
          }
        : undefined,
      demographics: input.demographics
        ? {
            create: {
              ageRanges: input.demographics.ageRanges ?? {},
              genderSplit: input.demographics.genderSplit ?? {},
              topLocations: input.demographics.topLocations ?? [],
            },
          }
        : undefined,
    },
  });

  revalidatePath(`/creators/${input.creatorId}`);
  return { success: true, post: newPost };
}

export async function deletePost(postId: string, creatorId: string) {
  await requireAccess("/creators");
  const context = await requireContext();

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId, ...creatorScope(context) },
  });

  if (!creator) {
    throw new Error("Creator not found or access denied.");
  }

  await prisma.post.delete({
    where: { id: postId, creatorId },
  });

  revalidatePath(`/creators/${creatorId}`);
  return { success: true };
}

export async function getAllTags() {
  const tags = await prisma.contentTag.findMany({
    orderBy: { name: "asc" },
  });
  return tags.map((t) => t.name);
}

export async function getOrCreateConnectToken(creatorId: string) {
  await requireAccess("/creators");
  const context = await requireContext();

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId, ...creatorScope(context) },
    select: { id: true, connectToken: true, instagramConnectedAt: true, mountliftScore: true },
  });

  if (!creator) {
    throw new Error("Creator not found or access denied.");
  }

  if (creator.connectToken) {
    return { token: creator.connectToken };
  }

  const generatedToken = "ml_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  await prisma.creator.update({
    where: { id: creatorId },
    data: { connectToken: generatedToken },
  });

  revalidatePath(`/creators/${creatorId}`);
  return { token: generatedToken };
}


