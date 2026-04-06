import type { Metadata } from "next";
import { Suspense } from "react";
import { FaqTable } from "@/components/admin/faq-table";
import { Spinner } from "@/components/ui/spinner";
import { getFaqs } from "@/actions/faq.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "จัดการคำถามที่พบบ่อย",
};

// -----------------------------------------------------------------------
// Async data-fetching sub-component
// -----------------------------------------------------------------------

async function FaqContent() {
  const result = await getFaqs(true);

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <FaqTable faqs={result.data} />;
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AdminFaqPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          จัดการคำถามที่พบบ่อย
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จัดการคำถามที่พบบ่อยที่แสดงบนหน้าคำถามที่พบบ่อยสาธารณะ
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <FaqContent />
      </Suspense>
    </div>
  );
}
