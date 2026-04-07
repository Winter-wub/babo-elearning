import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfile } from "@/actions/profile.actions";
import { ProfileForm } from "@/components/student/profile-form";

export const metadata: Metadata = {
  title: "โปรไฟล์ของฉัน",
};

export default async function ProfilePage() {
  // Defence-in-depth auth check
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const result = await getProfile();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">โปรไฟล์ของฉัน</h1>
        </div>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">โปรไฟล์ของฉัน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ดูและจัดการข้อมูลบัญชีของคุณ
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <ProfileForm profile={result.data} />
      </div>
    </div>
  );
}
