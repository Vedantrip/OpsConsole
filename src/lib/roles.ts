export type Role = "ADMIN" | "ACCOUNT_MANAGER" | "CREATOR_MANAGER";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ACCOUNT_MANAGER: "Account Manager",
  CREATOR_MANAGER: "Creator Manager",
};

// Routes each role is allowed to visit. "/" (dashboard) is allowed for everyone —
// the dashboard itself renders differently per role instead of being gated.
const ROLE_ROUTES: Record<Role, string[]> = {
  ADMIN: ["/", "/creators", "/brands", "/campaigns", "/messages", "/finance", "/insights", "/team"],
  ACCOUNT_MANAGER: ["/", "/campaigns", "/messages"],
  CREATOR_MANAGER: ["/", "/creators", "/campaigns", "/messages", "/insights"],
};

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  return ROLE_ROUTES[role].some((r) =>
    r === "/" ? pathname === "/" : pathname === r || pathname.startsWith(r + "/")
  );
}

// Only Admins see dollar figures (budgets, payouts, invoices, profit) for now.
// If a Finance role gets added later, this is the one place to extend.
export function canSeeMoney(role: Role | null): boolean {
  return role === "ADMIN";
}

export function navLinksForRole(role: Role | null) {
  const all = [
    { href: "/", label: "Dashboard" },
    { href: "/creators", label: "Creators" },
    { href: "/brands", label: "Brands" },
    { href: "/campaigns", label: "Campaigns" },
    { href: "/messages", label: "Messages" },
    { href: "/finance", label: "Finance" },
    { href: "/insights", label: "Insights" },
    { href: "/team", label: "Team & Access" },
  ];
  return all.filter((link) => canAccess(role, link.href));
}
