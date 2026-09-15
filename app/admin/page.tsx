import { isLoggedIn, adminConfigured } from "@/lib/admin/auth";
import { listAll, totals } from "@/lib/db/repo";
import { LoginForm } from "./LoginForm";
import { AdminPanel } from "./AdminPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理画面",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isLoggedIn())) {
    return <LoginForm configured={adminConfigured()} />;
  }
  const [items, stats] = await Promise.all([listAll(), totals()]);
  return <AdminPanel items={items} stats={stats} />;
}
