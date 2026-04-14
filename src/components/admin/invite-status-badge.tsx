"use client";

import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleX, UsersRound, Ban } from "lucide-react";
import type { InviteLinkStatus } from "@/lib/invite-utils";

export function InviteStatusBadge({ status }: { status: InviteLinkStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <CircleCheck className="h-3 w-3" />
          ใช้งาน
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1">
          <CircleX className="h-3 w-3" />
          หมดอายุ
        </Badge>
      );
    case "exhausted":
      return (
        <Badge className="gap-1 border-violet-500/25 bg-violet-500/15 text-violet-700 dark:text-violet-400">
          <UsersRound className="h-3 w-3" />
          ใช้ครบแล้ว
        </Badge>
      );
    case "revoked":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Ban className="h-3 w-3" />
          ถูกยกเลิก
        </Badge>
      );
  }
}
