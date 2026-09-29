"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { BRAND_TERMS_VERSION } from "@/lib/brand-terms";

export async function acceptBrandTerms(brandId: string, accepted: boolean) {
  const context = await requireAdmin();
  if (!accepted) return;

  const user = await currentUser();

  await prisma.brandTermsAcceptance.upsert({
    where: {
      brandId_termsVersion: {
        brandId,
        termsVersion: BRAND_TERMS_VERSION,
      },
    },
    create: {
      brandId,
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

  revalidatePath("/brands");
}

export async function enableBrandPortal(brandId: string) {
  await requireAdmin();
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { contactEmail: true } });
  const email = brand?.contactEmail?.trim().toLowerCase();
  if (!email) return { error: "Add the brand's verified contact email before enabling portal access." };

  await prisma.brandPortalAccess.upsert({
    where: { brandId_email: { brandId, email } },
    create: { brandId, email },
    update: {},
  });
  revalidatePath("/brands");
  return { success: true };
}

export async function createBrand(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.brand.create({
    data: {
      name,
      contactName: String(formData.get("contactName") ?? "") || null,
      contactEmail: String(formData.get("contactEmail") ?? "") || null,
    },
  });

  revalidatePath("/brands");
}

export async function deleteBrand(id: string) {
  await requireAdmin();
  await prisma.payout.deleteMany({
    where: { deliverable: { campaign: { brandId: id } } },
  });
  await prisma.deliverable.deleteMany({
    where: { campaign: { brandId: id } },
  });
  await prisma.invoice.deleteMany({
    where: { brandId: id },
  });
  await prisma.campaign.deleteMany({
    where: { brandId: id },
  });
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/brands");
  revalidatePath("/campaigns");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function updateBrand(id: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.brand.update({
    where: { id },
    data: {
      name,
      contactName: String(formData.get("contactName") ?? "") || null,
      contactEmail: String(formData.get("contactEmail") ?? "") || null,
    },
  });

  revalidatePath("/brands");
}
