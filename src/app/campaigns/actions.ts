"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireContext, campaignScope } from "@/lib/access";
import { sendDeliverableAssignedEmail } from "@/lib/email";

function dateFromForm(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "");
  if (!name || !brandId) return;

  const startDate = dateFromForm(formData.get("startDate"));
  const endDate = dateFromForm(formData.get("endDate"));
  if (startDate && endDate && endDate < startDate) return { error: "The campaign due date must be after its start date." };

  await prisma.campaign.create({
    data: {
      name,
      brandId,
      budget: Number(formData.get("budget") ?? 0),
      startDate,
      endDate,
    },
  });

  revalidatePath("/campaigns");
  return { success: true };
}

export async function addDeliverable(campaignId: string, formData: FormData) {
  await requireAdmin();
  const creatorId = String(formData.get("creatorId") ?? "");
  if (!creatorId) return { error: "Select a creator before assigning the deliverable." };
  const dueDate = dateFromForm(formData.get("dueDate"));
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { startDate: true, endDate: true } });
  if (!campaign) return { error: "Campaign not found." };
  if (dueDate && campaign.startDate && dueDate < campaign.startDate) return { error: "This deadline is before the campaign start date." };
  if (dueDate && campaign.endDate && dueDate > campaign.endDate) return { error: "This deadline is after the campaign due date." };

  if (dueDate) {
    const followingDay = new Date(dueDate);
    followingDay.setDate(followingDay.getDate() + 1);
    const conflict = await prisma.deliverable.findFirst({
      where: { creatorId, dueDate: { gte: dueDate, lt: followingDay }, status: { notIn: ["APPROVED", "LIVE"] } },
      select: { type: true, campaign: { select: { name: true } } },
    });
    if (conflict) return { error: `This creator already has a ${conflict.type.toLowerCase()} due that day for ${conflict.campaign.name}. Choose another date.` };
  }

  const created = await prisma.deliverable.create({
    data: {
      campaignId,
      creatorId,
      type: String(formData.get("type") ?? "POST") as any,
      agreedRate: Number(formData.get("agreedRate") ?? 0),
      dueDate,
    },
    include: {
      creator: { select: { name: true, email: true, connectToken: true } },
      campaign: { select: { name: true, brand: { select: { name: true } } } },
    },
  });

  // Automated direct email notification to the creator
  if (created.creator.email) {
    try {
      const { getAppBaseUrl } = await import("@/lib/app-url");
      const baseUrl = getAppBaseUrl();
      const portalUrl = created.creator.connectToken ? `${baseUrl}/portal/${created.creator.connectToken}` : undefined;

      await sendDeliverableAssignedEmail({
        creatorEmail: created.creator.email,
        creatorName: created.creator.name,
        brandName: created.campaign.brand.name,
        campaignName: created.campaign.name,
        deliverableType: created.type,
        agreedRate: Number(created.agreedRate),
        dueDate: created.dueDate,
        portalUrl,
      });
    } catch (emailErr) {
      console.error("[Email Notification Error]", emailErr);
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateCampaign(id: string, formData: FormData) {
  const context = await requireContext();
  if (context.role === "CREATOR_MANAGER") return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const data: { name: string; status: any; budget?: number } = {
    name,
    status: String(formData.get("status") ?? "PLANNING") as any,
  };

  // Only touch budget if the field was actually present — Account Managers'
  // edit form omits it entirely, and we don't want that to zero it out.
  if (formData.has("budget")) {
    data.budget = Number(formData.get("budget") ?? 0);
  }

  const campaign = await prisma.campaign.findFirst({ where: { id, ...campaignScope(context) }, select: { id: true } });
  if (!campaign) return;
  await prisma.campaign.update({ where: { id }, data });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string) {
  await requireAdmin();
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function deleteDeliverable(id: string, campaignId: string) {
  await requireAdmin();
  await prisma.deliverable.delete({ where: { id } });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/finance");
}
