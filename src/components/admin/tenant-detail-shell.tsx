"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Users,
  Video,
  ListVideo,
  Shield,
  Loader2,
  Search,
  UserPlus,
  Trash2,
  AlertTriangle,
  Settings,
  BarChart3,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TenantRole = "OWNER" | "ADMIN" | "STUDENT";

interface TenantMemberRow {
  id: string;
  role: TenantRole;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
  };
}

interface TenantData {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  members: TenantMemberRow[];
}

interface TenantStats {
  memberCount: number;
  videoCount: number;
  playlistCount: number;
  permissionCount: number;
}

interface TenantDetailShellProps {
  tenant: TenantData;
  stats: TenantStats;
  defaultTab: string;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: BarChart3 },
  { id: "members", label: "สมาชิก", icon: Users },
  { id: "settings", label: "การตั้งค่า", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: TenantRole }) {
  const config: Record<TenantRole, { label: string; className: string }> = {
    OWNER: {
      label: "Owner",
      className:
        "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    },
    ADMIN: {
      label: "Admin",
      className:
        "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    },
    STUDENT: {
      label: "Student",
      className: "",
    },
  };
  const { label, className } = config[role];
  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ tenant, stats }: { tenant: TenantData; stats: TenantStats }) {
  const statItems = [
    { label: "สมาชิก", value: stats.memberCount, icon: Users },
    { label: "วิดีโอที่ใช้งาน", value: stats.videoCount, icon: Video },
    { label: "เพลย์ลิสต์", value: stats.playlistCount, icon: ListVideo },
    { label: "สิทธิ์การเข้าถึง", value: stats.permissionCount, icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight">
                {value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenant info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูล Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 text-sm">
            <InfoRow label="ชื่อ" value={tenant.name} />
            <InfoRow
              label="Slug"
              value={<span className="font-mono text-xs">{tenant.slug}</span>}
            />
            <InfoRow
              label="สถานะ"
              value={
                tenant.isActive ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    ใช้งาน
                  </Badge>
                ) : (
                  <Badge variant="destructive">ระงับ</Badge>
                )
              }
            />
            <InfoRow
              label="สร้างเมื่อ"
              value={new Date(tenant.createdAt).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members tab
// ---------------------------------------------------------------------------

function MembersTab({ tenant }: { tenant: TenantData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [search, setSearch] = React.useState("");

  // Add member dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [addEmail, setAddEmail] = React.useState("");
  const [addRole, setAddRole] = React.useState<TenantRole>("STUDENT");
  const [addError, setAddError] = React.useState<string | null>(null);

  // Remove confirmation dialog state
  const [removeTarget, setRemoveTarget] = React.useState<TenantMemberRow | null>(null);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  // Change role inline
  const [changingRoleId, setChangingRoleId] = React.useState<string | null>(null);

  const filtered = tenant.members.filter((m) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (m.user.name?.toLowerCase().includes(term) ?? false) ||
      m.user.email.toLowerCase().includes(term)
    );
  });

  const ownerCount = tenant.members.filter((m) => m.role === "OWNER").length;

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    startTransition(async () => {
      const { addTenantMember } = await import("@/actions/tenant.actions");
      const result = await addTenantMember({
        tenantId: tenant.id,
        email: addEmail,
        role: addRole,
      });
      if (!result.success) {
        setAddError(result.error);
        return;
      }
      setAddOpen(false);
      setAddEmail("");
      toast({ title: "เพิ่มสมาชิกแล้ว", description: `${addEmail} ถูกเพิ่มเป็น ${addRole}` });
      router.refresh();
    });
  }

  async function handleChangeRole(memberId: string, role: TenantRole, memberEmail: string) {
    // Guard: if demoting the last owner, warn
    const member = tenant.members.find((m) => m.id === memberId);
    if (member?.role === "OWNER" && role !== "OWNER" && ownerCount <= 1) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถเปลี่ยนบทบาทได้",
        description: "ต้องมี Owner อย่างน้อย 1 คนใน tenant",
      });
      return;
    }

    setChangingRoleId(memberId);
    startTransition(async () => {
      const { updateTenantMemberRole } = await import("@/actions/tenant.actions");
      const result = await updateTenantMemberRole({ tenantId: tenant.id, userId: member!.user.id, role });
      setChangingRoleId(null);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      toast({ title: "เปลี่ยนบทบาทแล้ว", description: `${memberEmail} เป็น ${role} แล้ว` });
      router.refresh();
    });
  }

  function openRemove(member: TenantMemberRow) {
    setRemoveTarget(member);
    setRemoveOpen(true);
  }

  async function handleRemoveMember() {
    if (!removeTarget) return;
    // Guard last owner
    if (removeTarget.role === "OWNER" && ownerCount <= 1) {
      toast({
        variant: "destructive",
        title: "ไม่สามารถลบ Owner คนสุดท้ายได้",
        description: "กำหนด Owner คนอื่นก่อนแล้วค่อยลบ",
      });
      setRemoveOpen(false);
      return;
    }
    startTransition(async () => {
      const { removeTenantMember } = await import("@/actions/tenant.actions");
      const result = await removeTenantMember(tenant.id, removeTarget.user.id);
      setRemoveOpen(false);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      toast({ title: "ลบสมาชิกแล้ว", description: `${removeTarget.user.email} ถูกลบออกแล้ว` });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาสมาชิก..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          เพิ่มสมาชิก
        </Button>
      </div>

      {/* Members table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead className="hidden sm:table-cell">สถานะบัญชี</TableHead>
              <TableHead className="hidden md:table-cell">เพิ่มเมื่อ</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {search ? "ไม่พบสมาชิกที่ตรงกับการค้นหา" : "ยังไม่มีสมาชิก"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id} className={isPending ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {member.user.name ?? "ไม่ระบุชื่อ"}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Inline role selector */}
                    <Select
                      value={member.role}
                      onValueChange={(v) =>
                        handleChangeRole(member.id, v as TenantRole, member.user.email)
                      }
                      disabled={changingRoleId === member.id || isPending}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        {changingRoleId === member.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant={member.user.isActive ? "outline" : "destructive"}
                      className={
                        member.user.isActive
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 text-xs"
                          : "text-xs"
                      }
                    >
                      {member.user.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => openRemove(member)}
                      disabled={isPending}
                      aria-label={`ลบ ${member.user.email} ออกจาก tenant`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มสมาชิก</DialogTitle>
            <DialogDescription>
              ระบุอีเมลของผู้ใช้ที่ต้องการเพิ่มเข้า tenant นี้
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-email">อีเมล</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                required
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value);
                  setAddError(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-role">บทบาท</Label>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as TenantRole)}
              >
                <SelectTrigger id="add-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner — จัดการ tenant ทั้งหมด</SelectItem>
                  <SelectItem value="ADMIN">Admin — จัดการเนื้อหาและสมาชิก</SelectItem>
                  <SelectItem value="STUDENT">Student — เข้าถึงเนื้อหาเท่านั้น</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && (
              <p className="text-sm text-destructive">{addError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                เพิ่มสมาชิก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบสมาชิก</DialogTitle>
            <DialogDescription>
              คุณต้องการลบ{" "}
              <span className="font-medium text-foreground">
                {removeTarget?.user.email}
              </span>{" "}
              ออกจาก tenant นี้หรือไม่?
            </DialogDescription>
          </DialogHeader>
          {removeTarget?.role === "OWNER" && ownerCount <= 1 && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ไม่สามารถลบ Owner คนสุดท้ายได้ กรุณาแต่งตั้ง Owner คนใหม่ก่อน
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={
                isPending ||
                (removeTarget?.role === "OWNER" && ownerCount <= 1)
              }
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบสมาชิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({ tenant }: { tenant: TenantData }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(tenant.name);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Suspend toggle
  const [suspendOpen, setSuspendOpen] = React.useState(false);

  // Delete danger zone
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError("ชื่อต้องมีอย่างน้อย 2 ตัวอักษร");
      return;
    }
    startTransition(async () => {
      const { updateTenant } = await import("@/actions/tenant.actions");
      const result = await updateTenant(tenant.id, { name: name.trim() });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast({ title: "บันทึกแล้ว", description: "ชื่อ tenant ถูกอัปเดตแล้ว" });
      router.refresh();
    });
  }

  async function handleToggleActive() {
    startTransition(async () => {
      const { updateTenant } = await import("@/actions/tenant.actions");
      const result = await updateTenant(tenant.id, { isActive: !tenant.isActive });
      setSuspendOpen(false);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }
      toast({
        title: tenant.isActive ? "ระงับ Tenant แล้ว" : "เปิดใช้งาน Tenant แล้ว",
        description: tenant.isActive
          ? "ผู้ใช้ใน tenant นี้จะไม่สามารถเข้าสู่ระบบได้"
          : "ผู้ใช้ใน tenant นี้สามารถเข้าสู่ระบบได้อีกครั้ง",
      });
      router.refresh();
    });
  }

  async function handleDelete() {
    startTransition(async () => {
      const { deleteTenant } = await import("@/actions/tenant.actions");
      const result = await deleteTenant(tenant.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        setDeleteOpen(false);
        return;
      }
      toast({ title: "ลบ Tenant แล้ว" });
      router.push("/admin/tenants");
    });
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Edit name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลทั่วไป</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">ชื่อ Tenant</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={tenant.slug}
                disabled
                className="font-mono text-xs text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Slug ไม่สามารถเปลี่ยนได้หลังจากสร้างแล้ว
              </p>
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button type="submit" disabled={isPending || name.trim() === tenant.name}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึกการเปลี่ยนแปลง
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Suspend toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">สถานะ Tenant</CardTitle>
          <CardDescription>
            เมื่อระงับ tenant สมาชิกทั้งหมดจะไม่สามารถเข้าสู่ระบบหรือเข้าถึงเนื้อหาได้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {tenant.isActive ? "Tenant กำลังใช้งาน" : "Tenant ถูกระงับ"}
              </p>
              <p className="text-xs text-muted-foreground">
                {tenant.isActive
                  ? "คลิกเพื่อระงับการใช้งาน tenant นี้"
                  : "คลิกเพื่อเปิดใช้งาน tenant นี้อีกครั้ง"}
              </p>
            </div>
            <Switch
              checked={tenant.isActive}
              onCheckedChange={() => setSuspendOpen(true)}
              aria-label="สลับสถานะ tenant"
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            การลบ tenant จะลบข้อมูลทั้งหมดอย่างถาวร รวมถึงสมาชิก วิดีโอ และเพลย์ลิสต์
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            ลบ Tenant อย่างถาวร
          </Button>
        </CardContent>
      </Card>

      {/* Suspend confirmation dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tenant.isActive ? "ยืนยันการระงับ Tenant" : "ยืนยันการเปิดใช้งาน Tenant"}
            </DialogTitle>
            <DialogDescription>
              {tenant.isActive
                ? `การระงับ "${tenant.name}" จะส่งผลให้:`
                : `การเปิดใช้งาน "${tenant.name}" อีกครั้งจะอนุญาตให้สมาชิกเข้าถึงแพลตฟอร์มได้`}
            </DialogDescription>
          </DialogHeader>
          {tenant.isActive && (
            <ul className="ml-4 space-y-1 text-sm list-disc text-muted-foreground">
              <li>สมาชิกทั้งหมดจะไม่สามารถเข้าสู่ระบบได้</li>
              <li>การเข้าถึงวิดีโอทั้งหมดจะถูกบล็อก</li>
              <li>ข้อมูลจะยังคงอยู่ครบถ้วน สามารถเปิดใช้งานคืนได้</li>
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant={tenant.isActive ? "destructive" : "default"}
              onClick={handleToggleActive}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tenant.isActive ? "ระงับ Tenant" : "เปิดใช้งาน Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ Tenant อย่างถาวร</DialogTitle>
            <DialogDescription>
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลทั้งหมดจะถูกลบถาวร
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                พิมพ์ชื่อ tenant{" "}
                <span className="font-mono font-bold">{tenant.slug}</span>{" "}
                เพื่อยืนยัน
              </p>
            </div>
            <Input
              placeholder={tenant.slug}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || deleteConfirm !== tenant.slug}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell (tab switcher)
// ---------------------------------------------------------------------------

export function TenantDetailShell({
  tenant,
  stats,
  defaultTab,
}: TenantDetailShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = React.useState<TabId>(
    (defaultTab as TabId) ?? "overview"
  );

  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId);
    // Reflect tab in URL search param for bookmarkability
    const params = new URLSearchParams();
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
            {tenant.isActive ? (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                ใช้งาน
              </Badge>
            ) : (
              <Badge variant="destructive">ระงับ</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Tenant sections"
        className="flex gap-1 border-b"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find((t) => t.id === activeTab)?.label}
      >
        {activeTab === "overview" && (
          <OverviewTab tenant={tenant} stats={stats} />
        )}
        {activeTab === "members" && <MembersTab tenant={tenant} />}
        {activeTab === "settings" && <SettingsTab tenant={tenant} />}
      </div>
    </div>
  );
}
