import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
