import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { Spinner } from "@/components/ui/spinner";
import { getUsers } from "@/actions/user.actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "จัดการผู้ใช้",
};

interface AdminUsersPageProps {
  searchParams: Promise<{
    search?: string;
    role?: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    isActive?: string;
    page?: string;
    sortBy?: "name" | "email" | "createdAt";
    sortOrder?: "asc" | "desc";
  }>;
}

async function UsersContent({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;

  const result = await getUsers({
    search: params.search,
    role: params.role as "STUDENT" | "ADMIN" | undefined,
    isActive:
      params.isActive === "true"
        ? true
        : params.isActive === "false"
        ? false
        : undefined,
    page: params.page ? Number(params.page) : 1,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <UsersTable users={result.data.items} meta={result.data.meta} />
  );
}

export default async function AdminUsersPage(props: AdminUsersPageProps) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.tenantRole !== "OWNER" && session.user.tenantRole !== "ADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">จัดการผู้ใช้</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างและจัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึงวิดีโอ
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <UsersContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
