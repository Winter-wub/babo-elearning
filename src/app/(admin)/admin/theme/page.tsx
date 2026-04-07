import type { Metadata } from "next";
import { Suspense } from "react";
import { Palette } from "lucide-react";
import { ThemeEditor } from "@/components/admin/theme-editor";
import { Spinner } from "@/components/ui/spinner";
import { getThemeSettings } from "@/actions/theme.actions";
import { getDeploymentTenantId } from "@/lib/tenant";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "ตั้งค่าธีม",
};

// -----------------------------------------------------------------------
// Async data-fetching sub-component
// -----------------------------------------------------------------------

async function ThemeEditorLoader() {
  const tenantId = await getDeploymentTenantId();
  const settings = await getThemeSettings(tenantId);
  return <ThemeEditor settings={settings} />;
}

// -----------------------------------------------------------------------
// Page — Server Component
// -----------------------------------------------------------------------

export default async function AdminThemePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Palette className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่าธีม</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ปรับแต่งสี โหมดสี ความโค้งมน และโลโก้ของเว็บไซต์ — ดูตัวอย่างแบบเรียลไทม์ก่อนบันทึก
          </p>
        </div>
      </div>

      {/* Theme editor */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        }
      >
        <ThemeEditorLoader />
      </Suspense>
    </div>
  );
}
