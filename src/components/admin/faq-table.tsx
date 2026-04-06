"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createFaq, updateFaq, deleteFaq } from "@/actions/faq.actions";
import type { Faq } from "@prisma/client";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface FaqTableProps {
  faqs: Faq[];
}

interface FaqFormState {
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultFormState: FaqFormState = {
  question: "",
  answer: "",
  sortOrder: 0,
  isActive: true,
};

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function FaqTable({ faqs }: FaqTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FaqFormState>(defaultFormState);

  // Delete confirm dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingFaq, setDeletingFaq] = React.useState<Faq | null>(null);

  function openCreateDialog() {
    setEditingId(null);
    setForm(defaultFormState);
    setDialogOpen(true);
  }

  function openEditDialog(faq: Faq) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
      isActive: faq.isActive,
    });
    setDialogOpen(true);
  }

  function openDeleteDialog(faq: Faq) {
    setDeletingFaq(faq);
    setDeleteDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.question.trim() || !form.answer.trim()) {
      toast({
        variant: "destructive",
        title: "ข้อผิดพลาดการตรวจสอบ",
        description: "จำเป็นต้องระบุทั้งคำถามและคำตอบ",
      });
      return;
    }

    startTransition(async () => {
      const data = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };

      const result = editingId
        ? await updateFaq(editingId, data)
        : await createFaq(data);

      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิดพลาด", description: result.error });
        return;
      }

      toast({
        title: editingId ? "อัปเดตคำถามที่พบบ่อยแล้ว" : "สร้างคำถามที่พบบ่อยแล้ว",
        description: editingId
          ? "อัปเดตคำถามที่พบบ่อยเรียบร้อยแล้ว"
          : "สร้างคำถามที่พบบ่อยใหม่แล้ว",
      });

      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deletingFaq) return;
    startTransition(async () => {
      const result = await deleteFaq(deletingFaq.id);
      if (!result.success) {
        toast({ variant: "destructive", title: "ข้อผิด��ลาด", description: result.error });
        return;
      }
      toast({ title: "ลบคำถามที่พบบ่อยแล้ว" });
      setDeleteDialogOpen(false);
      setDeletingFaq(null);
      router.refresh();
    });
  }

  function handleToggleActive(faq: Faq) {
    startTransition(async () => {
      const result = await updateFaq(faq.id, { isActive: !faq.isActive });
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="faq-table">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          ทั้งหมด {faqs.length} คำถามที่พบบ่อย
        </p>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          เพิ่มคำถามที่พบบ่อย
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ลำดับ</TableHead>
              <TableHead>คำถาม</TableHead>
              <TableHead className="w-24">สถานะ</TableHead>
              <TableHead className="w-28">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 opacity-40" />
                    <p className="text-sm font-medium">ยังไม่มีคำถามที่พบบ่อย</p>
                    <p className="text-xs">
                      สร้างคำถามที���พบบ่อยแรกของคุณเพื่อเริ่มต้น
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={openCreateDialog}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      เพิ่มคำถ��มที่พบบ่อย
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              faqs.map((faq) => (
                <TableRow
                  key={faq.id}
                  className={isPending ? "opacity-60" : undefined}
                >
                  <TableCell className="tabular-nums text-muted-foreground">
                    {faq.sortOrder}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{faq.question}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {faq.answer}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={faq.isActive}
                      onCheckedChange={() => handleToggleActive(faq)}
                      disabled={isPending}
                      aria-label={`Toggle active for "${faq.question}"`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(faq)}
                        aria-label={`Edit "${faq.question}"`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(faq)}
                        aria-label={`Delete "${faq.question}"`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "แก้ไขคำถามที่พบบ่อย" : "สร้างคำถามที่พบบ่อย"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "อัปเดตรายละเอียดคำถามที่พบบ่อยด้านล่าง"
                : "กรอกคำถามและคำตอบ"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-question">คำถา���</Label>
              <Input
                id="faq-question"
                value={form.question}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, question: e.target.value }))
                }
                placeholder="เช่น ฉันจะรีเซ็ตรหัสผ่านได้อย่างไร?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-answer">คำตอบ</Label>
              <textarea
                id="faq-answer"
                value={form.answer}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, answer: e.target.value }))
                }
                placeholder="คำตอบของคำถาม..."
                rows={4}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-sortOrder">ลำดับ</Label>
              <Input
                id="faq-sortOrder"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(e.target.value),
                  }))
                }
                min={0}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="faq-isActive"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label htmlFor="faq-isActive">ใช้งาน</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "บันทึกการเปลี่ยนแปลง" : "สร้างคำถามที่พบบ่อย"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ลบคำถามที่พบบ่อย</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบคำถามที่พบบ่อยนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          {deletingFaq && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm font-medium">{deletingFaq.question}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
