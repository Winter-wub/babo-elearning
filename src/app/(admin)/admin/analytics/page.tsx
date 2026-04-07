import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getAnalyticsData } from "@/actions/analytics.actions";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { Spinner } from "@/components/ui/spinner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "วิเคราะห์",
};

async function AnalyticsContent() {
  const data = await getAnalyticsData();
  return <AnalyticsCharts data={data} />;
}

export default async function AdminAnalyticsPage() {
  // Defence-in-depth auth check
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.tenantRole !== "OWNER" && session.user.tenantRole !== "ADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">วิเคราะห์</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สถิติการใช้งานแพลตฟอร์มและแนวโน้ม
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
