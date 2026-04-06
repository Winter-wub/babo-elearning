"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createPlaylist, updatePlaylist } from "@/actions/playlist.actions";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface PlaylistFormData {
  id?: string;
  title: string;
  description: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface PlaylistFormProps {
  playlist?: PlaylistFormData;
}

// -----------------------------------------------------------------------
// Slug generation helper (mirrors server-side logic)
// -----------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function PlaylistForm({ playlist }: PlaylistFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(playlist?.id);

  const [title, setTitle] = React.useState(playlist?.title ?? "");
  const [description, setDescription] = React.useState(
    playlist?.description ?? ""
  );
  const [slug, setSlug] = React.useState(playlist?.slug ?? "");
  const [isActive, setIsActive] = React.useState(playlist?.isActive ?? true);
  const [isFeatured, setIsFeatured] = React.useState(
    playlist?.isFeatured ?? false
  );
  const [sortOrder, setSortOrder] = React.useState(playlist?.sortOrder ?? 0);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  // Auto-generate slug from title (unless user manually edited it)
  React.useEffect(() => {
    if (!slugManuallyEdited && !isEditing) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited, isEditing]);

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "ข้อผิดพลาดการตรวจสอบ",
        description: "จำเป็นต้องระบุชื่อเรื่อง",
      });
      return;
    }

    startTransition(async () => {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        isActive,
        isFeatured,
        sortOrder,
      };

      const result = isEditing
        ? await updatePlaylist(playlist!.id!, { ...data, slug })
        : await createPlaylist(data);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "ข้อผิดพลาด",
          description: result.error,
        });
        return;
      }

      toast({
        title: isEditing ? "อัปเดตเพลย์ลิสต์แล้ว" : "สร้างเพลย์ลิสต์แล้ว",
        description: `"${title}" ถูก${isEditing ? "อัปเดต" : "สร้าง"}เรียบร้อยแล้ว`,
      });

      if (!isEditing) {
        router.push("/admin/playlists");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "รายละเอียดเพลย์ลิสต์" : "เพลย์ลิสต์ใหม่"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "อัปเดตข้อมูลเพลย์ลิสต์ด้านล่าง"
            : "กรอกรายละเอียดเพื่อสร้างเพลย์ลิสต์ใหม่"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">ชื่อเรื่อง</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to React"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">คำอธิบาย</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="คำอธิบายสั้นๆ ของเพลย์ลิสต์..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">สลัก</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="auto-generated-from-title"
            />
            <p className="text-xs text-muted-foreground">
              ตัวระบุที่เป็นมิตรกับ URL สร้างอัตโนมัติจากชื่อเรื่อง เว้นแต่จะแก้ไขเอง
            </p>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">ลำดับ</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              ตัวเลขน้อยกว่าจะแสดงก่อน ค่าเริ่มต้นคือ 0
            </p>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="isActive">ใช้งาน</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
              <Label htmlFor="isFeatured">แนะนำ</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "บันทึกการเปลี่ยนแปลง" : "สร้างเพลย์ลิสต์"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/playlists")}
            >
              ยกเลิก
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
