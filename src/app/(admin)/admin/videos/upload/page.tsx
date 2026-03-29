import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { VideoUploadForm } from "@/components/video/video-upload-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Upload Video",
};

export default function AdminVideoUploadPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/videos">
            <ChevronLeft className="h-4 w-4" />
            Back to Videos
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Video</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a new video to the platform. Students will not see it until you grant them access.
        </p>
      </div>

      {/* Upload form */}
      <VideoUploadForm />
    </div>
  );
}
