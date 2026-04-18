import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogsTable } from "@/components/admin/audit-logs-table";
import { Spinner } from "@/components/ui/spinner";
import {
  getAuditLogs,
  getAuditActionTypes,
  getAuditEntityTypes,
} from "@/actions/audit.actions";

// -----------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------

export const metadata: Metadata = {
  title: "บันทึกการดำเนินการ",
};

// -----------------------------------------------------------------------
// Search-param types
// -----------------------------------------------------------------------

interface AuditLogsPageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entityType?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}

// -----------------------------------------------------------------------
// Async data-fetching sub-component
// -----------------------------------------------------------------------

async function AuditLogsContent({ searchParams }: AuditLogsPageProps) {
  const params = await searchParams;

  const [logsResult, actionTypesResult, entityTypesResult] = await Promise.all([
    getAuditLogs({
      page: params.page ? Number(params.page) : 1,
      pageSize: 20,
      action: params.action,
      entityType: params.entityType,
      search: params.search,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
    }),
    getAuditActionTypes(),
    getAuditEntityTypes(),
  ]);

  if (!logsResult.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {logsResult.error}
      </div>
    );
  }

  return (
    <AuditLogsTable
      logs={logsResult.data.items}
      meta={logsResult.data.meta}
      actionTypes={actionTypesResult.success ? actionTypesResult.data : []}
      entityTypes={entityTypesResult.success ? entityTypesResult.data : []}
    />
  );
}

// -----------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------

export default function AdminAuditLogsPage(props: AuditLogsPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          บันทึกการดำเนินการ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ติดตามการดำเนินการของผู้ดูแลระบบทั้งหมด
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <AuditLogsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
