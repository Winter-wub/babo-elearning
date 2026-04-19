"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { adminSendPasswordReset } from "@/actions/password-reset.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResetPasswordDialogProps {
  /** Whether the dialog is open (controlled by parent) */
  open: boolean;
  /** Called to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** User whose password will be reset */
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Confirmation dialog for admin-initiated password reset.
 * Uses shadcn Dialog (not AlertDialog — not yet installed) with the same
 * destructive-secondary footer pattern used across the admin UI.
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await adminSendPasswordReset({ userId: user.id });

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "เกิดข้อผิดพลาด",
          description: result.error ?? "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้",
        });
        return;
      }

      toast({
        title: "ส่งลิงก์แล้ว",
        description: `ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${user.email} แล้ว`,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
          <DialogDescription>
            ส่งลิงก์รีเซ็ตรหัสผ่านไปที่{" "}
            <span className="font-medium text-foreground">{user.email}</span>?
            {user.name && (
              <>
                {" "}
                ({user.name})
              </>
            )}
            <br />
            <span className="mt-1 block">
              ลิงก์จะหมดอายุใน 1 ชั่วโมง
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                ส่งลิงก์รีเซ็ต
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Trigger button — convenience wrapper for use in table rows
// ---------------------------------------------------------------------------

interface ResetPasswordTriggerProps {
  user: ResetPasswordDialogProps["user"];
}

/**
 * Self-contained trigger button that owns the dialog open state.
 * Drop this into a DropdownMenuItem's `onClick` instead, or render it
 * standalone inside a table cell.
 *
 * Usage inside a DropdownMenuItem:
 *   <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setResetOpen(true); }}>
 *     รีเซ็ตรหัสผ่าน
 *   </DropdownMenuItem>
 *   <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} user={user} />
 */
export function ResetPasswordTriggerButton({
  user,
}: ResetPasswordTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
        aria-label={`รีเซ็ตรหัสผ่านของ ${user.name ?? user.email}`}
      >
        <KeyRound className="h-4 w-4" />
      </Button>
      <ResetPasswordDialog open={open} onOpenChange={setOpen} user={user} />
    </>
  );
}
