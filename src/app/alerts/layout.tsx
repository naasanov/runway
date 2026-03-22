import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
