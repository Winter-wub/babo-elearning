"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import type { SafeUser } from "@/types";

interface UserDetailActionsProps {
  user: SafeUser;
}

export function UserDetailActions({ user }: UserDetailActionsProps) {
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
        className="shrink-0"
      >
        <Pencil className="mr-1.5 h-4 w-4" />
        Edit User
      </Button>

      <EditUserDialog
        user={user}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
