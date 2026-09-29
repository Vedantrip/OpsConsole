"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireBrandContext } from "@/lib/access";

export async function reviewDeliverable(deliverableId: string, formData: FormData) {
  const context = await requireBrandContext();
  const status = String(formData.get("status") ?? "");
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!["APPROVED", "IN_PROGRESS"].includes(status)) return;
  if (status === "IN_PROGRESS" && !feedback) return;

  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { brandId: context.brand.id } },
    select: { id: true, campaignId: true },
  });
  if (!deliverable) return;

  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: {
      status: status as "APPROVED" | "IN_PROGRESS",
      brandFeedback: feedback || null,
      brandReviewedAt: new Date(),
    },
  });

  revalidatePath("/brand");
  revalidatePath("/messages");
  revalidatePath(`/brand/campaigns/${deliverable.campaignId}`);
}
