"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Search,
  UserPlus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { createUser, updateUser, deleteUser } from "@/actions/user.actions";
import type { SafeUserWithCount } from "@/actions/user.actions";
import type { PaginationMeta } from "@/types";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface UsersTableProps {
  users: SafeUserWithCount[];
  meta: PaginationMeta;
}

interface CreateUserFormState {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "ADMIN";
}

interface EditUserFormState {
  name: string;
  email: string;
}

// -----------------------------------------------------------------------
// Sort indicator helper
// -----------------------------------------------------------------------

function SortIcon({
  column,
  currentSort,
  currentOrder,
}: {
  column: string;
  currentSort: string;
  currentOrder: string;
}) {
  if (currentSort !== column) return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />;
  return currentOrder === "asc" ? (
    <ChevronUp className="ml-1 h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 h-3 w-3" />
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function UsersTable({ users, meta }: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ---- URL-driven filter state (read from search params) ----
  const currentSearch = searchParams.get("search") ?? "";
  const currentRole = searchParams.get("role") ?? "";
  const currentStatus = searchParams.get("isActive") ?? "";
  const currentSort = searchParams.get("sortBy") ?? "createdAt";
  const currentOrder = searchParams.get("sortOrder") ?? "desc";
  const currentPage = Number(searchParams.get("page") ?? "1");

  // ---- Local transient state ----
  const [searchInput, setSearchInput] = React.useState(currentSearch);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<SafeUserWithCount | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const [createForm, setCreateForm] = React.useState<CreateUserFormState>({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
  });
  const [editForm, setEditForm] = React.useState<EditUserFormState>({ name: "", email: "" });
  const [formError, setFormError] = React.useState<string | null>(null);

  // ---- URL builder helpers ----
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    return `${pathname}?${params.toString()}`;
  }

  function pushParams(overrides: Record<string, string | undefined>) {
    router.push(buildUrl(overrides));
  }

  // Debounced search: update URL after user stops typing
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pushParams({ search: value || undefined, page: "1" });
    }, 400);
  }

  function handleSort(column: string) {
    const newOrder =
      currentSort === column && currentOrder === "asc" ? "desc" : "asc";
    pushParams({ sortBy: column, sortOrder: newOrder, page: "1" });
  }

  // ---- Create user ----
  function openCreate() {
    setCreateForm({ name: "", email: "", password: "", role: "STUDENT" });
    setFormError(null);
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await createUser(createForm);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setCreateOpen(false);
      toast({ title: "User created", description: `${createForm.name} has been added.` });
    });
  }

  // ---- Edit user ----
  function openEdit(user: SafeUserWithCount) {
    setEditTarget(user);
    setEditForm({ name: user.name ?? "", email: user.email });
    setFormError(null);
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setFormError(null);
    startTransition(async () => {
      const result = await updateUser(editTarget.id, editForm);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setEditOpen(false);
      toast({ title: "User updated", description: "Changes have been saved." });
    });
  }

  // ---- Toggle active ----
  async function handleToggleActive(user: SafeUserWithCount) {
    startTransition(async () => {
      const result = await updateUser(user.id, { isActive: !user.isActive });
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({
        title: user.isActive ? "User deactivated" : "User activated",
        description: `${user.name}'s account has been ${user.isActive ? "deactivated" : "activated"}.`,
      });
    });
  }

  // ---- Soft delete ----
  async function handleDelete(user: SafeUserWithCount) {
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      toast({ title: "User deactivated", description: `${user.name} has been deactivated.` });
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4" data-testid="users-table">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search + filters */}
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              className="pl-8"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <Select
            value={currentRole || "all"}
            onValueChange={(v) =>
              pushParams({ role: v === "all" ? undefined : v, page: "1" })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="STUDENT">Student</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={currentStatus || "all"}
            onValueChange={(v) =>
              pushParams({ isActive: v === "all" ? undefined : v, page: "1" })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add user */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="shrink-0">
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user account. They can log in immediately.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Full name</Label>
                <Input
                  id="create-name"
                  placeholder="Jane Doe"
                  required
                  minLength={2}
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="jane@example.com"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      role: v as "STUDENT" | "ADMIN",
                    }))
                  }
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="inline-flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("name")}
                  type="button"
                >
                  Name
                  <SortIcon column="name" currentSort={currentSort} currentOrder={currentOrder} />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="inline-flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("email")}
                  type="button"
                >
                  Email
                  <SortIcon column="email" currentSort={currentSort} currentOrder={currentOrder} />
                </button>
              </TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role === "ADMIN" ? "Admin" : "Student"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? "outline" : "destructive"}
                      className={
                        user.isActive
                          ? "border-green-500 text-green-600 dark:text-green-400"
                          : undefined
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {user._count.videoPermissions}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Row actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user.id}`}>
                            View Permissions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={user.isActive ? "text-amber-600 focus:text-amber-600" : "text-green-600 focus:text-green-600"}
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(user)}
                        >
                          Delete (Soft)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * meta.pageSize + 1}–
              {Math.min(currentPage * meta.pageSize, meta.total)}
            </span>{" "}
            of <span className="font-medium">{meta.total}</span> users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => pushParams({ page: String(currentPage - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= meta.totalPages}
              onClick={() => pushParams({ page: String(currentPage + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user&apos;s name or email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                required
                minLength={2}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
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
      </Dialog>
    </div>
  );
}
