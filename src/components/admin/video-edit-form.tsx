"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThumbnailUploadWidget } from "@/components/admin/thumbnail-upload-widget";
import { useToast } from "@/hooks/use-toast";
import { updateVideo } from "@/actions/video.actions";
import { getUploadVideoThumbnailUrl } from "@/actions/thumbnail.actions";
import { resolveThumbnailUrl } from "@/lib/thumbnail-utils";
import type { Video } from "@/types";

// -----------------------------------------------------------------------
// Validation schema — mirrors UpdateVideoSchema in video.actions.ts
// -----------------------------------------------------------------------

const editVideoSchema = z.object({
  title: z
    .string()
    .min(1, "จำเป็นต้องระบุชื่อเรื่อง")
    .max(255, "ชื่อเรื่องต้องไม่เกิน 255 ตัวอักษร"),
  description: z
    .string()
    .max(2000, "คำอธิบายต้องไม่เกิน 2000 ตัวอักษร")
    .optional(),
  isActive: z.boolean(),
});

type EditVideoFormValues = z.infer<typeof editVideoSchema>;

// -----------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------

interface VideoEditFormProps {
  video: Video;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function VideoEditForm({ video }: VideoEditFormProps) {
  const { toast } = useToast();

  // Thumbnail state (managed outside react-hook-form due to async R2 upload)
  const [thumbnailKey, setThumbnailKey] = React.useState<string | null>(video.thumbnailKey);
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(
    resolveThumbnailUrl(video.thumbnailKey, video.thumbnailUrl)
  );
  const [thumbnailDirty, setThumbnailDirty] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<EditVideoFormValues>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: {
      title: video.title,
      description: video.description ?? "",
      isActive: video.isActive,
    },
  });

  const isActiveValue = watch("isActive");

  async function onSubmit(values: EditVideoFormValues) {
    const result = await updateVideo(video.id, {
      title: values.title,
      description: values.description || undefined,
      isActive: values.isActive,
      ...(thumbnailDirty && { thumbnailKey }),
    });

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "อัปเดตไม่สำเร็จ",
        description: result.error,
      });
      return;
    }

    toast({
      title: "อัปเดตวิดีโอแล้ว",
      description: "บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว",
    });

    // Reset dirty state to the newly saved values
    reset({
      title: result.data.title,
      description: result.data.description ?? "",
      isActive: result.data.isActive,
    });
    setThumbnailKey(result.data.thumbnailKey);
    setThumbnailUrl(resolveThumbnailUrl(result.data.thumbnailKey, result.data.thumbnailUrl));
    setThumbnailDirty(false);
  }

  return (
    <Card data-testid="video-edit-form">
      <CardHeader>
        <CardTitle>แก้ไขข้อมูลวิดีโอ</CardTitle>
        <CardDescription>
          อัปเดตชื่อเรื่อง คำอธิบาย หรือการมองเห็นของวิดีโอนี้
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="video-title">
              ชื่อเรื่อง <span className="text-destructive">*</span>
            </Label>
            <Input
              id="video-title"
              placeholder="กรอกชื่อวิดีโอ"
              error={!!errors.title}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="video-description">คำอธิบาย</Label>
            <textarea
              id="video-description"
              rows={4}
              placeholder="คำอธิบายเนื้อหาวิดีโอ (ไม่บังคับ)..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-invalid={errors.description ? "true" : undefined}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Thumbnail */}
          <ThumbnailUploadWidget
            imageKey={thumbnailKey}
            imageUrl={thumbnailUrl}
            onChange={({ key, url }) => {
              setThumbnailKey(key);
              setThumbnailUrl(url);
              setThumbnailDirty(true);
            }}
            getUploadUrl={getUploadVideoThumbnailUrl}
            label="รูปตัวอย่างวิดีโอ"
          />

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="video-isActive" className="text-base font-medium">
                ใช้งาน
              </Label>
              <p className="text-sm text-muted-foreground">
                วิดีโอที่ไม่ใช้งานจะถูกซ่อนจากนักเรียนและไม่สามารถเข้าถึงได้
              </p>
            </div>
            <Switch
              id="video-isActive"
              checked={isActiveValue}
              onCheckedChange={(checked) =>
                setValue("isActive", checked, { shouldDirty: true })
              }
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || (!isDirty && !thumbnailDirty)}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              บันทึกการเปลี่ยนแปลง
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
