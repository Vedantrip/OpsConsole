"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { sendPayoutNotificationEmail } from "@/lib/email";

function amount(formData: FormData) {
  const value = Number(formData.get("amount"));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function createPayout(deliverableId: string, campaignId: string, formData: FormData) {
  await requireAdmin();
  const value = amount(formData);
  if (value === null) return;

  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaignId },
    include: {
      creator: { select: { name: true, email: true, connectToken: true } },
      campaign: { select: { name: true, brand: { select: { name: true } } } },
    },
  });
  if (!deliverable) return;

  const payout = await prisma.payout.create({
    data: { deliverableId, amount: value },
  });

  // Direct automated notification
  if (deliverable.creator.email) {
    try {
      const { getAppBaseUrl } = await import("@/lib/app-url");
      const baseUrl = getAppBaseUrl();
      const portalUrl = deliverable.creator.connectToken ? `${baseUrl}/portal/${deliverable.creator.connectToken}` : undefined;

      await sendPayoutNotificationEmail({
        creatorEmail: deliverable.creator.email,
        creatorName: deliverable.creator.name,
        amount: Number(payout.amount),
        status: payout.status,
        reference: `${deliverable.campaign.brand.name} · ${deliverable.campaign.name}`,
        portalUrl,
      });
    } catch (err) {
      console.error("[Payout Email Error]", err);
    }
  }

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function createInvoice(brandId: string, campaignId: string, formData: FormData) {
  await requireAdmin();
  const value = amount(formData);
  if (value === null) return;
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, brandId }, select: { id: true } });
  if (!campaign) return;
  await prisma.invoice.create({ data: { brandId, campaignId, amount: value, status: "DRAFT" } });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/campaigns");
  revalidatePath("/finance");
  revalidatePath("/");
}

export async function updatePayout(id: string, formData: FormData) {
  await requireAdmin();
  const value = amount(formData);
  if (value === null) return;
  const status = String(formData.get("status"));
  if (!['PENDING', 'APPROVED', 'PAID'].includes(status)) return;

  const updated = await prisma.payout.update({
    where: { id },
    data: { amount: value, status: status as any, paidAt: status === "PAID" ? new Date() : null },
    include: {
      deliverable: {
        include: {
          creator: { select: { name: true, email: true, connectToken: true } },
          campaign: { select: { name: true, brand: { select: { name: true } } } },
        },
      },
    },
  });

  if (updated.deliverable.creator.email && (status === "APPROVED" || status === "PAID")) {
    try {
      const { getAppBaseUrl } = await import("@/lib/app-url");
      const baseUrl = getAppBaseUrl();
      const portalUrl = updated.deliverable.creator.connectToken ? `${baseUrl}/portal/${updated.deliverable.creator.connectToken}` : undefined;

      await sendPayoutNotificationEmail({
        creatorEmail: updated.deliverable.creator.email,
        creatorName: updated.deliverable.creator.name,
        amount: Number(updated.amount),
        status: updated.status,
        reference: `${updated.deliverable.campaign.brand.name} · ${updated.deliverable.campaign.name}`,
        portalUrl,
      });
    } catch (err) {
      console.error("[Payout Update Email Error]", err);
    }
  }

  revalidatePath("/finance");
  revalidatePath("/campaigns");
  revalidatePath("/");
}

export async function updateInvoice(id: string, formData: FormData) {
  await requireAdmin();
  const value = amount(formData);
  if (value === null) return;
  const status = String(formData.get("status"));
  if (!['DRAFT', 'SENT', 'PAID', 'OVERDUE'].includes(status)) return;
  await prisma.invoice.update({ where: { id }, data: { amount: value, status: status as any, paidAt: status === "PAID" ? new Date() : null } });
  revalidatePath("/finance");
  revalidatePath("/campaigns");
  revalidatePath("/");
}

export async function markPayoutPaid(id: string) {
  await requireAdmin();
  const updated = await prisma.payout.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
    include: {
      deliverable: {
        include: {
          creator: { select: { name: true, email: true, connectToken: true } },
          campaign: { select: { name: true, brand: { select: { name: true } } } },
        },
      },
    },
  });

  if (updated.deliverable.creator.email) {
    try {
      const { getAppBaseUrl } = await import("@/lib/app-url");
      const baseUrl = getAppBaseUrl();
      const portalUrl = updated.deliverable.creator.connectToken ? `${baseUrl}/portal/${updated.deliverable.creator.connectToken}` : undefined;

      await sendPayoutNotificationEmail({
        creatorEmail: updated.deliverable.creator.email,
        creatorName: updated.deliverable.creator.name,
        amount: Number(updated.amount),
        status: "PAID (CLEARED)",
        reference: `${updated.deliverable.campaign.brand.name} · ${updated.deliverable.campaign.name}`,
        portalUrl,
      });
    } catch (err) {
      console.error("[Payout Cleared Email Error]", err);
    }
  }

  revalidatePath("/finance");
}

export async function markInvoicePaid(id: string) {
  await requireAdmin();
  await prisma.invoice.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidatePath("/finance");
}
