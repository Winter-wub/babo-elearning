"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createStandaloneExam, deleteStandaloneExam } from "@/actions/exam.actions";
import type { ExerciseWithQuestions } from "@/types/exercise";
import { Plus, Trash2, ClipboardCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExamListPageProps {
  exams: ExerciseWithQuestions[];
}

export function ExamListPage({ exams }: ExamListPageProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createStandaloneExam({ title: newTitle.trim() });
      if (result.success) {
        setShowCreate(false);
        setNewTitle("");
        router.push(`/admin/exams/${result.data.id}`);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteStandaloneExam(id);
      setDeleteId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-tour="exams-toolbar">
        <div>
          <h1 className="text-2xl font-bold">แบบทดสอบวัดระดับ</h1>
          <p className="text-sm text-muted-foreground">
            จัดการแบบทดสอบแบบ Standalone สำหรับหน้าแรก
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          สร้างแบบทดสอบ
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">ยังไม่มีแบบทดสอบ</p>
            <p className="text-sm text-muted-foreground mb-4">
              สร้างแบบทดสอบวัดระดับสำหรับใช้บนหน้าแรก
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              สร้างแบบทดสอบแรก
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" data-tour="exams-list">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    <Badge variant={exam.isActive ? "default" : "secondary"}>
                      {exam.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/exam/${exam.id}`} target="_blank">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        ดูตัวอย่าง
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/exams/${exam.id}`}>แก้ไข</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(exam.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{exam.questions.length} คำถาม</span>
                  <span>คะแนนผ่าน {exam.passingScore}%</span>
                  <span>{exam._count.attempts} ครั้งที่ทำ</span>
                  {exam.maxAttempts && <span>จำกัด {exam.maxAttempts} ครั้ง</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างแบบทดสอบใหม่</DialogTitle>
            <DialogDescription>
              ตั้งชื่อแบบทดสอบ แล้วเพิ่มคำถามในหน้าถัดไป
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="เช่น แบบทดสอบวัดระดับภาษาอังกฤษ"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !newTitle.trim()}>
              {isPending ? "กำลังสร้าง..." : "สร้าง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบแบบทดสอบ</DialogTitle>
            <DialogDescription>
              การลบจะลบคำถามและประวัติการทำทั้งหมด ดำเนินการต่อหรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isPending}
            >
              {isPending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
