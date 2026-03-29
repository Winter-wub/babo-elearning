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
import { useToast } from "@/hooks/use-toast";
import { updateVideo } from "@/actions/video.actions";
import type { Video } from "@/types";

// -----------------------------------------------------------------------
// Validation schema — mirrors UpdateVideoSchema in video.actions.ts
// -----------------------------------------------------------------------

const editVideoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
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
    });

    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: result.error,
      });
      return;
    }

    toast({
      title: "Video updated",
      description: "Changes have been saved successfully.",
    });

    // Reset dirty state to the newly saved values
    reset({
      title: result.data.title,
      description: result.data.description ?? "",
      isActive: result.data.isActive,
    });
  }

  return (
    <Card data-testid="video-edit-form">
      <CardHeader>
        <CardTitle>Edit Video Metadata</CardTitle>
        <CardDescription>
          Update the title, description, or visibility of this video.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="video-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="video-title"
              placeholder="Enter video title"
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
            <Label htmlFor="video-description">Description</Label>
            <textarea
              id="video-description"
              rows={4}
              placeholder="Optional description of the video content…"
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

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="video-isActive" className="text-base font-medium">
                Active
              </Label>
              <p className="text-sm text-muted-foreground">
                Inactive videos are hidden from students and cannot be accessed.
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
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
