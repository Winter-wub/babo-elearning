import { Users, FileIcon } from "lucide-react";
import type { PublicContentBlock } from "@/actions/content-block.actions";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// -----------------------------------------------------------------------
// Individual block renderers
// -----------------------------------------------------------------------

function TextBlock({ block }: { block: PublicContentBlock }) {
  if (!block.content) return null;
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

function ImageBlock({ block }: { block: PublicContentBlock }) {
  if (!block.viewUrl) return null;
  return (
    <figure className="space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.viewUrl}
        alt={block.alt ?? ""}
        className="rounded-xl max-w-full object-contain"
        loading="lazy"
      />
      {block.alt && (
        <figcaption className="text-xs text-muted-foreground text-center">
          {block.alt}
        </figcaption>
      )}
    </figure>
  );
}

function VideoBlock({ block }: { block: PublicContentBlock }) {
  if (!block.viewUrl) return null;
  return (
    <video
      src={block.viewUrl}
      controls
      className="w-full rounded-xl bg-muted"
      preload="metadata"
    />
  );
}

function PdfBlock({ block }: { block: PublicContentBlock }) {
  if (!block.viewUrl || !block.filename) return null;
  return (
    <a
      href={block.viewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
        <FileIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
          {block.filename}
        </p>
        {block.fileSize && (
          <p className="text-xs text-muted-foreground">{formatBytes(block.fileSize)}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-primary font-medium">เปิดดู →</span>
    </a>
  );
}

function ContentBlock({ block }: { block: PublicContentBlock }) {
  switch (block.type) {
    case "TEXT": return <TextBlock block={block} />;
    case "IMAGE": return <ImageBlock block={block} />;
    case "VIDEO": return <VideoBlock block={block} />;
    case "PDF": return <PdfBlock block={block} />;
  }
}

// -----------------------------------------------------------------------
// Main renderer
// -----------------------------------------------------------------------

interface ContentBlocksRendererProps {
  blocks: PublicContentBlock[];
}

export function ContentBlocksRenderer({ blocks }: ContentBlocksRendererProps) {
  if (blocks.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
        <Users className="h-5 w-5" />
        คอร์สนี้เหมาะกับใคร
      </h2>
      <div className="space-y-6">
        {blocks.map((block) => (
          <ContentBlock key={block.id} block={block} />
        ))}
      </div>
    </section>
  );
}
