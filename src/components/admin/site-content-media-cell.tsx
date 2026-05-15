"use client";

import * as React from "react";
import { Loader2, Upload, X, ImageIcon, Video as VideoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSiteContentMediaUploadUrl } from "@/actions/content.actions";

// -----------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------

export interface SiteContentMediaCellProps {
  kind: "image" | "video";
  /** Current value (a `/api/marketing-assets/...` path or ""). */
  value: string;
  /** Called with the new public URL on successful upload, or "" on clear. */
  onChange: (newValue: string) => void;
  /** Used to nudge dirty-state tracking on the parent. */
  isDirty: boolean;
}

// -----------------------------------------------------------------------
// Upload helpers
// -----------------------------------------------------------------------

function putWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function SiteContentMediaCell({
  kind,
  value,
  onChange,
  isDirty,
}: SiteContentMediaCellProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const accept = kind === "image" ? IMAGE_ACCEPT : VIDEO_ACCEPT;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  const maxLabel =
    kind === "image" ? "8 MB (JPG, PNG, WebP, GIF)" : "200 MB (MP4, WebM)";

  const hasMedia = value.trim().length > 0;

  async function handleFile(file: File) {
    setError(null);
    if (file.size === 0) {
      setError("ไฟล์ว่าง");
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `ไฟล์ใหญ่เกินไป สูงสุด ${(maxBytes / 1024 / 1024).toFixed(0)} MB`,
      );
      return;
    }
    if (!accept.split(",").includes(file.type)) {
      setError("ประเภทไฟล์ไม่รองรับ");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const result = await getSiteContentMediaUploadUrl({
        filename: file.name,
        contentType: file.type,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      const { uploadUrl, publicUrl } = result.data;
      await putWithProgress(uploadUrl, file, setProgress);
      onChange(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleClear() {
    onChange("");
    setError(null);
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-md border p-3 transition-colors",
        isDirty
          ? "border-amber-400/60 dark:border-amber-500/40"
          : "border-input",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Preview */}
      {hasMedia && !uploading && (
        <div className="overflow-hidden rounded-md border bg-muted">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="ตัวอย่าง"
              className="max-h-24 w-auto object-contain"
            />
          ) : (
            <video
              src={value}
              controls
              preload="metadata"
              playsInline
              controlsList="nodownload"
              className="max-h-48 w-full"
            />
          )}
        </div>
      )}

      {/* Empty / uploading state */}
      {!hasMedia && !uploading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {kind === "image" ? (
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VideoIcon className="h-4 w-4" aria-hidden="true" />
          )}
          <span>ยังไม่มีไฟล์ — สูงสุด {maxLabel}</span>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            กำลังอัปโหลด {progress}%
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {hasMedia ? "เปลี่ยนไฟล์" : "อัปโหลดไฟล์"}
        </Button>
        {hasMedia && !uploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            aria-label="ลบไฟล์"
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            ลบ
          </Button>
        )}
      </div>

      {/* Hint: this field is upload-only — no paste URL */}
      <p className="text-[11px] text-muted-foreground">
        อัปโหลดไฟล์เท่านั้น — ค่าจะถูกเก็บเป็น URL ภายในระบบ
      </p>

      {error && (
        <p role="alert" className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Helpers: decide whether a key is a media key
// -----------------------------------------------------------------------

/** True when this key should render as an image upload. */
export function isImageKey(key: string): boolean {
  const segments = key.split(".");
  const suffix = segments[segments.length - 1];
  if (
    suffix === "photo" ||
    suffix === "imageUrl" ||
    suffix === "avatarUrl" ||
    suffix === "poster"
  ) {
    return true;
  }
  return false;
}

/** True when this key should render as a video upload (e.g. `about.video.url`). */
export function isVideoKey(key: string): boolean {
  const segments = key.split(".");
  const suffix = segments[segments.length - 1];
  if (suffix !== "url") return false;
  // The segment immediately before `.url` must be `video`
  return segments.length >= 2 && segments[segments.length - 2] === "video";
}

/** True if a key is any uploadable media. */
export function isMediaKey(key: string): boolean {
  return isImageKey(key) || isVideoKey(key);
}
