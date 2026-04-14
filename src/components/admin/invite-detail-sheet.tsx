"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getInviteLinkDetail,
  revokeInviteLink,
} from "@/actions/invite.actions";
import { getPermissionLabel } from "@/lib/invite-utils";
import { InviteStatusBadge } from "./invite-status-badge";
import type { InviteLinkDetail } from "@/types";
import { Copy, Check, Film, Ban } from "lucide-react";

interface InviteDetailSheetProps {
  inviteId: string | null;
  onClose: () => void;
}

function formatDate(date: Date | null) {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InviteDetailSheet({ inviteId, onClose }: InviteDetailSheetProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [detail, setDetail] = useState<InviteLinkDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (!inviteId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    getInviteLinkDetail(inviteId).then((r) => {
      setLoading(false);
      if (r.success) setDetail(r.data);
    });
  }, [inviteId]);

  const inviteUrl = detail
    ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/register?invite=${detail.code}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!detail) return;
    setIsRevoking(true);
    const result = await revokeInviteLink(detail.id);
    setIsRevoking(false);
    setRevokeOpen(false);
    if (result.success) {
      toast({ title: "ยกเลิกลิงก์เชิญแล้ว" });
      onClose();
      router.refresh();
    } else {
      toast({ title: "เกิดข้อผิดพลาด", description: result.error, variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={!!inviteId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.label}</SheetTitle>
                <SheetDescription>
                  สร้างเมื่อ {formatDate(detail.createdAt)} โดย{" "}
                  {detail.creator.name || detail.creator.email}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Link URL */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">ลิงก์เชิญ</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={inviteUrl}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Status & Redemptions */}
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">สถานะ</span>
                    <InviteStatusBadge status={detail.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">การใช้งาน</span>
                    <span className="text-sm tabular-nums">
                      {detail.currentRedemptions} /{" "}
                      {detail.maxRedemptions ?? "ไม่จำกัด"}
                    </span>
                  </div>
                  {detail.maxRedemptions && (
                    <div className="h-1.5 w-full rounded-full bg-primary/20">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, (detail.currentRedemptions / detail.maxRedemptions) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">หมดอายุ</span>
                    <span className="text-sm">{formatDate(detail.expiresAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ระยะเวลาสิทธิ์</span>
                    <span className="text-sm">{getPermissionLabel(detail)}</span>
                  </div>
                </div>

                {/* Videos */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    วิดีโอที่รวม ({detail.videos.length})
                  </p>
                  <ul className="space-y-1">
                    {detail.videos.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Film className="h-3 w-3 shrink-0 text-muted-foreground" />
                        {v.title}
                      </li>
                    ))}
                    {detail.videos.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        ไม่พบวิดีโอ (อาจถูกลบแล้ว)
                      </p>
                    )}
                  </ul>
                </div>

                {/* Redemptions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    ผู้ใช้ที่สมัครผ่านลิงก์นี้ ({detail.redemptions.length})
                  </p>
                  {detail.redemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีผู้ใช้สมัครผ่านลิงก์นี้
                    </p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left font-medium">ชื่อ</th>
                            <th className="px-3 py-2 text-left font-medium">อีเมล</th>
                            <th className="px-3 py-2 text-left font-medium">สมัครเมื่อ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.redemptions.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                              <td className="px-3 py-2">{r.user.name ?? "\u2014"}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {r.user.email}
                              </td>
                              <td className="px-3 py-2">{formatDate(r.redeemedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCopy}>
                    {copied ? (
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    คัดลอกลิงก์
                  </Button>
                  {detail.status === "active" && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setRevokeOpen(true)}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      ยกเลิกลิงก์
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">ไม่พบลิงก์เชิญ</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Revoke Confirmation */}
      <Dialog open={revokeOpen} onOpenChange={(open) => !open && setRevokeOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกลิงก์?</DialogTitle>
            <DialogDescription>
              ลิงก์ &ldquo;{detail?.label}&rdquo; จะไม่สามารถใช้งานได้อีก
              นักเรียนที่สมัครไปแล้วจะยังคงมีสิทธิ์เดิม
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeOpen(false)}
              disabled={isRevoking}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  กำลังยกเลิก...
                </>
              ) : (
                "ยืนยันการยกเลิก"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
