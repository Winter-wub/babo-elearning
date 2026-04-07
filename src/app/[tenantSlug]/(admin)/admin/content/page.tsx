import type { Metadata } from "next";
import { Suspense } from "react";
import { FileEdit } from "lucide-react";
import { ContentEditor } from "@/components/admin/content-editor";
import { Spinner } from "@/components/ui/spinner";
import { getAllSiteContent } from "@/actions/content.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "จัดการเนื้อหา",
};

// -----------------------------------------------------------------------
// Async data-fetching sub-component (keeps the outer page a pure RSC)
// -----------------------------------------------------------------------

async function ContentEditorLoader() {
  const result = await getAllSiteContent();

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <ContentEditor entries={result.data} />;
}

// -----------------------------------------------------------------------
// Page — Server Component
// -----------------------------------------------------------------------

export default function AdminContentPage() {
  return (
    /*
     * max-w-none lets the split-pane editor use the full admin shell width.
     * The ContentEditor's own xl:grid-cols-[1fr_420px] handles internal layout.
     */
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <FileEdit className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">จัดการเนื้อหา</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            แก้ไขข้อความทั่วทั้งเว็บไซต์ — การเปลี่ยนแปลงจะแสดงผลบนหน้าสาธารณะทันทีหลังบันทึก
          </p>
        </div>
      </div>

      {/* Split-pane editor — loaded asynchronously */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        }
      >
        <ContentEditorLoader />
      </Suspense>
    </div>
  );
}
