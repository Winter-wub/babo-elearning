import { auth } from "@/lib/auth";
import { HomeHeader } from "@/components/home/home-header";
import { HomeFooter } from "@/components/home/home-footer";
import { getAppName } from "@/lib/app-config";
import { getThemeSettings } from "@/actions/theme.actions";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, appName, themeSettings] = await Promise.all([
    auth(),
    getAppName(),
    getThemeSettings(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader
        isAuthenticated={!!session?.user}
        userRole={session?.user?.role}
        userName={session?.user?.name ?? undefined}
        appName={appName}
        logoUrl={themeSettings.logoSignedUrl || undefined}
      />
      <main className="flex-1">{children}</main>
      <HomeFooter />
    </div>
  );
}
