"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Tag, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BLOG_CATEGORY_COLORS } from "@/lib/constants";
import {
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from "@/actions/blog.actions";
import type { BlogCategoryWithCount } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  categories: BlogCategoryWithCount[];
}

export function BlogCategoriesManager({ categories: initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = React.useState(initial);

  // Form state
  const [editing, setEditing] = React.useState<BlogCategoryWithCount | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState<string>(BLOG_CATEGORY_COLORS[0]);
  const [saving, setSaving] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<BlogCategoryWithCount | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  function resetForm() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setColor(BLOG_CATEGORY_COLORS[0]);
  }

  function startEdit(cat: BlogCategoryWithCount) {
    setEditing(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description ?? "");
    setColor(cat.color);
  }

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      toast({ title: "กรุณากรอกชื่อและ slug", variant: "destructive" });
      return;
    }
    setSaving(true);

    const input = { name, slug, description: description || undefined, color };

    const result = editing
      ? await updateBlogCategory(editing.id, input)
      : await createBlogCategory(input);

    setSaving(false);
    if (result.success) {
      toast({ title: editing ? "อัปเดตหมวดหมู่แล้ว" : "สร้างหมวดหมู่แล้ว" });
      resetForm();
      router.refresh();
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteBlogCategory(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (result.success) {
      toast({ title: "ลบหมวดหมู่แล้ว" });
      router.refresh();
    } else {
      toast({ title: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left: Form */}
      <div className="rounded-lg border border-border p-4 space-y-4 h-fit">
        <h2 className="text-sm font-medium">
          {editing ? `แก้ไข: ${editing.name}` : "สร้างหมวดหมู่ใหม่"}
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="cat-name">ชื่อหมวดหมู่</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editing) setSlug(autoSlug(e.target.value));
            }}
            placeholder="เช่น Grammar"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">Slug</Label>
          <Input
            id="cat-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="grammar"
            className="font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label>สี Badge</Label>
          <div className="grid grid-cols-6 gap-2">
            {BLOG_CATEGORY_COLORS.map((c) => {
              const [bg] = c.split(" ");
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all",
                    bg,
                    color === c ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-desc">คำอธิบาย (ไม่จำเป็น)</Label>
          <textarea
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder="คำอธิบายสั้นๆ..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? "บันทึก" : "สร้างหมวดหมู่"}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={resetForm}>ยกเลิก</Button>
          )}
        </div>
      </div>

      {/* Right: Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">บทความ</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Tag className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ยังไม่มีหมวดหมู่</p>
                    <p className="text-xs">สร้างหมวดหมู่แรกจากฟอร์มด้านซ้าย</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", cat.color)}>{cat.name}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cat.slug}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {cat._count.posts}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                        disabled={cat._count.posts > 0}
                        title={cat._count.posts > 0 ? "มีบทความอยู่ในหมวดหมู่นี้" : "ลบ"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบหมวดหมู่ &ldquo;{deleteTarget?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
