"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_THUMBNAIL_SIZE_BYTES, ACCEPTED_THUMBNAIL_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface ThumbnailUploadWidgetProps {
  /** R2 key of the currently saved thumbnail, or null. */
  imageKey: string | null;
  /** Display URL (proxied R2 URL or legacy external URL), or null. */
  imageUrl: string | null;
  /** Called when an upload completes or user removes the image. */
  onChange: (update: { key: string | null; url: string | null }) => void;
  /** Server action to get presigned upload URL. */
  getUploadUrl: (filename: string, contentType: string) => Promise<{ success: true; data: { uploadUrl: string; key: string } } | { success: false; error: string }>;
  /** Label text. */
  label?: string;
  className?: string;
}

// -----------------------------------------------------------------------
// Accept map for react-dropzone — derived from the shared constant
// -----------------------------------------------------------------------

const MIME_TO_EXT: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

const ACCEPT_MAP = Object.fromEntries(
  ACCEPTED_THUMBNAIL_TYPES.map((mime) => [mime, MIME_TO_EXT[mime] ?? []])
);

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function ThumbnailUploadWidget({
  imageKey,
  imageUrl,
  onChange,
  getUploadUrl,
  label = "รูปตัวอย่าง",
  className,
}: ThumbnailUploadWidgetProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasImage = Boolean(imageUrl);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        setError(`ไฟล์ใหญ่เกินไป สูงสุด ${MAX_THUMBNAIL_SIZE_BYTES / 1024 / 1024} MB`);
        return;
      }
      if (file.size === 0) {
        setError("ไฟล์ว่าง");
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const result = await getUploadUrl(file.name, file.type);
        if (!result.success) {
          setError(result.error);
          return;
        }

        const { uploadUrl, key } = result.data;
        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!putResponse.ok) {
          setError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
          return;
        }

        onChange({ key, url: `/api/thumbnails/${key}` });
      } catch {
        setError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
      } finally {
        setUploading(false);
      }
    },
    [getUploadUrl, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: () => {
      setError("ประเภทไฟล์ไม่ถูกต้อง รองรับ: PNG, JPEG, WebP");
    },
    accept: ACCEPT_MAP,
    maxFiles: 1,
    multiple: false,
    disabled: uploading,
    noClick: false,
    noKeyboard: false,
  });

  function handleRemove() {
    onChange({ key: null, url: null });
    setError(null);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>

      {/* Upload area */}
      {hasImage && !uploading ? (
        /* Uploaded state — show preview */
        <div className="relative h-40 w-72 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl!}
            alt="Thumbnail preview"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        /* Empty / uploading state — drop zone */
        <div
          {...getRootProps()}
          className={cn(
            "flex h-40 w-72 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            uploading && "cursor-not-allowed border-solid opacity-60",
            isDragActive && !uploading && "border-primary bg-primary/5",
            !isDragActive && !uploading && "border-muted-foreground/25 hover:border-muted-foreground/40",
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">
                คลิกหรือลากไฟล์มาวาง
              </span>
              <span className="text-xs text-muted-foreground/70">
                PNG, JPEG, WebP — สูงสุด {MAX_THUMBNAIL_SIZE_BYTES / 1024 / 1024}MB
              </span>
            </>
          )}
        </div>
      )}

      {/* Action buttons (visible when image exists) */}
      {hasImage && !uploading && (
        <div className="flex w-72 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={open}
            className="flex-1"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            เปลี่ยนรูป
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            aria-label="Remove thumbnail"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Aspect ratio hint */}
      {!uploading && (
        <p className="text-xs text-muted-foreground">แนะนำ 16:9</p>
      )}

      {/* Error message */}
      {error && (
        <p role="alert" className="text-xs text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
