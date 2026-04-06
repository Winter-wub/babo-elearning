"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ThemePreview } from "@/components/admin/theme-preview";
import {
  updateThemeSettings,
  getLogoUploadUrl,
  saveThemeLogoKey,
  removeThemeLogo,
} from "@/actions/theme.actions";
import type { ThemeSettings } from "@/actions/theme.actions";
import { THEME_DEFAULTS } from "@/lib/constants";
import { Loader2, Upload, Trash2, RotateCcw } from "lucide-react";

interface ThemeEditorProps {
  settings: ThemeSettings;
}

export function ThemeEditor({ settings }: ThemeEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [defaultMode, setDefaultMode] = useState(settings.defaultMode);
  const [radius, setRadius] = useState(settings.radius);
  const [sidebarBg, setSidebarBg] = useState(settings.sidebarBg);
  const [sidebarFg, setSidebarFg] = useState(settings.sidebarFg);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);

  const isDirty =
    primaryColor !== settings.primaryColor ||
    defaultMode !== settings.defaultMode ||
    radius !== settings.radius ||
    sidebarBg !== settings.sidebarBg ||
    sidebarFg !== settings.sidebarFg;

  function handleSave() {
    startTransition(async () => {
      const result = await updateThemeSettings({
        primaryColor,
        defaultMode,
        radius,
        sidebarBg,
        sidebarFg,
      });

      if (result.success) {
        toast({ title: "บันทึกธีมสำเร็จ", description: "การเปลี่ยนแปลงจะมีผลทันที" });
        router.refresh();
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleReset() {
    setPrimaryColor(THEME_DEFAULTS.primaryColor);
    setDefaultMode(THEME_DEFAULTS.defaultMode);
    setRadius(THEME_DEFAULTS.radius);
    setSidebarBg(THEME_DEFAULTS.sidebarBg);
    setSidebarFg(THEME_DEFAULTS.sidebarFg);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Get presigned upload URL
      const urlResult = await getLogoUploadUrl(file.name, file.type, file.size);
      if (!urlResult.success) {
        toast({ title: "เกิดข้อผิดพลาด", description: urlResult.error, variant: "destructive" });
        return;
      }

      // Upload to R2
      const { uploadUrl, key } = urlResult.data;
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        toast({ title: "อัปโหลดล้มเหลว", description: "ไม่สามารถอัปโหลดไฟล์ได้", variant: "destructive" });
        return;
      }

      // Save key to SiteContent
      const saveResult = await saveThemeLogoKey(key);
      if (saveResult.success) {
        setLogoUrl(key);
        toast({ title: "อัปโหลดโลโก้สำเร็จ" });
        router.refresh();
      } else {
        toast({ title: "เกิดข้อผิดพลาด", description: saveResult.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดโลโก้ได้", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  }

  async function handleLogoRemove() {
    const result = await removeThemeLogo();
    if (result.success) {
      setLogoUrl("");
      toast({ title: "ลบโลโก้สำเร็จ" });
      router.refresh();
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      {/* Left — Controls */}
      <div className="space-y-6">
        {/* Primary Color */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สีหลัก (Primary Color)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input"
              />
              <Input
                value={primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColor(v);
                }}
                placeholder="#4f46e5"
                className="w-32 font-mono"
              />
              <div
                className="h-10 flex-1 rounded-md border border-input"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              สีหลักจะถูกใช้สำหรับปุ่ม ลิงก์ และองค์ประกอบเน้นทั้งหมด
            </p>
          </CardContent>
        </Card>

        {/* Dark Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">โหมดสี</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode-switch">โหมดมืดเป็นค่าเริ่มต้น</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  เปิดใช้โหมดมืดเป็นค่าเริ่มต้นสำหรับผู้ใช้ทุกคน
                </p>
              </div>
              <Switch
                id="dark-mode-switch"
                checked={defaultMode === "dark"}
                onCheckedChange={(checked) =>
                  setDefaultMode(checked ? "dark" : "light")
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Border Radius */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ความโค้งมน (Border Radius)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="2"
                step="0.125"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="flex-1"
              />
              <span className="w-16 text-right font-mono text-sm text-muted-foreground">
                {radius} rem
              </span>
            </div>
            {/* Radius preview */}
            <div className="flex gap-3">
              {[0, 0.25, 0.5, 0.625, 1, 1.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(String(r))}
                  className={`h-10 w-10 border-2 transition-colors ${
                    radius === String(r)
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted"
                  }`}
                  style={{ borderRadius: `${r}rem` }}
                  title={`${r} rem`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สีแถบข้าง (Sidebar)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>สีพื้นหลัง</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidebarBg}
                    onChange={(e) => setSidebarBg(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-input"
                  />
                  <Input
                    value={sidebarBg}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSidebarBg(v);
                    }}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>สีตัวอักษร</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidebarFg}
                    onChange={(e) => setSidebarFg(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-input"
                  />
                  <Input
                    value={sidebarFg}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setSidebarFg(v);
                    }}
                    className="w-28 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">โลโก้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted p-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {logoUrl.split("/").pop()}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogoRemove}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  ลบโลโก้
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild disabled={isUploading}>
                  <label className="cursor-pointer">
                    {isUploading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-4 w-4" />
                    )}
                    {isUploading ? "กำลังอัปโหลด..." : "เลือกไฟล์โลโก้"}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      onChange={handleLogoUpload}
                      className="sr-only"
                      disabled={isUploading}
                    />
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, SVG, WebP, JPEG — สูงสุด 2 MB
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isPending || !isDirty}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            บันทึก
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            รีเซ็ตเป็นค่าเริ่มต้น
          </Button>
        </div>
      </div>

      {/* Right — Live Preview */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">ตัวอย่างแบบเรียลไทม์</h3>
        <ThemePreview
          primaryColor={primaryColor}
          sidebarBg={sidebarBg}
          sidebarFg={sidebarFg}
          radius={radius}
          darkMode={false}
        />
        <ThemePreview
          primaryColor={primaryColor}
          sidebarBg={sidebarBg}
          sidebarFg={sidebarFg}
          radius={radius}
          darkMode={true}
        />
      </div>
    </div>
  );
}
