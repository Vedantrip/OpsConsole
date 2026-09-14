import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getUnreadMessageCount } from "@/lib/message-notifications";
import { getRole } from "@/lib/get-role";
import { navLinksForRole } from "@/lib/roles";
import RoleBadge from "./role-badge";
import ThemeToggle from "./theme-toggle";
import SidebarNav from "./sidebar-nav";

export default async function Sidebar() {
  const role = await getRole();
  const links = navLinksForRole(role);
  const session = await auth();
  const unreadMessageCount = role && session.userId ? await getUnreadMessageCount({ role, clerkUserId: session.userId }) : 0;

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-paper md:hidden">
        <details className="group">
          <summary className="list-none px-4 py-3 transition-colors hover:bg-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display font-bold text-base tracking-tight text-paper flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-[7px] bg-lift text-white flex items-center justify-center text-[10px] font-sans">ml</span>
                  MountLift
                </div>
                <div className="text-[10px] tracking-[0.1em] text-muted mt-0.5">agency ops console</div>
              </div>
              <span className="rounded-full border border-lift/40 bg-lift/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-lift">
                Menu
              </span>
            </div>
          </summary>
          <div className="border-t border-line px-4 py-3 space-y-3 bg-panel/90">
            <RoleBadge role={role} />
            <SidebarNav links={links} mobile unreadMessageCount={unreadMessageCount} />
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
            </div>
          </div>
        </details>
      </header>

      <aside className="hidden md:flex w-64 shrink-0 bg-charcoal text-[#FAF8F4] h-screen sticky top-0 flex-col relative overflow-hidden border-r border-[#332E27]">
        {/* Subtle geometric watermark */}
        <svg
          className="absolute -top-12 -right-12 w-56 h-56 opacity-[0.04] pointer-events-none text-gold"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="px-5 py-5 border-b border-[#332E27] relative">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-sans font-bold text-base tracking-tight text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-gold text-charcoal flex items-center justify-center text-xs font-bold font-mono">
                  ML
                </span>
                MountLift
              </div>
              <div className="text-[11px] tracking-wider uppercase text-muted mt-1 font-mono">
                OpsConsole
              </div>
            </div>
          </div>
          <div className="mt-4">
            <RoleBadge role={role} />
          </div>
        </div>

        <SidebarNav links={links} unreadMessageCount={unreadMessageCount} />

        <div className="px-4 py-3 border-t border-[#332E27] flex items-center justify-between gap-3 relative bg-black/20">
          <ThemeToggle iconOnly />
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </aside>
    </>
  );
}
