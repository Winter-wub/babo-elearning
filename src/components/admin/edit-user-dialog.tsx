"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/actions/user.actions";
import type { SafeUser } from "@/types";

interface EditUserDialogProps {
  user: SafeUser;
  /** Optional trigger element; if omitted, the dialog is controlled externally. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditUserDialog({
  user,
  trigger,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(user.name ?? "");
  const [email, setEmail] = React.useState(user.email);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when user changes
  React.useEffect(() => {
    setName(user.name ?? "");
    setEmail(user.email);
    setError(null);
  }, [user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateUser(user.id, { name: name || undefined, email });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange?.(false);
      toast({ title: "User updated", description: "Changes have been saved." });
    });
  }

  const content = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
        <DialogDescription>Update {user.name}&apos;s account details.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-detail-name">Full name</Label>
          <Input
            id="edit-detail-name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-detail-email">Email</Label>
          <Input
            id="edit-detail-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {content}
    </Dialog>
  );
}
