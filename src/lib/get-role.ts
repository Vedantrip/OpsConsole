import { currentUser } from "@clerk/nextjs/server";
import { Role } from "./roles";

export async function getRole(): Promise<Role | null> {
  const user = await currentUser();
  const role = user?.publicMetadata?.role as string | undefined;
  if (role === "ADMIN" || role === "ACCOUNT_MANAGER" || role === "CREATOR_MANAGER" || role === "BRAND") {
    return role;
  }
  return null;
}
