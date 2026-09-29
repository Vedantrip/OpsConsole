"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireBrandContext } from "@/lib/access";
import { BRAND_TERMS_VERSION } from "@/lib/brand-terms";

export async function acceptBrandTerms() {
  const context = await requireBrandContext();
  const user = await currentUser();

  await prisma.brandTermsAcceptance.upsert({
    where: { brandId_termsVersion: { brandId: context.brand.id, termsVersion: BRAND_TERMS_VERSION } },
    create: {
      brandId: context.brand.id,
      termsVersion: BRAND_TERMS_VERSION,
      acceptedByClerkUserId: context.clerkUserId,
      acceptedByName: user?.fullName ?? user?.firstName ?? null,
      acceptedByEmail: user?.primaryEmailAddress?.emailAddress ?? null,
    },
    update: {
      acceptedByClerkUserId: context.clerkUserId,
      acceptedByName: user?.fullName ?? user?.firstName ?? null,
      acceptedByEmail: user?.primaryEmailAddress?.emailAddress ?? null,
      acceptedAt: new Date(),
    },
  });

  revalidatePath("/brand");
  revalidatePath("/brand/terms");
}
