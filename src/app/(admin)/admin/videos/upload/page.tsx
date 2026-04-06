import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { VideoUploadForm } from "@/components/video/video-upload-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "อัปโหลดวิดีโอ",
};

export default function AdminVideoUploadPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/videos">
            <ChevronLeft className="h-4 w-4" />
            กลับไปที่วิดีโอ
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">อัปโหลดวิดีโอ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          อัปโหลดวิดีโอใหม่ไปยังแพลตฟอร์ม นักเรียนจะยังไม่เห็นจนกว่าคุณจะให้สิทธิ์การเข้าถึง
        </p>
      </div>

      {/* Upload form */}
      <VideoUploadForm />
    </div>
  );
}
