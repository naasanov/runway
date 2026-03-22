import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ScenariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <>{children}</>;
}
