"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/actions/profile.actions";
import type { ProfileData } from "@/actions/profile.actions";
import { User, Mail, Calendar, Video, Check } from "lucide-react";

interface ProfileFormProps {
  profile: ProfileData;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name ?? "");
  const [saved, setSaved] = useState(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSaved(false);

      startTransition(async () => {
        const result = await updateProfile({ name });
        if (result.success) {
          setSaved(true);
          toast({
            title: "อัปเดตโปรไฟล์แล้ว",
            description: "อัปเดตชื่อของคุณเรียบร้อยแล้ว",
          });
          router.refresh();
          // Clear saved indicator after 3s
          setTimeout(() => setSaved(false), 3000);
        } else {
          toast({
            title: "ข้อผิดพลาด",
            description: result.error,
            variant: "destructive",
          });
        }
      });
    },
    [name, router, toast]
  );

  const roleBadgeVariant = profile.role === "ADMIN" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      {/* Profile info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            ข้อมูลโปรไฟล์
          </CardTitle>
          <CardDescription>
            อัปเดตชื่อที่แสดง อีเมลและบทบาทไม่สามารถเปลี่ยนแปลงได้
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Name (editable) */}
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อที่แสดง</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="กรอกชื่อของคุณ"
                maxLength={100}
                required
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                ไม่สามารถเปลี่ยนแปลงอีเมลได้
              </p>
            </div>

            {/* Role (read-only) */}
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <div>
                <Badge variant={roleBadgeVariant}>{profile.role}</Badge>
              </div>
            </div>

            {/* Member since */}
            <div className="space-y-2">
              <Label>สมาชิกตั้งแต่</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(profile.createdAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : null}
              {saved ? "บันทึกแล้ว" : "บันทึก"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Stats card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            สถิติบัญชี
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                วิดีโอที่เข้าถึงได้
              </p>
              <p className="mt-1 text-2xl font-bold">
                {profile.totalVideosAccessed}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                สถานะบัญชี
              </p>
              <div className="mt-1">
                <Badge variant={profile.isActive ? "default" : "destructive"}>
                  {profile.isActive ? "ใช้งานอยู่" : "ไม่ใช้งาน"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
