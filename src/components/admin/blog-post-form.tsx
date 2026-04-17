"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Upload,
  X,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BlogEditor } from "@/components/admin/blog-editor";
import {
  createBlogPost,
  updateBlogPost,
  generateBlogSlug,
  getUploadBlogImageUrl,
} from "@/actions/blog.actions";
import type { AdminBlogPostDetail, BlogCategoryWithCount, PublicPlaylist } from "@/types";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface BlogPostFormProps {
  mode: "create" | "edit";
  post?: AdminBlogPostDetail;
  categories: BlogCategoryWithCount[];
  playlists: PublicPlaylist[];
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function BlogPostForm({ mode, post, categories, playlists }: BlogPostFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = React.useState(post?.title ?? "");
  const [slug, setSlug] = React.useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = React.useState(post?.excerpt ?? "");
  const [content, setContent] = React.useState(post?.content ?? "");
  const [status, setStatus] = React.useState<"DRAFT" | "PUBLISHED">(post?.status ?? "DRAFT");
  const [featuredImageKey, setFeaturedImageKey] = React.useState<string | null>(post?.featuredImageKey ?? null);
  const [featuredImageUrl, setFeaturedImageUrl] = React.useState<string | null>(post?.featuredImageUrl ?? null);
  const [featuredImageAlt, setFeaturedImageAlt] = React.useState(post?.featuredImageAlt ?? "");
  const [categoryIds, setCategoryIds] = React.useState<string[]>(post?.categoryIds ?? []);
  const [playlistIds, setPlaylistIds] = React.useState<string[]>(post?.playlistIds ?? []);

  // UI state
  const [saving, setSaving] = React.useState(false);
  const [generatingSlug, setGeneratingSlug] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isDirty = React.useRef(false);
  React.useEffect(() => {
    isDirty.current = true;
  }, [title, slug, excerpt, content, status, featuredImageKey, categoryIds, playlistIds]);

  // Warn before unload
  React.useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Auto-generate slug from title (create mode only)
  async function handleGenerateSlug() {
    if (!title.trim()) return;
    setGeneratingSlug(true);
    const result = await generateBlogSlug(title);
    if (result.success) setSlug(result.data);
    setGeneratingSlug(false);
  }

  // Featured image upload
  async function handleFeaturedImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "ไฟล์ต้องมีขนาดไม่เกิน 5MB", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const result = await getUploadBlogImageUrl(file.name, file.type);
      if (!result.success) {
        toast({ title: result.error, variant: "destructive" });
        setUploadingImage(false);
        return;
      }
      const response = await fetch(result.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) throw new Error();

      setFeaturedImageKey(result.data.key);
      setFeaturedImageUrl(`/api/blog/images/${result.data.key}`);
      setUploadingImage(false);
    } catch {
      toast({ title: "อัปโหลดไม่สำเร็จ", variant: "destructive" });
      setUploadingImage(false);
    }
  }

  // Save
  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "กรุณาระบุชื่อบทความ", variant: "destructive" });
      return;
    }
    if (!slug.trim()) {
      toast({ title: "กรุณาระบุ slug", variant: "destructive" });
      return;
    }

    setSaving(true);
    const input = {
      title,
      slug,
      excerpt: excerpt || undefined,
      content,
      status,
      featuredImageKey: featuredImageKey ?? undefined,
      featuredImageAlt: featuredImageAlt || undefined,
      categoryIds,
      playlistIds,
    };

    const result = mode === "create"
      ? await createBlogPost(input)
      : await updateBlogPost(post!.id, input);

    setSaving(false);

    if (result.success) {
      isDirty.current = false;
      toast({ title: mode === "create" ? "สร้างบทความแล้ว" : "บันทึกบทความแล้ว" });
      if (mode === "create") {
        router.push(`/admin/blog/${result.data.id}`);
      }
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-2.5 sm:px-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/blog">
            <ArrowLeft className="mr-1 h-4 w-4" />
            กลับ
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {mode === "create" ? "บทความใหม่" : title || "แก้ไขบทความ"}
          </p>
        </div>

        {/* Status indicator */}
        <Badge
          variant="outline"
          className={cn(
            "hidden sm:flex",
            status === "PUBLISHED"
              ? "border-green-500 text-green-600"
              : "border-amber-400 text-amber-600"
          )}
        >
          {status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
        </Badge>

        {mode === "edit" && post?.slug && (
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              ดูตัวอย่าง
            </a>
          </Button>
        )}

        {/* Settings toggle for mobile */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {sidebarOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          ตั้งค่า
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          บันทึก
        </Button>
      </div>

      {/* ── Main content: Notion-style two-column ──────────────── */}
      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_320px]">
        {/* Editor column */}
        <div className="border-r border-border/50 px-4 py-6 sm:px-8 lg:px-12">
          {/* Title — Notion-style borderless heading input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ชื่อบทความ..."
            className="w-full border-0 bg-transparent text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />

          {/* Slug */}
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground font-mono">/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="slug..."
              className="flex-1 border-0 bg-transparent text-xs font-mono text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateSlug}
              disabled={generatingSlug || !title.trim()}
              className="h-6 text-xs text-muted-foreground"
            >
              {generatingSlug ? <Loader2 className="h-3 w-3 animate-spin" /> : "สร้างอัตโนมัติ"}
            </Button>
          </div>

          {/* Excerpt — Notion-style subtitle */}
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="เขียนคำอธิบายย่อ..."
            rows={2}
            maxLength={500}
            className="mt-4 w-full resize-none border-0 bg-transparent text-lg text-muted-foreground placeholder:text-muted-foreground/30 focus:outline-none leading-relaxed"
          />

          <div className="my-6 h-px bg-border/50" />

          {/* Content editor */}
          <BlogEditor
            value={content}
            onChange={setContent}
          />
        </div>

        {/* Sidebar — settings panel */}
        <div className={cn(
          "border-t border-border lg:border-t-0 p-4 sm:p-6 space-y-6",
          !sidebarOpen && "hidden lg:block"
        )}>
          {/* Status */}
          <div className="space-y-2">
            <Label>สถานะ</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "DRAFT" | "PUBLISHED")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">ฉบับร่าง</SelectItem>
                <SelectItem value="PUBLISHED">เผยแพร่แล้ว</SelectItem>
              </SelectContent>
            </Select>
            {post?.publishedAt && (
              <p className="text-xs text-muted-foreground">
                เผยแพร่เมื่อ {new Date(post.publishedAt).toLocaleDateString("th-TH")}
              </p>
            )}
          </div>

          {/* Featured image */}
          <div className="space-y-2">
            <Label>ภาพหน้าปก</Label>
            {featuredImageUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featuredImageUrl}
                    alt={featuredImageAlt || "Featured"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    เปลี่ยนรูป
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setFeaturedImageKey(null);
                      setFeaturedImageUrl(null);
                      setFeaturedImageAlt("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor="img-alt" className="text-xs">Alt text</Label>
                  <Input
                    id="img-alt"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="อธิบายรูปภาพ..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-muted-foreground transition-colors"
              >
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">คลิกเพื่อเลือกรูป</p>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFeaturedImageUpload(f);
              }}
            />
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label>หมวดหมู่</Label>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                ยังไม่มีหมวดหมู่{" "}
                <Link href="/admin/blog/categories" className="text-primary underline">
                  สร้างหมวดหมู่
                </Link>
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={categoryIds.includes(cat.id)}
                      onCheckedChange={(checked) => {
                        setCategoryIds((prev) =>
                          checked
                            ? [...prev, cat.id]
                            : prev.filter((id) => id !== cat.id)
                        );
                      }}
                    />
                    <span>{cat.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {cat._count.posts}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Link
              href="/admin/blog/categories"
              className="text-xs text-primary hover:underline"
            >
              จัดการหมวดหมู่
            </Link>
          </div>

          {/* Playlists (courses) */}
          <div className="space-y-2">
            <Label>หลักสูตรที่เกี่ยวข้อง</Label>
            {playlists.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                ยังไม่มีเพลย์ลิสต์{" "}
                <Link href="/admin/playlists" className="text-primary underline">
                  สร้างเพลย์ลิสต์
                </Link>
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {playlists.map((pl) => (
                  <label
                    key={pl.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={playlistIds.includes(pl.id)}
                      onCheckedChange={(checked) => {
                        setPlaylistIds((prev) =>
                          checked
                            ? [...prev, pl.id]
                            : prev.filter((id) => id !== pl.id)
                        );
                      }}
                    />
                    <span className="truncate">{pl.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {pl.videoCount} วิดีโอ
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
