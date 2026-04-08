"use client";

import { useState, useCallback } from "react";
import { Eye, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FileTypeBadge, isViewableType } from "@/components/shared/file-type-badge";
import type { PublicMaterial } from "@/actions/material.actions";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchSignedUrl(
  materialId: string,
  mode: "view" | "download"
): Promise<string> {
  const res = await fetch(
    `/api/materials/${materialId}/signed-url?mode=${mode}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("ไม่สามารถโหลดไฟล์ได้");
  const data = await res.json();
  return data.url;
}

// -----------------------------------------------------------------------
// PDF Viewer Dialog
// -----------------------------------------------------------------------

function PdfViewerDialog({
  material,
  open,
  onOpenChange,
}: {
  material: PublicMaterial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUrl = useCallback(async () => {
    if (url) return;
    setLoading(true);
    try {
      const signedUrl = await fetchSignedUrl(material.id, "view");
      setUrl(signedUrl);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  }, [material.id, url]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) loadUrl();
      if (!isOpen) setUrl(null);
      onOpenChange(isOpen);
    },
    [loadUrl, onOpenChange]
  );

  const handleDownload = useCallback(async () => {
    const downloadUrl = await fetchSignedUrl(material.id, "download");
    window.open(downloadUrl, "_blank");
  }, [material.id]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-4xl w-[95vw] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle className="truncate text-sm">
            {material.filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-background">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              กำลังโหลด...
            </div>
          )}
          {url && (
            <iframe
              src={`${url}#toolbar=0&navpanes=0`}
              className="h-full w-full border-0"
              title={material.filename}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            ดาวน์โหลด
          </Button>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              ปิด
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------
// Image Lightbox Dialog
// -----------------------------------------------------------------------

function ImageLightboxDialog({
  material,
  open,
  onOpenChange,
}: {
  material: PublicMaterial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUrl = useCallback(async () => {
    if (url) return;
    setLoading(true);
    try {
      const signedUrl = await fetchSignedUrl(material.id, "view");
      setUrl(signedUrl);
    } catch {
      // error handled silently
    } finally {
      setLoading(false);
    }
  }, [material.id, url]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) loadUrl();
      if (!isOpen) setUrl(null);
      onOpenChange(isOpen);
    },
    [loadUrl, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] gap-0 border-0 bg-black/90 p-2">
        <DialogClose className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
          <X className="h-4 w-4" />
          <span className="sr-only">ปิด</span>
        </DialogClose>

        <div className="flex items-center justify-center">
          {loading && (
            <p className="py-20 text-sm text-white/60">กำลังโหลด...</p>
          )}
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={material.filename}
              className="max-h-[85vh] w-full rounded object-contain"
            />
          )}
        </div>

        <p className="mt-1 px-2 text-center text-xs text-white/60">
          {material.filename}
        </p>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------
// Main section component
// -----------------------------------------------------------------------

interface VideoMaterialsSectionProps {
  materials: PublicMaterial[];
}

export function VideoMaterialsSection({
  materials,
}: VideoMaterialsSectionProps) {
  const [viewerMaterial, setViewerMaterial] = useState<PublicMaterial | null>(
    null
  );
  const [downloading, setDownloading] = useState<string | null>(null);

  if (materials.length === 0) return null;

  const handleDownload = async (material: PublicMaterial) => {
    setDownloading(material.id);
    try {
      const url = await fetchSignedUrl(material.id, "download");
      // Open in new tab to trigger download
      window.open(url, "_blank");
    } catch {
      // silently fail
    } finally {
      setDownloading(null);
    }
  };

  const isPdf = viewerMaterial?.contentType === "application/pdf";
  const isImage = viewerMaterial?.contentType.startsWith("image/") ?? false;

  return (
    <>
      <section aria-label="เอกสารประกอบ" className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          เอกสารประกอบ
        </h2>

        <div className="space-y-2">
          {materials.map((material) => {
            const viewable = isViewableType(material.contentType);

            return (
              <div
                key={material.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <FileTypeBadge mimeType={material.contentType} />

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {material.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(material.fileSize)}
                  </p>
                </div>

                {viewable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewerMaterial(material)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    ดูไฟล์
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={downloading === material.id}
                    onClick={() => handleDownload(material)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    {downloading === material.id
                      ? "กำลังโหลด..."
                      : "ดาวน์โหลด"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* PDF Viewer */}
      {viewerMaterial && isPdf && (
        <PdfViewerDialog
          material={viewerMaterial}
          open={true}
          onOpenChange={(open) => {
            if (!open) setViewerMaterial(null);
          }}
        />
      )}

      {/* Image Lightbox */}
      {viewerMaterial && isImage && (
        <ImageLightboxDialog
          material={viewerMaterial}
          open={true}
          onOpenChange={(open) => {
            if (!open) setViewerMaterial(null);
          }}
        />
      )}
    </>
  );
}
