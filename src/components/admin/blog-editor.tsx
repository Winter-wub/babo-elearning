"use client";

import * as React from "react";
import { useEditor, EditorContent, Node, mergeAttributes, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Highlighter,
  Undo,
  Redo,
  Code,
  Quote,
  Minus,
  ImageIcon,
  CirclePlay,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getUploadBlogImageUrl, getUploadBlogVideoUrl } from "@/actions/blog.actions";
import { MAX_BLOG_VIDEO_SIZE_BYTES } from "@/lib/constants";

// -----------------------------------------------------------------------
// Custom TipTap Video node
// -----------------------------------------------------------------------

const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      type: { default: "video/mp4" },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        preload: "metadata",
        class: "rounded-lg mx-auto max-w-full my-4",
        style: "max-height: 500px",
      }),
      ["source", { src: HTMLAttributes.src, type: HTMLAttributes.type }],
    ];
  },
});

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

// -----------------------------------------------------------------------
// Notion-style toolbar button
// -----------------------------------------------------------------------

function ToolbarBtn({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-accent text-accent-foreground shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}

// -----------------------------------------------------------------------
// Floating toolbar (Notion-style: appears above editor, minimal)
// -----------------------------------------------------------------------

function EditorToolbar({
  editor,
  onInsertImage,
  onInsertYoutube,
}: {
  editor: Editor;
  onInsertImage: () => void;
  onInsertYoutube: () => void;
}) {
  const iconSize = "h-3.5 w-3.5";

  function promptLink() {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-background/95 backdrop-blur-sm px-4 py-1.5"
      role="toolbar"
      aria-label="เครื่องมือจัดรูปแบบ"
    >
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="เลิกทำ"
      >
        <Undo className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="ทำซ้ำ"
      >
        <Redo className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Headings — only H2/H3 (H1 is the post title) */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="หัวข้อ 2"
      >
        <Heading2 className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="หัวข้อ 3"
      >
        <Heading3 className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="ตัวหนา"
      >
        <Bold className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="ตัวเอียง"
      >
        <Italic className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="ขีดเส้นใต้"
      >
        <UnderlineIcon className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="ขีดฆ่า"
      >
        <Strikethrough className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="โค้ด"
      >
        <Code className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
        isActive={editor.isActive("highlight")}
        title="ไฮไลต์"
      >
        <Highlighter className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="จัดชิดซ้าย"
      >
        <AlignLeft className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="จัดกึ่งกลาง"
      >
        <AlignCenter className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="จัดชิดขวา"
      >
        <AlignRight className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="รายการแบบจุด"
      >
        <List className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="รายการแบบลำดับ"
      >
        <ListOrdered className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="บล็อกอ้างอิง"
      >
        <Quote className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="เส้นแบ่ง"
      >
        <Minus className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      <ToolbarBtn onClick={promptLink} isActive={editor.isActive("link")} title="แทรกลิงก์">
        <LinkIcon className={iconSize} />
      </ToolbarBtn>
      {editor.isActive("link") && (
        <ToolbarBtn
          onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
          title="ลบลิงก์"
        >
          <Unlink className={iconSize} />
        </ToolbarBtn>
      )}

      <ToolbarDivider />

      {/* Media buttons */}
      <ToolbarBtn onClick={onInsertImage} title="แทรกรูปภาพ">
        <ImageIcon className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn onClick={onInsertYoutube} title="แทรก YouTube">
        <CirclePlay className={iconSize} />
      </ToolbarBtn>
    </div>
  );
}

// -----------------------------------------------------------------------
// Image upload dialog
// -----------------------------------------------------------------------

function ImageUploadDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (src: string, alt: string) => void;
}) {
  const [mode, setMode] = React.useState<"upload" | "url">("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadedKey, setUploadedKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setUrl("");
    setAlt("");
    setUploading(false);
    setUploadedKey(null);
    setError(null);
    setDragOver(false);
    setMode("upload");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileSelect(selectedFile: File) {
    setError(null);

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("ไฟล์ต้องมีขนาดไม่เกิน 5MB");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));

    // Upload immediately
    setUploading(true);
    try {
      const result = await getUploadBlogImageUrl(selectedFile.name, selectedFile.type);
      if (!result.success) {
        setError(result.error);
        setUploading(false);
        return;
      }

      // PUT file to presigned URL
      const response = await fetch(result.data.uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });

      if (!response.ok) {
        setError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
        setUploading(false);
        return;
      }

      setUploadedKey(result.data.key);
      setUploading(false);
    } catch {
      setError("อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
      setUploading(false);
    }
  }

  function handleInsert() {
    if (mode === "upload" && uploadedKey) {
      onInsert(`/api/blog/images/${uploadedKey}`, alt);
    } else if (mode === "url" && url) {
      onInsert(url, alt);
    }
    handleClose();
  }

  const canInsert =
    (mode === "upload" && uploadedKey && !uploading) ||
    (mode === "url" && url.startsWith("http"));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>แทรกรูปภาพ</DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "upload" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            อัปโหลด
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "url" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            URL
          </button>
        </div>

        {mode === "upload" ? (
          <div className="space-y-4">
            {!preview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileSelect(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                )}
              >
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-sm font-medium">ลากและวางรูปภาพที่นี่</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG, WebP, GIF (สูงสุด 5MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="mx-auto max-h-48 object-contain"
                  />
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFile(null); setPreview(null); setUploadedKey(null); }}
                  className="text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> เปลี่ยนรูป
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="image-url">URL รูปภาพ</Label>
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Alt text */}
        <div>
          <Label htmlFor="image-alt">ข้อความ Alt</Label>
          <Input
            id="image-alt"
            placeholder="อธิบายรูปภาพนี้..."
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">สำหรับ accessibility และ SEO</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button onClick={handleInsert} disabled={!canInsert}>
            แทรกรูปภาพ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------
// YouTube embed dialog
// -----------------------------------------------------------------------

function YoutubeDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const isValid = youtubeRegex.test(url);

  function handleInsert() {
    if (!isValid) {
      setError("กรุณาใส่ลิงก์ YouTube ที่ถูกต้อง");
      return;
    }
    onInsert(url);
    setUrl("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setUrl(""); setError(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>แทรกวิดีโอ YouTube</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="youtube-url">ลิงก์ YouTube</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              รองรับ youtube.com/watch, youtu.be และ youtube.com/embed
            </p>
          </div>

          {isValid && (
            <div className="rounded-lg overflow-hidden border border-border" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${url.match(youtubeRegex)?.[1]}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube preview"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setUrl(""); setError(null); }}>ยกเลิก</Button>
          <Button onClick={handleInsert} disabled={!isValid}>
            แทรกวิดีโอ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------
// Main Blog Editor (Notion-style)
// -----------------------------------------------------------------------

export const BlogEditor = React.memo(function BlogEditor({
  value,
  onChange,
  placeholder = "เริ่มเขียนเนื้อหา... พิมพ์ / เพื่อดูคำสั่ง",
  className,
}: BlogEditorProps) {
  const isInternalUpdate = React.useRef(false);
  const [showImageDialog, setShowImageDialog] = React.useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = React.useState(false);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const dragCounter = React.useRef(0);

  // Upload a media file (image or video) to R2 and return the public URL
  const uploadMediaToR2 = React.useCallback(async (file: File): Promise<{ url: string; type: "image" | "video" } | null> => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return null;

    if (isImage && file.size > 5 * 1024 * 1024) return null;
    if (isVideo && file.size > MAX_BLOG_VIDEO_SIZE_BYTES) return null;

    try {
      const result = isImage
        ? await getUploadBlogImageUrl(file.name, file.type)
        : await getUploadBlogVideoUrl(file.name, file.type);
      if (!result.success) return null;

      const response = await fetch(result.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) return null;

      return {
        url: `/api/blog/images/${result.data.key}`,
        type: isImage ? "image" : "video",
      };
    } catch {
      return null;
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Only H2/H3 — H1 is the post title
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
        validate: (href) =>
          /^https?:\/\//.test(href) || href.startsWith("/") || href.startsWith("#"),
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg mx-auto max-w-full" },
        allowBase64: false,
      }),
      Youtube.configure({
        HTMLAttributes: { class: "rounded-lg overflow-hidden mx-auto" },
        width: 0,   // responsive — controlled by CSS
        height: 0,
        nocookie: true,
      }),
      Video,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      isInternalUpdate.current = true;
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          // Notion-style: clean, spacious, document-like
          "prose prose-lg dark:prose-invert max-w-none",
          "px-4 py-6 min-h-[400px]",
          "focus:outline-none",
          // Notion-like spacing
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3",
          "prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2",
          "prose-p:leading-relaxed",
          "prose-blockquote:border-l-primary/30 prose-blockquote:not-italic",
          "prose-img:rounded-lg prose-img:shadow-sm",
          // Video player
          "[&_video]:w-full [&_video]:rounded-lg [&_video]:my-4",
          // YouTube iframe responsive
          "[&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg",
          "[&_div[data-youtube-video]]:my-6",
        ),
      },
      // Drag-and-drop images/videos directly into the editor (Medium-style)
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files.length) return false;

        const file = event.dataTransfer.files[0];
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return false;

        event.preventDefault();

        const { pos } = view.posAtCoords({ left: event.clientX, top: event.clientY }) ?? { pos: view.state.selection.from };

        uploadMediaToR2(file).then((result) => {
          if (result && view.dom.isConnected) {
            const node = result.type === "image"
              ? view.state.schema.nodes.image.create({ src: result.url, alt: file.name })
              : view.state.schema.nodes.video.create({ src: result.url, type: file.type });
            const tr = view.state.tr.insert(pos, node);
            view.dispatch(tr);
          }
        });

        return true;
      },
      // Paste images/videos from clipboard (Medium-style)
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
            const file = item.getAsFile();
            if (!file) continue;

            event.preventDefault();

            const pos = view.state.selection.from;
            uploadMediaToR2(file).then((result) => {
              if (result && view.dom.isConnected) {
                const node = result.type === "image"
                  ? view.state.schema.nodes.image.create({ src: result.url, alt: file.name })
                  : view.state.schema.nodes.video.create({ src: result.url, type: file.type });
                const tr = view.state.tr.insert(pos, node);
                view.dispatch(tr);
              }
            });

            return true;
          }
        }

        return false;
      },
    },
  });

  // Sync external value changes
  React.useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleInsertImage(src: string, alt: string) {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt }).run();
  }

  function handleInsertYoutube(url: string) {
    if (!editor) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }

  if (!editor) return null;

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg border border-border bg-background", className)}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounter.current++;
        if (e.dataTransfer.types.includes("Files")) setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDraggingOver(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => {
        dragCounter.current = 0;
        setIsDraggingOver(false);
      }}
    >
      <EditorToolbar
        editor={editor}
        onInsertImage={() => setShowImageDialog(true)}
        onInsertYoutube={() => setShowYoutubeDialog(true)}
      />
      <EditorContent editor={editor} />

      {/* Drag-and-drop overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <p className="text-sm font-medium">วางรูปภาพหรือวิดีโอที่นี่</p>
          </div>
        </div>
      )}

      <ImageUploadDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={handleInsertImage}
      />
      <YoutubeDialog
        open={showYoutubeDialog}
        onClose={() => setShowYoutubeDialog(false)}
        onInsert={handleInsertYoutube}
      />
    </div>
  );
});
