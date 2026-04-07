import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { CreateTenantForm } from "@/components/admin/create-tenant-form";

export const metadata: Metadata = {
  title: "สร้าง Tenant ใหม่",
};

export default async function NewTenantPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/tenants">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            กลับไปรายการ Tenants
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">สร้าง Tenant ใหม่</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          กรอกข้อมูลด้านล่างเพื่อเพิ่ม tenant ใหม่บนแพลตฟอร์ม
        </p>
      </div>

      <CreateTenantForm />
    </div>
  );
}
