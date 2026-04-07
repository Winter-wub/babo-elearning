import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactsTable } from "@/components/admin/contacts-table";
import { Spinner } from "@/components/ui/spinner";
import { getContactSubmissions } from "@/actions/contact.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "ข้อความติดต่อ",
};

// -----------------------------------------------------------------------
// Search-param types
// -----------------------------------------------------------------------

interface AdminContactsPageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
  }>;
}

// -----------------------------------------------------------------------
// Async data-fetching sub-component
// -----------------------------------------------------------------------

async function ContactsContent({ searchParams }: AdminContactsPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const filter = (params.filter as "all" | "read" | "unread") ?? "all";

  const result = await getContactSubmissions(page, 20, filter);

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <ContactsTable
      submissions={result.data.items}
      meta={result.data.meta}
    />
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AdminContactsPage(props: AdminContactsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          ข้อความติดต่อ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ดูและจัดการข้อความที่ส่งผ่านแบบฟอร์มติดต่อ
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <ContactsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
