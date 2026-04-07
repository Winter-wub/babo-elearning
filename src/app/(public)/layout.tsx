import { auth } from "@/lib/auth";
import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { getAppName } from "@/lib/app-config";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const appName = await getAppName();

  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader
        isAuthenticated={!!session?.user}
        userRole={session?.user?.role as any}
        userName={session?.user?.name ?? undefined}
        appName={appName}
      />
      <main className="flex-1">{children}</main>
      <HomeFooter />
    </div>
  );
}
