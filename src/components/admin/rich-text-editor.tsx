"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
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
  RemoveFormatting,
  Code,
  Quote,
  Minus,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  isDirty?: boolean;
}

// -----------------------------------------------------------------------
// Toolbar button
// -----------------------------------------------------------------------

interface ToolbarBtnProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarBtn({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarBtnProps) {
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
// Color picker popover (simple)
// -----------------------------------------------------------------------

const PRESET_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#B7B7B7",
  "#E03E3E",
  "#D9730D",
  "#CB8A00",
  "#448361",
  "#337EA9",
  "#2F5FBA",
  "#6940A5",
  "#AD1A72",
];

function ColorPicker({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
        สีตัวอักษร
      </p>
      <div className="grid grid-cols-7 gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              editor.chain().focus().setColor(color).run();
              onClose();
            }}
            className="h-5 w-5 rounded border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          editor.chain().focus().unsetColor().run();
          onClose();
        }}
        className="mt-1.5 w-full rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
      >
        ลบสี
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------
// Toolbar
// -----------------------------------------------------------------------

function EditorToolbar({ editor }: { editor: Editor }) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const colorRef = React.useRef<HTMLDivElement>(null);

  // Close color picker on outside click or Escape key
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        colorRef.current &&
        !colorRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowColorPicker(false);
    }
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showColorPicker]);

  function promptLink() {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  }

  const iconSize = "h-3.5 w-3.5";

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5"
      role="toolbar"
      aria-label="เครื่องมือจัดรูปแบบ"
    >
      {/* Undo / Redo */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="เลิกทำ (Ctrl+Z)"
      >
        <Undo className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="ทำซ้ำ (Ctrl+Y)"
      >
        <Redo className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
        title="หัวข้อ 1"
      >
        <Heading1 className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
        title="หัวข้อ 2"
      >
        <Heading2 className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
        title="หัวข้อ 3"
      >
        <Heading3 className={iconSize} />
      </ToolbarBtn>

      <ToolbarDivider />

      {/* Inline formatting */}
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="ตัวหนา (Ctrl+B)"
      >
        <Bold className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="ตัวเอียง (Ctrl+I)"
      >
        <Italic className={iconSize} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="ขีดเส้นใต้ (Ctrl+U)"
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
        onClick={() =>
          editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()
        }
        isActive={editor.isActive("highlight")}
        title="ไฮไลต์"
      >
        <Highlighter className={iconSize} />
      </ToolbarBtn>

      {/* Color */}
      <div ref={colorRef} className="relative">
        <ToolbarBtn
          onClick={() => setShowColorPicker((v) => !v)}
          title="สีตัวอักษร"
        >
          <Palette className={iconSize} />
        </ToolbarBtn>
        {showColorPicker && (
          <ColorPicker
            editor={editor}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>

      <ToolbarDivider />

      {/* Alignment */}
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

      {/* Lists */}
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

      {/* Link */}
      <ToolbarBtn
        onClick={promptLink}
        isActive={editor.isActive("link")}
        title="แทรกลิงก์"
      >
        <LinkIcon className={iconSize} />
      </ToolbarBtn>
      {editor.isActive("link") && (
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
          }
          title="ลบลิงก์"
        >
          <Unlink className={iconSize} />
        </ToolbarBtn>
      )}

      <ToolbarDivider />

      {/* Clear formatting */}
      <ToolbarBtn
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="ล้างรูปแบบ"
      >
        <RemoveFormatting className={iconSize} />
      </ToolbarBtn>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main RichTextEditor
// -----------------------------------------------------------------------

export const RichTextEditor = React.memo(function RichTextEditor({
  value,
  onChange,
  placeholder = "เริ่มพิมพ์เนื้อหา...",
  className,
  isDirty,
}: RichTextEditorProps) {
  // Guard: skip sync effect when the change originated from typing in this editor
  const isInternalUpdate = React.useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable built-in link/underline — we configure them separately below
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
        validate: (href) => /^https?:\/\//.test(href) || href.startsWith("/") || href.startsWith("#"),
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[120px] focus:outline-none",
      },
    },
  });

  // Sync external value changes (e.g. reset) — skip if the change came from this editor
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

  if (!editor) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border transition-colors",
        isDirty
          ? "border-amber-400/60 dark:border-amber-500/40"
          : "border-input",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
});
