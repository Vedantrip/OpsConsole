export type Role = "ADMIN" | "ACCOUNT_MANAGER" | "CREATOR_MANAGER" | "BRAND";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  ACCOUNT_MANAGER: "Account Manager",
  CREATOR_MANAGER: "Creator Manager",
  BRAND: "Brand",
};

const ROLE_ROUTES: Record<Role, string[]> = {
  ADMIN: ["/", "/creators", "/brands", "/campaigns", "/messages", "/finance", "/insights", "/team", "/brand-terms"],
  ACCOUNT_MANAGER: ["/", "/campaigns", "/messages"],
  CREATOR_MANAGER: ["/", "/creators", "/campaigns", "/messages", "/insights"],
  BRAND: ["/", "/brand-terms", "/brand"],
};

export function canAccess(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  return ROLE_ROUTES[role].some((r) =>
    r === "/" ? pathname === "/" : pathname === r || pathname.startsWith(r + "/")
  );
}

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
  if (role === "BRAND") {
    return [
      { href: "/", label: "Dashboard" },
      { href: "/brand", label: "Campaigns" },
      { href: "/messages", label: "Messages" },
      { href: "/brand-terms", label: "Terms" },
    ];
  }
  return all.filter((link) => canAccess(role, link.href));
}
