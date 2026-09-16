import { Shield, Briefcase, Sparkles } from "lucide-react";
import { Role } from "@/lib/roles";

const ROLE_ICONS: Record<Role, typeof Shield> = {
  ADMIN: Shield,
  ACCOUNT_MANAGER: Briefcase,
  CREATOR_MANAGER: Sparkles,
};

const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  ADMIN: "Workspace Admin",
  ACCOUNT_MANAGER: "Brand Lead",
  CREATOR_MANAGER: "Talent Lead",
};

export default function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return null;
  const Icon = ROLE_ICONS[role];
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-medium text-[#FAF8F4]/80 tracking-wide">
      <Icon size={12} strokeWidth={2} className="text-gold shrink-0" />
      <span>{ROLE_DISPLAY_NAMES[role]}</span>
    </div>
  );
}