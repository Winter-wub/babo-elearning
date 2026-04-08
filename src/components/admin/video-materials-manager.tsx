"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  UploadCloud,
  X,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileTypeBadge } from "@/components/shared/file-type-badge";
import {
  getMaterialUploadUrl,
  createMaterial,
  deleteMaterial,
  reorderMaterials,
  type PublicMaterial,
} from "@/actions/material.actions";
import {
  ACCEPTED_MATERIAL_MIME_TYPES,
  MAX_MATERIAL_SIZE_BYTES,
} from "@/lib/constants";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// -----------------------------------------------------------------------
// Upload queue item type
// -----------------------------------------------------------------------

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "saving" | "done" | "error";
  error?: string;
  xhr?: XMLHttpRequest;
};

// -----------------------------------------------------------------------
// Sortable material row
// -----------------------------------------------------------------------

function SortableMaterialRow({
  material,
  onDelete,
}: {
  material: PublicMaterial;
  onDelete: (m: PublicMaterial) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: material.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors group ${
        isDragging
          ? "bg-muted/60 shadow-sm z-10 relative"
          : "hover:bg-muted/40"
      }`}
    >
      <button
        type="button"
        className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground focus:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FileTypeBadge mimeType={material.contentType} />

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{material.filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(material.fileSize)} &middot; {formatDate(material.createdAt)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 sm:opacity-0"
        aria-label={`ลบ ${material.filename}`}
        onClick={() => onDelete(material)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

interface VideoMaterialsManagerProps {
  videoId: string;
  initialMaterials: PublicMaterial[];
}

export function VideoMaterialsManager({
  videoId,
  initialMaterials,
}: VideoMaterialsManagerProps) {
  const [materials, setMaterials] = useState<PublicMaterial[]>(initialMaterials);
  const [showDropZone, setShowDropZone] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PublicMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ---- Upload logic ----

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        // Client-side validation
        if (
          !(ACCEPTED_MATERIAL_MIME_TYPES as readonly string[]).includes(
            file.type
          )
        ) {
          setUploads((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file,
              progress: 0,
              status: "error",
              error: "ประเภทไฟล์ไม่รองรับ",
            },
          ]);
          continue;
        }

        if (file.size > MAX_MATERIAL_SIZE_BYTES) {
          setUploads((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file,
              progress: 0,
              status: "error",
              error: "ไฟล์มีขนาดเกิน 50 MB",
            },
          ]);
          continue;
        }

        const uploadId = crypto.randomUUID();

        setUploads((prev) => [
          ...prev,
          { id: uploadId, file, progress: 0, status: "uploading" },
        ]);

        try {
          // 1. Get presigned URL
          const urlResult = await getMaterialUploadUrl(file.name, file.type);
          if (!urlResult.success) {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? { ...u, status: "error", error: urlResult.error }
                  : u
              )
            );
            continue;
          }

          const { uploadUrl, s3Key } = urlResult.data;

          // 2. Upload to R2 via XHR
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploads((prev) =>
                  prev.map((u) =>
                    u.id === uploadId ? { ...u, progress: pct } : u
                  )
                );
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            });

            xhr.addEventListener("error", () =>
              reject(new Error("Network error"))
            );
            xhr.addEventListener("abort", () =>
              reject(new Error("Upload cancelled"))
            );

            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", file.type);
            xhr.send(file);

            // Store xhr for potential cancellation
            setUploads((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, xhr } : u))
            );
          });

          // 3. Save metadata
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: "saving", progress: 100 } : u
            )
          );

          const createResult = await createMaterial({
            videoId,
            filename: file.name,
            s3Key,
            contentType: file.type,
            fileSize: file.size,
          });

          if (!createResult.success) {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? { ...u, status: "error", error: createResult.error }
                  : u
              )
            );
            continue;
          }

          // Success
          setMaterials((prev) => [...prev, createResult.data]);
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId ? { ...u, status: "done" } : u
            )
          );

          // Remove from queue after a short delay
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId));
          }, 1500);
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? {
                    ...u,
                    status: "error",
                    error:
                      err instanceof Error
                        ? err.message
                        : "เกิดข้อผิดพลาด",
                  }
                : u
            )
          );
        }
      }
    },
    [videoId]
  );

  const cancelUpload = useCallback((uploadId: string) => {
    setUploads((prev) => {
      const item = prev.find((u) => u.id === uploadId);
      if (item?.xhr && item.status === "uploading") {
        item.xhr.abort();
      }
      return prev.filter((u) => u.id !== uploadId);
    });
  }, []);

  // ---- Delete logic ----

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    const result = await deleteMaterial(deleteTarget.id);
    if (result.success) {
      setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget]);

  // ---- Reorder logic ----

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = materials.findIndex((m) => m.id === active.id);
      const newIndex = materials.findIndex((m) => m.id === over.id);

      const reordered = arrayMove(materials, oldIndex, newIndex);
      setMaterials(reordered);

      // Persist to server
      await reorderMaterials(
        videoId,
        reordered.map((m) => m.id)
      );
    },
    [materials, videoId]
  );

  // ---- Drop zone handlers ----

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                เอกสารประกอบ
                {materials.length > 0 && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {materials.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                แนบ PDF เอกสาร หรือรูปภาพ ขนาดสูงสุด 50 MB ต่อไฟล์
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropZone((v) => !v)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              เพิ่มไฟล์
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Drop zone */}
          {showDropZone && (
            <div
              role="button"
              tabIndex={0}
              className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                ลากไฟล์มาวางที่นี่ หรือ{" "}
                <span className="text-primary underline">เลือกไฟล์</span>
              </p>
              <p className="text-xs text-muted-foreground">
                รองรับ PDF, รูปภาพ, เอกสาร Office, ZIP ขนาดสูงสุด 50 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept={ACCEPTED_MATERIAL_MIME_TYPES.join(",")}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          )}

          {/* Upload queue */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              {uploads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                >
                  <FileTypeBadge mimeType={item.file.type} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.file.name}
                    </p>
                    {item.status === "uploading" && (
                      <div
                        role="progressbar"
                        aria-valuenow={item.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-1 h-1.5 rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === "saving" && (
                      <p className="text-xs text-muted-foreground">
                        กำลังบันทึก...
                      </p>
                    )}
                    {item.status === "done" && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        อัปโหลดสำเร็จ
                      </p>
                    )}
                    {item.status === "error" && (
                      <p className="text-xs text-destructive">{item.error}</p>
                    )}
                  </div>
                  {item.status === "uploading" && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {item.progress}%
                    </span>
                  )}
                  {(item.status === "uploading" || item.status === "error") && (
                    <button
                      type="button"
                      aria-label="ยกเลิก"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => cancelUpload(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Materials list */}
          {materials.length === 0 && uploads.length === 0 && (
            <div className="rounded-lg border border-dashed py-8 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                ยังไม่มีเอกสารประกอบ
              </p>
            </div>
          )}

          {materials.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={materials.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y rounded-md border">
                  {materials.map((material) => (
                    <SortableMaterialRow
                      key={material.id}
                      material={material}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบ &ldquo;{deleteTarget?.filename}&rdquo; หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "กำลังลบ..." : "ลบเอกสาร"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
