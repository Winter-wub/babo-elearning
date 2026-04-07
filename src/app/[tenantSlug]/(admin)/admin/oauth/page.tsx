import type { Metadata } from "next";
import { Suspense } from "react";
import { LogIn } from "lucide-react";
import { OAuthEditor } from "@/components/admin/oauth-editor";
import { Spinner } from "@/components/ui/spinner";
import { getOAuthProviderConfigs } from "@/actions/oauth.actions";

export const metadata: Metadata = {
  title: "ตั้งค่าผู้ให้บริการเข้าสู่ระบบ",
};

async function OAuthEditorLoader() {
  const providers = await getOAuthProviderConfigs();
  return <OAuthEditor providers={providers} />;
}

export default function AdminOAuthPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <LogIn className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            ตั้งค่าผู้ให้บริการเข้าสู่ระบบ
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            เปิด/ปิดและกำหนดค่า OAuth สำหรับ Google, Facebook และ Apple
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        }
      >
        <OAuthEditorLoader />
      </Suspense>
    </div>
  );
}
