import { redirect } from "next/navigation";
import { getRole } from "@/lib/get-role";
import AdminDashboard from "@/components/dashboards/admin-dashboard";
import AccountManagerDashboard from "@/components/dashboards/account-manager-dashboard";
import CreatorManagerDashboard from "@/components/dashboards/creator-manager-dashboard";
import BrandDashboard from "@/app/brand/page";

export default async function DashboardPage() {
  const role = await getRole();
  if (!role) redirect("/pending-access");

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "ACCOUNT_MANAGER") return <AccountManagerDashboard />;
  return <CreatorManagerDashboard />;
}