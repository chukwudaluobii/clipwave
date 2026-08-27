import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBalance } from "@/lib/credits";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/dashboard");

  const credits = await getBalance(user.id);
  const plan = user.subscription?.plan ?? "STARTER";

  return (
    <div className="flex min-h-screen bg-ink-900">
      <DashboardSidebar credits={credits} plan={plan} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
