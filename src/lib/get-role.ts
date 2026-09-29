import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Role } from "./roles";

export async function getRole(): Promise<Role | null> {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (role === "ADMIN" || role === "ACCOUNT_MANAGER" || role === "CREATOR_MANAGER") {
    return role;
  }

  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (email) {
    const brandAccess = await prisma.brandPortalAccess.findFirst({
      where: { email },
      select: { id: true },
    });
    if (brandAccess) return "BRAND";
  }

  return null;
}
