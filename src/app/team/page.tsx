import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/require-access";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { assignBrand, assignCreator, publishUpdate, removeBrandAssignment, removeCreatorAssignment, setTeamRole } from "./actions";

const ROLES: Role[] = ["ADMIN", "ACCOUNT_MANAGER", "CREATOR_MANAGER"];

function staffName(user: { firstName: string | null; lastName: string | null; username: string | null; primaryEmailAddress: { emailAddress: string } | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.primaryEmailAddress?.emailAddress || "Unnamed user";
}

export default async function TeamAccessPage() {
  await requireAccess("/team");
  const clerk = await clerkClient();
  const [usersResponse, creators, brands, creatorAssignments, brandAssignments] = await Promise.all([
    clerk.users.getUserList({ limit: 100 }),
    prisma.creator.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.creatorManagerAssignment.findMany({ include: { creator: true }, orderBy: { createdAt: "desc" } }),
    prisma.accountManagerAssignment.findMany({ include: { brand: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const users = usersResponse.data.map(user => ({
    id: user.id,
    name: staffName(user),
    email: user.primaryEmailAddress?.emailAddress ?? "No primary email",
    role: ROLES.includes(user.publicMetadata?.role as Role) ? user.publicMetadata.role as Role : null,
    imageUrl: user.imageUrl,
  }));
  const creatorManagers = users.filter(user => user.role === "CREATOR_MANAGER");
  const accountManagers = users.filter(user => user.role === "ACCOUNT_MANAGER");

  return <div className="space-y-8">
    <header><p className="eyebrow">Staff administration</p><h1 className="text-3xl font-display font-bold tracking-tight">Team & Access</h1><p className="text-sm text-muted mt-1">Roles are saved to Clerk. Assignments below use the same Clerk user ID automatically.</p></header>

    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between"><div><h2 className="font-display font-semibold">Staff directory</h2><p className="text-xs text-muted mt-1">Set a person&apos;s access level without leaving MountLift.</p></div><span className="text-xs font-mono text-muted">{users.length} users</span></div>
      <div className="divide-y divide-line">{users.length === 0 ? <p className="p-6 text-sm text-muted">No Clerk users found.</p> : users.map(user => <div key={user.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0"><img src={user.imageUrl} alt="" className="w-9 h-9 rounded-full border border-line bg-paper object-cover" /><div className="min-w-0"><p className="font-medium text-ink truncate">{user.name}</p><p className="text-xs text-muted truncate">{user.email}</p><p className="text-[10px] font-mono text-muted mt-1">Clerk ID: {user.id}</p></div></div>
        <form action={setTeamRole.bind(null, user.id)} className="flex items-center gap-2 shrink-0"><select name="role" defaultValue={user.role ?? ""} className="input w-44 py-1.5 text-xs" required><option value="" disabled>Choose role…</option>{ROLES.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button className="btn btn-small">Save role</button></form>
      </div>)}</div>
    </section>

    <div className="grid lg:grid-cols-2 gap-6">
      <section className="card p-5 space-y-4"><div><h2 className="font-display font-semibold">Creator Manager assignments</h2><p className="text-xs text-muted mt-1">Only assigned creators and their profiles are visible to each manager.</p></div>
        <form action={assignCreator} className="grid gap-3"><select required name="clerkUserId" className="input"><option value="">Choose Creator Manager…</option>{creatorManagers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select><select required name="creatorId" className="input"><option value="">Choose creator…</option>{creators.map(creator => <option key={creator.id} value={creator.id}>{creator.name}</option>)}</select><button className="btn w-fit" disabled={!creatorManagers.length}>Assign creator</button></form>
        <div className="divide-y divide-line">{creatorAssignments.map(assignment => { const user = users.find(item => item.id === assignment.clerkUserId); return <div key={assignment.id} className="py-2 flex justify-between gap-3 text-sm"><span><b>{assignment.creator.name}</b><span className="block text-xs text-muted">{user?.name ?? assignment.clerkUserId}</span></span><form action={removeCreatorAssignment.bind(null, assignment.id)}><button className="text-xs text-amber">Remove</button></form></div>; })}</div>
      </section>
      <section className="card p-5 space-y-4"><div><h2 className="font-display font-semibold">Account Manager assignments</h2><p className="text-xs text-muted mt-1">Managers see only their assigned brand accounts and campaigns.</p></div>
        <form action={assignBrand} className="grid gap-3"><select required name="clerkUserId" className="input"><option value="">Choose Account Manager…</option>{accountManagers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select><select required name="brandId" className="input"><option value="">Choose brand…</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select><button className="btn w-fit" disabled={!accountManagers.length}>Assign brand</button></form>
        <div className="divide-y divide-line">{brandAssignments.map(assignment => { const user = users.find(item => item.id === assignment.clerkUserId); return <div key={assignment.id} className="py-2 flex justify-between gap-3 text-sm"><span><b>{assignment.brand.name}</b><span className="block text-xs text-muted">{user?.name ?? assignment.clerkUserId}</span></span><form action={removeBrandAssignment.bind(null, assignment.id)}><button className="text-xs text-amber">Remove</button></form></div>; })}</div>
      </section>
    </div>
    <section className="card p-5 max-w-2xl"><h2 className="font-display font-semibold">Send a private manager update</h2><p className="text-xs text-muted mt-1 mb-4">Visible only on the selected Creator Manager&apos;s dashboard.</p><form action={publishUpdate} className="grid gap-3"><select required name="targetClerkUserId" className="input"><option value="">Choose Creator Manager…</option>{creatorManagers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select><input required name="title" className="input" placeholder="Update title" /><textarea required name="body" className="input min-h-28" placeholder="Brief, instruction, or note…" /><button className="btn w-fit" disabled={!creatorManagers.length}>Publish update</button></form></section>
  </div>;
}
