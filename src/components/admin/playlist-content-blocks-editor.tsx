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
  FileText,
  ImageIcon,
  Video,
  FileIcon,
  UploadCloud,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  getContentBlockUploadUrl,
  createContentBlock,
  updateContentBlock,
  deleteContentBlock,
  reorderContentBlocks,
  type AdminContentBlock,
  type ContentBlockType,
} from "@/actions/content-block.actions";
import {
  ACCEPTED_CONTENT_BLOCK_IMAGE_TYPES,
  ACCEPTED_CONTENT_BLOCK_VIDEO_TYPES,
  ACCEPTED_CONTENT_BLOCK_PDF_TYPES,
  MAX_CONTENT_BLOCK_IMAGE_SIZE,
  MAX_CONTENT_BLOCK_FILE_SIZE,
} from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function blockTypeLabel(type: ContentBlockType): string {
  switch (type) {
    case "TEXT": return "ข้อความ";
    case "IMAGE": return "รูปภาพ";
    case "VIDEO": return "วิดีโอ";
    case "PDF": return "PDF";
  }
}

function blockTypeIcon(type: ContentBlockType) {
  switch (type) {
    case "TEXT": return <FileText className="h-3.5 w-3.5" />;
    case "IMAGE": return <ImageIcon className="h-3.5 w-3.5" />;
    case "VIDEO": return <Video className="h-3.5 w-3.5" />;
    case "PDF": return <FileIcon className="h-3.5 w-3.5" />;
  }
}

function acceptForType(type: "IMAGE" | "VIDEO" | "PDF"): string {
  switch (type) {
    case "IMAGE": return ACCEPTED_CONTENT_BLOCK_IMAGE_TYPES.join(",");
    case "VIDEO": return ACCEPTED_CONTENT_BLOCK_VIDEO_TYPES.join(",");
    case "PDF": return ACCEPTED_CONTENT_BLOCK_PDF_TYPES.join(",");
  }
}

function maxSizeForType(type: "IMAGE" | "VIDEO" | "PDF"): number {
  return type === "IMAGE" ? MAX_CONTENT_BLOCK_IMAGE_SIZE : MAX_CONTENT_BLOCK_FILE_SIZE;
}

const ACCEPTED_IMAGE_SET = new Set<string>(ACCEPTED_CONTENT_BLOCK_IMAGE_TYPES);
const ACCEPTED_VIDEO_SET = new Set<string>(ACCEPTED_CONTENT_BLOCK_VIDEO_TYPES);
const ACCEPTED_PDF_SET = new Set<string>(ACCEPTED_CONTENT_BLOCK_PDF_TYPES);

// -----------------------------------------------------------------------
// File upload hook
// -----------------------------------------------------------------------

type UploadState = "idle" | "uploading" | "saving" | "done" | "error";

function useFileUpload(playlistId: string) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (
      file: File,
      blockType: "IMAGE" | "VIDEO" | "PDF",
      existingBlockId?: string,
    ): Promise<AdminContentBlock | null> => {
      setUploadState("uploading");
      setUploadProgress(0);
      setUploadError(null);

      try {
        const urlResult = await getContentBlockUploadUrl(file.name, file.type);
        if (!urlResult.success) {
          setUploadState("error");
          setUploadError(urlResult.error);
          return null;
        }

        const { uploadUrl, s3Key } = urlResult.data;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        setUploadState("saving");
        setUploadProgress(100);

        let result;
        if (existingBlockId) {
          result = await updateContentBlock(existingBlockId, {
            s3Key,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          });
        } else {
          result = await createContentBlock({
            playlistId,
            type: blockType,
            s3Key,
            filename: file.name,
            contentType: file.type,
            fileSize: file.size,
          });
        }

        if (!result.success) {
          setUploadState("error");
          setUploadError(result.error);
          return null;
        }

        setUploadState("done");
        return result.data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
        setUploadState("error");
        setUploadError(msg);
        return null;
      }
    },
    [playlistId]
  );

  const reset = useCallback(() => {
    setUploadState("idle");
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  return { uploadState, uploadProgress, uploadError, uploadFile, reset };
}

// -----------------------------------------------------------------------
// Add block dialog
// -----------------------------------------------------------------------

function AddFileBlockDialog({
  open,
  blockType,
  playlistId,
  onClose,
  onAdded,
}: {
  open: boolean;
  blockType: "IMAGE" | "VIDEO" | "PDF";
  playlistId: string;
  onClose: () => void;
  onAdded: (block: AdminContentBlock) => void;
}) {
  const { uploadState, uploadProgress, uploadError, uploadFile, reset } =
    useFileUpload(playlistId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (file: File) => {
      const maxSize = maxSizeForType(blockType);
      if (file.size > maxSize) {
        toast({ title: `ไฟล์ขนาดเกิน ${formatBytes(maxSize)}`, variant: "destructive" });
        return;
      }
      const block = await uploadFile(file, blockType);
      if (block) {
        onAdded(block);
        setTimeout(() => {
          reset();
          onClose();
        }, 800);
      }
    },
    [blockType, uploadFile, onAdded, onClose, reset]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const labels: Record<"IMAGE" | "VIDEO" | "PDF", { title: string; hint: string }> = {
    IMAGE: { title: "เพิ่มรูปภาพ", hint: "PNG, JPG, WebP, GIF — สูงสุด 5 MB" },
    VIDEO: { title: "เพิ่มวิดีโอ", hint: "MP4, WebM — สูงสุด 50 MB" },
    PDF: { title: "เพิ่ม PDF", hint: "PDF — สูงสุด 50 MB" },
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels[blockType].title}</DialogTitle>
          <DialogDescription>{labels[blockType].hint}</DialogDescription>
        </DialogHeader>

        {uploadState === "idle" && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-10 cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              คลิกหรือลากไฟล์มาวางที่นี่
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptForType(blockType)}
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {(uploadState === "uploading" || uploadState === "saving") && (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploadState === "uploading"
                ? `กำลังอัปโหลด… ${uploadProgress}%`
                : "กำลังบันทึก…"}
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === "done" && (
          <div className="flex items-center gap-2 py-4 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            อัปโหลดสำเร็จ
          </div>
        )}

        {uploadState === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {uploadError}
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              ลองใหม่
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={uploadState === "uploading" || uploadState === "saving"}>
            ยกเลิก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------
// Sortable text block
// -----------------------------------------------------------------------

function SortableTextBlock({
  block,
  onDelete,
  onSaved,
}: {
  block: AdminContentBlock;
  onDelete: (id: string) => void;
  onSaved: (updated: AdminContentBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const [localContent, setLocalContent] = useState(block.content ?? "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    const result = await updateContentBlock(block.id, { content: localContent });
    setSaving(false);
    if (result.success) {
      onSaved(result.data);
      toast({ title: "บันทึกแล้ว" });
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-card ${isDragging ? "shadow-lg opacity-80" : ""}`}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground focus:outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant="secondary" className="gap-1 text-xs">
          {blockTypeIcon(block.type)}
          {blockTypeLabel(block.type)}
        </Badge>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <RichTextEditor
          value={localContent}
          onChange={setLocalContent}
          placeholder="เพิ่มเนื้อหาที่นี่…"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sortable file block (IMAGE / VIDEO / PDF)
// -----------------------------------------------------------------------

function SortableFileBlock({
  block,
  onDelete,
  onReplaced,
}: {
  block: AdminContentBlock;
  onDelete: (id: string) => void;
  onReplaced: (updated: AdminContentBlock) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const [showReplace, setShowReplace] = useState(false);
  const [localAlt, setLocalAlt] = useState(block.alt ?? "");
  const [savingAlt, setSavingAlt] = useState(false);
  const { toast } = useToast();

  const proxyUrl = block.s3Key ? `/api/content-blocks/${block.s3Key}` : null;

  const handleAltSave = async () => {
    setSavingAlt(true);
    const result = await updateContentBlock(block.id, { alt: localAlt });
    setSavingAlt(false);
    if (result.success) {
      onReplaced(result.data);
      toast({ title: "บันทึกแล้ว" });
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-card ${isDragging ? "shadow-lg opacity-80" : ""}`}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground focus:outline-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant="secondary" className="gap-1 text-xs">
          {blockTypeIcon(block.type)}
          {blockTypeLabel(block.type)}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowReplace(true)}
          >
            เปลี่ยนไฟล์
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Preview */}
        {proxyUrl && block.type === "IMAGE" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyUrl}
            alt={block.alt ?? ""}
            className="max-h-48 rounded-lg object-contain bg-muted"
          />
        )}
        {proxyUrl && block.type === "VIDEO" && (
          <video
            src={proxyUrl}
            controls
            className="max-h-48 w-full rounded-lg bg-muted"
          />
        )}
        {block.type === "PDF" && block.filename && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate font-medium">{block.filename}</span>
            {block.fileSize && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBytes(block.fileSize)}
              </span>
            )}
          </div>
        )}

        {/* Alt text for images */}
        {block.type === "IMAGE" && (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Alt text (สำหรับ accessibility)</Label>
              <Input
                value={localAlt}
                onChange={(e) => setLocalAlt(e.target.value)}
                placeholder="อธิบายรูปภาพ…"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleAltSave} disabled={savingAlt}>
              {savingAlt && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              บันทึก
            </Button>
          </div>
        )}

        {/* Filename / size for video */}
        {block.type === "VIDEO" && block.filename && (
          <p className="text-xs text-muted-foreground">
            {block.filename}
            {block.fileSize ? ` — ${formatBytes(block.fileSize)}` : ""}
          </p>
        )}
      </div>

      {showReplace && (
        <AddFileBlockDialog
          open
          blockType={block.type as "IMAGE" | "VIDEO" | "PDF"}
          playlistId={block.playlistId}
          onClose={() => setShowReplace(false)}
          onAdded={(updated) => {
            onReplaced(updated);
            setShowReplace(false);
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

interface PlaylistContentBlocksEditorProps {
  playlistId: string;
  initialBlocks: AdminContentBlock[];
}

export function PlaylistContentBlocksEditor({
  playlistId,
  initialBlocks,
}: PlaylistContentBlocksEditorProps) {
  const [blocks, setBlocks] = useState<AdminContentBlock[]>(initialBlocks);
  const [addFileDialog, setAddFileDialog] = useState<"IMAGE" | "VIDEO" | "PDF" | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---- Add text block ----

  const handleAddText = async () => {
    setIsAddingText(true);
    const result = await createContentBlock({
      playlistId,
      type: "TEXT",
      content: "",
    });
    setIsAddingText(false);
    if (result.success) {
      setBlocks((prev) => [...prev, result.data]);
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  };

  // ---- File block added from dialog ----

  const handleFileBlockAdded = (block: AdminContentBlock) => {
    setBlocks((prev) => [...prev, block]);
    toast({ title: "เพิ่ม block สำเร็จ" });
  };

  // ---- Update block in list ----

  const handleBlockUpdated = (updated: AdminContentBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  // ---- Delete ----

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    const result = await deleteContentBlock(deleteTargetId);
    setIsDeleting(false);
    if (result.success) {
      setBlocks((prev) => prev.filter((b) => b.id !== deleteTargetId));
      toast({ title: "ลบ block แล้ว" });
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
    setDeleteTargetId(null);
  };

  // ---- Reorder ----

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(reordered);

    await reorderContentBlocks(playlistId, reordered.map((b) => b.id));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">คอร์สนี้เหมาะกับใคร</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddText}
                disabled={isAddingText}
                className="gap-1.5"
              >
                {isAddingText ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                ข้อความ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFileDialog("IMAGE")}
                className="gap-1.5"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                รูปภาพ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFileDialog("VIDEO")}
                className="gap-1.5"
              >
                <Video className="h-3.5 w-3.5" />
                วิดีโอ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFileDialog("PDF")}
                className="gap-1.5"
              >
                <FileIcon className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {blocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              ยังไม่มีเนื้อหา — กดปุ่มด้านบนเพื่อเพิ่ม block
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {blocks.map((block) =>
                    block.type === "TEXT" ? (
                      <SortableTextBlock
                        key={block.id}
                        block={block}
                        onDelete={setDeleteTargetId}
                        onSaved={handleBlockUpdated}
                      />
                    ) : (
                      <SortableFileBlock
                        key={block.id}
                        block={block}
                        onDelete={setDeleteTargetId}
                        onReplaced={handleBlockUpdated}
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add file block dialog */}
      {addFileDialog && (
        <AddFileBlockDialog
          open
          blockType={addFileDialog}
          playlistId={playlistId}
          onClose={() => setAddFileDialog(null)}
          onAdded={(block) => {
            handleFileBlockAdded(block);
            setAddFileDialog(null);
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTargetId}
        onOpenChange={(o) => !o && setDeleteTargetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบ block นี้?</DialogTitle>
            <DialogDescription>
              การลบจะไม่สามารถกู้คืนได้ ไฟล์ที่เกี่ยวข้องจะถูกลบออกจาก R2 ด้วย
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTargetId(null)}
              disabled={isDeleting}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
