"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadCloud, FileVideo, X, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUploadPresignedUrl, createVideo } from "@/actions/video.actions";
import {
  MAX_VIDEO_DURATION,
  MAX_UPLOAD_SIZE_BYTES,
  ACCEPTED_VIDEO_MIME_TYPES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UploadPhase =
  | "idle"         // Nothing selected yet
  | "validating"   // Reading video metadata in the browser
  | "ready"        // File passes client-side checks, form editable
  | "uploading"    // PUT to R2 in progress
  | "saving"       // createVideo server action in flight
  | "success"      // All done
  | "error";       // Terminal error state

// ---------------------------------------------------------------------------
// Validation schema (metadata fields only; file is validated separately)
// ---------------------------------------------------------------------------

const metadataSchema = z.object({
  title: z.string().min(1, "จำเป็นต้องระบุชื่อเรื่อง").max(255, "ชื่อเรื่องยาวเกินไป"),
  description: z.string().max(2000, "คำอธิบายต้องไม่เกิน 2000 ตัวอักษร").optional(),
});

type MetadataValues = z.infer<typeof metadataSchema>;

// ---------------------------------------------------------------------------
// Helper: read video duration from a File using an HTMLVideoElement
// ---------------------------------------------------------------------------

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => URL.revokeObjectURL(url);

    // Abort if metadata takes too long (e.g. extremely large files on slow disks).
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out reading video metadata."));
    }, 15_000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      cleanup();
      if (!isFinite(video.duration) || video.duration <= 0) {
        reject(new Error("Could not determine video duration."));
      } else {
        resolve(Math.round(video.duration));
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("Failed to read video file. The format may be unsupported."));
    };

    video.src = url;
  });
}

// ---------------------------------------------------------------------------
// Helper: format bytes into a human-readable string
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Helper: format seconds as hh:mm:ss or mm:ss
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = h > 0
    ? [h, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
    : [m, String(s).padStart(2, "0")];
  return parts.join(":");
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VideoUploadForm() {
  const router = useRouter();

  // --- Upload state machine ---
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Selected file info ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // --- Drag-over visual feedback ---
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // --- React Hook Form ---
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { title: "", description: "" },
  });

  // -------------------------------------------------------------------------
  // File validation & selection
  // -------------------------------------------------------------------------

  const handleFileSelected = useCallback(
    async (file: File) => {
      // Reset any previous error
      setErrorMessage(null);
      setPhase("validating");
      setSelectedFile(null);
      setVideoDuration(null);

      // MIME type check
      const acceptedTypes: readonly string[] = ACCEPTED_VIDEO_MIME_TYPES;
      if (!acceptedTypes.includes(file.type) && !file.type.startsWith("video/")) {
        setPhase("error");
        setErrorMessage(
          `ไม่รองรับประเภทไฟล์: ${file.type || "ไม่ทราบ"} กรุณาอัปโหลดวิดีโอ MP4 หรือ WebM`
        );
        return;
      }

      // Size check
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setPhase("error");
        setErrorMessage(
          `ไฟล์มีขนาดใหญ่เกินไป (${formatBytes(file.size)}) ขนาดสูงสุดที่อนุญาตคือ ${formatBytes(MAX_UPLOAD_SIZE_BYTES)}`
        );
        return;
      }

      // Duration check using HTML5 video element
      let duration: number;
      try {
        duration = await getVideoDuration(file);
      } catch (err) {
        setPhase("error");
        setErrorMessage(
          err instanceof Error ? err.message : "ไม่สามารถอ่านความยาววิดีโอได้"
        );
        return;
      }

      if (duration > MAX_VIDEO_DURATION) {
        setPhase("error");
        setErrorMessage(
          `วิดีโอยาวเกินไป (${formatDuration(duration)}) ความยาวสูงสุดที่อนุญาตคือ ${formatDuration(MAX_VIDEO_DURATION)}`
        );
        return;
      }

      // All checks passed
      setSelectedFile(file);
      setVideoDuration(duration);

      // Pre-fill title from filename (strip extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setValue("title", nameWithoutExt, { shouldValidate: false });

      setPhase("ready");
    },
    [setValue]
  );

  // -------------------------------------------------------------------------
  // Drop zone event handlers
  // -------------------------------------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
      // Reset input so re-selecting the same file triggers onChange again
      e.target.value = "";
    },
    [handleFileSelected]
  );

  // -------------------------------------------------------------------------
  // Clear the selected file and reset the form
  // -------------------------------------------------------------------------

  const handleClearFile = useCallback(() => {
    // Abort any in-flight XHR upload
    xhrRef.current?.abort();
    xhrRef.current = null;

    setSelectedFile(null);
    setVideoDuration(null);
    setUploadProgress(0);
    setErrorMessage(null);
    setPhase("idle");
    reset();
  }, [reset]);

  // -------------------------------------------------------------------------
  // Upload flow
  // -------------------------------------------------------------------------

  const onSubmit = useCallback(
    async (metadata: MetadataValues) => {
      if (!selectedFile || videoDuration === null) return;

      setErrorMessage(null);

      // --- Step 1: Get presigned PUT URL from server ---
      setPhase("uploading");
      setUploadProgress(0);

      const presignResult = await getUploadPresignedUrl(
        selectedFile.name,
        selectedFile.type
      );

      if (!presignResult.success) {
        setPhase("error");
        setErrorMessage(presignResult.error);
        return;
      }

      const { uploadUrl, s3Key } = presignResult.data;

      // --- Step 2: Upload file directly to R2 via XHR (supports progress) ---
      const uploadSucceeded = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          xhrRef.current = null;
          // R2 returns 200 for a successful PUT
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve(true);
          } else {
            setErrorMessage(
              `อัปโหลดไม่สำเร็จ: เซิร์ฟเวอร์ตอบกลับด้วย HTTP ${xhr.status} กรุณาลองอีกครั้ง`
            );
            resolve(false);
          }
        });

        xhr.addEventListener("error", () => {
          xhrRef.current = null;
          setErrorMessage("เกิดข้อผิดพลาดของเครือข่ายระหว่างการอัปโหลด ตรวจสอบการเชื่อมต่อและลองอีกครั้ง");
          resolve(false);
        });

        xhr.addEventListener("abort", () => {
          xhrRef.current = null;
          resolve(false);
        });

        xhr.addEventListener("timeout", () => {
          xhrRef.current = null;
          setErrorMessage("การอัปโหลดหมดเวลา ไฟล์อาจมีขนาดใหญ่เกินไปหรือการเชื่อมต่อช้าเกินไป");
          resolve(false);
        });

        // 30-minute timeout for very large files on slow connections
        xhr.timeout = 30 * 60 * 1000;

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      if (!uploadSucceeded) {
        setPhase("error");
        return;
      }

      // --- Step 3: Persist video metadata in the database ---
      setPhase("saving");

      const createResult = await createVideo({
        title: metadata.title,
        description: metadata.description || undefined,
        s3Key,
        duration: videoDuration,
      });

      if (!createResult.success) {
        setPhase("error");
        setErrorMessage(createResult.error);
        return;
      }

      // --- Step 4: Done ---
      setPhase("success");

      // Redirect after a brief moment so the success state is visible
      setTimeout(() => {
        router.push("/admin/videos");
        router.refresh();
      }, 1500);
    },
    [selectedFile, videoDuration, router]
  );

  // -------------------------------------------------------------------------
  // Derived booleans for UI logic
  // -------------------------------------------------------------------------

  const isProcessing =
    phase === "validating" || phase === "uploading" || phase === "saving";
  const isDisabled = isProcessing || phase === "success";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>อัปโหลดวิดีโอ</CardTitle>
        <CardDescription>
          รูปแบบที่รองรับ: MP4, WebM ขนาดไฟล์สูงสุด: 2 GB ความยาวสูงสุด: 1 ชั่วโมง
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

          {/* ----------------------------------------------------------------
              Drop zone
          ---------------------------------------------------------------- */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop video file here or click to browse"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragLeave}
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isDisabled) {
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors select-none",
              isDragOver && !isDisabled
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
              isDisabled && "cursor-not-allowed opacity-60",
              phase === "error" && "border-destructive/50 bg-destructive/5"
            )}
          >
            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_VIDEO_MIME_TYPES.join(",")}
              className="sr-only"
              disabled={isDisabled}
              onChange={handleFileInputChange}
              aria-hidden="true"
            />

            {phase === "idle" || phase === "error" ? (
              <>
                <UploadCloud className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    ลากและวางไฟล์วิดีโอ หรือ{" "}
                    <span className="text-primary underline underline-offset-2">เลือกไฟล์</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">MP4 หรือ WebM ขนาดสูงสุด 2 GB</p>
                </div>
              </>
            ) : phase === "validating" ? (
              <>
                <Spinner size="lg" />
                <p className="text-sm text-muted-foreground">กำลังตรวจสอบไฟล์วิดีโอ...</p>
              </>
            ) : selectedFile ? (
              /* File is selected and valid */
              <div className="flex w-full items-start gap-3 text-left">
                <FileVideo className="mt-0.5 h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)}
                    {videoDuration !== null && ` · ${formatDuration(videoDuration)}`}
                  </p>
                </div>
                {!isDisabled && (
                  <button
                    type="button"
                    aria-label="Remove selected file"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                    className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* ----------------------------------------------------------------
              Validation / server error
          ---------------------------------------------------------------- */}
          {phase === "error" && errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Upload progress
          ---------------------------------------------------------------- */}
          {phase === "uploading" && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>กำลังอัปโหลดไปยังที่เก็บข้อมูล...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Saving indicator
          ---------------------------------------------------------------- */}
          {phase === "saving" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>กำลังบันทึกข้อมูลวิดีโอ...</span>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Success banner
          ---------------------------------------------------------------- */}
          {phase === "success" && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-950/20 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              อัปโหลดวิดีโอสำเร็จแล้ว กำลังเปลี่ยนเส้นทาง...
            </div>
          )}

          {/* ----------------------------------------------------------------
              Metadata fields (visible once a valid file is selected)
          ---------------------------------------------------------------- */}
          {(phase === "ready" || phase === "uploading" || phase === "saving" || phase === "success") && (
            <fieldset disabled={isDisabled} className="space-y-4 disabled:opacity-70">
              <legend className="sr-only">Video metadata</legend>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="video-title">
                  ชื่อเรื่อง <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Input
                  id="video-title"
                  type="text"
                  placeholder="กรอกชื่อเรื่องที่อธิบายได้ชัดเจน"
                  autoComplete="off"
                  error={!!errors.title}
                  aria-describedby={errors.title ? "video-title-error" : undefined}
                  aria-required="true"
                  {...register("title")}
                />
                {errors.title && (
                  <p id="video-title-error" className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="video-description">คำอธิบาย</Label>
                <textarea
                  id="video-description"
                  rows={3}
                  placeholder="คำอธิบายที่นักเรียนจะเห็น (ไม่บังคับ)..."
                  className={cn(
                    "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    errors.description && "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-describedby={errors.description ? "video-description-error" : undefined}
                  {...register("description")}
                />
                {errors.description && (
                  <p id="video-description-error" className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </fieldset>
          )}

          {/* ----------------------------------------------------------------
              Submit button
          ---------------------------------------------------------------- */}
          {(phase === "ready" || phase === "uploading" || phase === "saving" || phase === "success") && (
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isDisabled}
            >
              {phase === "uploading" ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground" />
                  กำลังอัปโหลด... {uploadProgress}%
                </>
              ) : phase === "saving" ? (
                <>
                  <Spinner size="sm" className="text-primary-foreground" />
                  กำลังบันทึกข้อมูล...
                </>
              ) : phase === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  อัปโหลดเสร็จสิ้น
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  อัปโหลดวิดีโอ
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
