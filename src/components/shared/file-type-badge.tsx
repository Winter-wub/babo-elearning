import {
  FileText,
  Image,
  FileSpreadsheet,
  FileIcon,
  Archive,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// File type → icon + color mapping
// -----------------------------------------------------------------------

type FileTypeConfig = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
};

function getFileTypeConfig(mimeType: string): FileTypeConfig {
  if (mimeType === "application/pdf") {
    return {
      icon: FileText,
      label: "PDF",
      className:
        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      icon: Image,
      label: "Image",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    };
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return {
      icon: FileSpreadsheet,
      label: "Excel",
      className:
        "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    };
  }

  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "text/plain"
  ) {
    return {
      icon: FileType,
      label: "Doc",
      className:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
    };
  }

  if (
    mimeType.includes("presentation") ||
    mimeType.includes("powerpoint")
  ) {
    return {
      icon: FileIcon,
      label: "PPT",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
    };
  }

  if (mimeType === "application/zip" || mimeType.includes("archive")) {
    return {
      icon: Archive,
      label: "ZIP",
      className: "bg-muted text-muted-foreground",
    };
  }

  return {
    icon: FileIcon,
    label: "File",
    className: "bg-muted text-muted-foreground",
  };
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

interface FileTypeBadgeProps {
  mimeType: string;
  className?: string;
}

export function FileTypeBadge({ mimeType, className }: FileTypeBadgeProps) {
  const config = getFileTypeConfig(mimeType);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

/** Utility: check if a content type is viewable inline. */
export function isViewableType(contentType: string): boolean {
  return (
    contentType === "application/pdf" || contentType.startsWith("image/")
  );
}
