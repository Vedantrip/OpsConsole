import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRole } from "./get-role";
import type { Role } from "./roles";
import { prisma } from "./prisma";

export type AccessContext = { role: Role; clerkUserId: string };

export async function requireContext(): Promise<AccessContext> {
  const [role, session] = await Promise.all([getRole(), auth()]);
  if (!role || !session.userId) redirect("/pending-access");
  return { role, clerkUserId: session.userId };
}

export async function requireAdmin(): Promise<AccessContext> {
  const context = await requireContext();
  if (context.role !== "ADMIN") redirect("/");
  return context;
}

export async function requireBrandContext() {
  const context = await requireContext();
  if (context.role !== "BRAND") redirect("/");
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) redirect("/pending-access");

  const access = await prisma.brandPortalAccess.findFirst({
    where: { email },
    include: { brand: true },
  });
  if (!access) redirect("/pending-access");

  return { ...context, brand: access.brand };
}

export function creatorScope(context: AccessContext) {
  if (context.role === "ADMIN") return {};
  if (context.role === "CREATOR_MANAGER") {
    return { managerAssignments: { some: { clerkUserId: context.clerkUserId } } };
  }
  return {
    deliverables: {
      some: { campaign: { brand: { accountManagerAssignments: { some: { clerkUserId: context.clerkUserId } } } } },
    },
  };
}

export function brandScope(context: AccessContext) {
  if (context.role === "ADMIN") return {};
  if (context.role === "BRAND") return { id: "__brand_portal_only__" };
  return { accountManagerAssignments: { some: { clerkUserId: context.clerkUserId } } };
}

export function campaignScope(context: AccessContext) {
  if (context.role === "ADMIN") return {};
  if (context.role === "BRAND") return { brandId: "__brand_portal_only__" };
  if (context.role === "ACCOUNT_MANAGER") {
    return { brand: { accountManagerAssignments: { some: { clerkUserId: context.clerkUserId } } } };
  }
  return { deliverables: { some: { creator: { managerAssignments: { some: { clerkUserId: context.clerkUserId } } } } } };
}
