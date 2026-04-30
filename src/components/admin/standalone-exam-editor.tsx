"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  Pencil,
  ArrowLeft,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/actions/exercise.actions";
import { updateStandaloneExam } from "@/actions/exam.actions";
import { QuestionBuilder } from "@/components/admin/question-builder";
import type { ExerciseWithQuestions } from "@/types/exercise";
import type { ExerciseQuestion } from "@prisma/client";

const QUESTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  MULTIPLE_CHOICE: { label: "Multiple Choice", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  CHECKBOXES: { label: "Checkboxes", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  DROPDOWN: { label: "Dropdown", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  TRUE_FALSE: { label: "True/False", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  SHORT_ANSWER: { label: "Short Answer", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  PARAGRAPH: { label: "Paragraph", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  LINEAR_SCALE: { label: "Linear Scale", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  MATCHING: { label: "Matching", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
  FILL_IN_BLANK: { label: "Fill in Blank", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
};

interface StandaloneExamEditorProps {
  exam: ExerciseWithQuestions;
}

export function StandaloneExamEditor({ exam: initialExam }: StandaloneExamEditorProps) {
  const [exam, setExam] = useState(initialExam);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(exam.title);
  const [settingsDescription, setSettingsDescription] = useState(exam.description ?? "");
  const [settingsPassingScore, setSettingsPassingScore] = useState(exam.passingScore);
  const [settingsMaxAttempts, setSettingsMaxAttempts] = useState<number | null>(exam.maxAttempts);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExerciseQuestion | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const examUrl = `/exam/${exam.id}`;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleToggleActive = useCallback(async () => {
    setSaving(true);
    const result = await updateStandaloneExam({
      exerciseId: exam.id,
      isActive: !exam.isActive,
    });
    if (result.success) setExam(result.data);
    setSaving(false);
  }, [exam]);

  const handleSaveSettings = useCallback(async () => {
    setSaving(true);
    const result = await updateStandaloneExam({
      exerciseId: exam.id,
      title: settingsTitle,
      description: settingsDescription || null,
      passingScore: settingsPassingScore,
      maxAttempts: settingsMaxAttempts,
    });
    if (result.success) {
      setExam(result.data);
      setEditingSettings(false);
    }
    setSaving(false);
  }, [exam.id, settingsTitle, settingsDescription, settingsPassingScore, settingsMaxAttempts]);

  const handleAddQuestion = useCallback(
    async (data: { type: string; text: string; required: boolean; points: number; config: Record<string, unknown> }) => {
      setSaving(true);
      const result = await addQuestion({
        exerciseId: exam.id,
        ...data,
      });
      if (result.success) {
        setExam(result.data);
        setAddingQuestion(false);
      }
      setSaving(false);
    },
    [exam.id]
  );

  const handleUpdateQuestion = useCallback(
    async (data: { questionId: string; text?: string; required?: boolean; points?: number; config?: Record<string, unknown> }) => {
      setSaving(true);
      const result = await updateQuestion(data);
      if (result.success) {
        setExam(result.data);
        setEditingQuestion(null);
      }
      setSaving(false);
    },
    []
  );

  const handleDeleteQuestion = useCallback(async () => {
    if (!deletingQuestionId) return;
    setSaving(true);
    const result = await deleteQuestion(deletingQuestionId);
    if (result.success) setExam(result.data);
    setDeletingQuestionId(null);
    setSaving(false);
  }, [deletingQuestionId]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = exam.questions.findIndex((q) => q.id === active.id);
      const newIndex = exam.questions.findIndex((q) => q.id === over.id);
      const newOrder = arrayMove(exam.questions, oldIndex, newIndex);

      setExam((prev) => ({ ...prev, questions: newOrder }));

      const result = await reorderQuestions({
        exerciseId: exam.id,
        questionIds: newOrder.map((q) => q.id),
      });
      if (result.success) setExam(result.data);
    },
    [exam]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-sm text-muted-foreground">
              {exam.questions.length} คำถาม · {exam._count.attempts} ครั้งที่ทำ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="active-toggle" className="text-sm">เปิดใช้งาน</Label>
            <Switch
              id="active-toggle"
              checked={exam.isActive}
              onCheckedChange={handleToggleActive}
              disabled={saving}
            />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={examUrl} target="_blank">
              <ExternalLink className="mr-1 h-3 w-3" />
              ดูตัวอย่าง
            </Link>
          </Button>
        </div>
      </div>

      {/* Exam link for CMS */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">ลิงก์สำหรับหน้าแรก:</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs">{examUrl}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigator.clipboard.writeText(examUrl)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">ตั้งค่าแบบทดสอบ</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditingSettings(true)}>
              <Pencil className="mr-1 h-3 w-3" />
              แก้ไข
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">ชื่อ</p>
              <p className="font-medium">{exam.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground">คะแนนผ่าน</p>
              <p className="font-medium">{exam.passingScore}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">คำอธิบาย</p>
              <p className="font-medium">{exam.description || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">จำนวนครั้งสูงสุด</p>
              <p className="font-medium">{exam.maxAttempts ?? "ไม่จำกัด"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">คำถาม ({exam.questions.length})</CardTitle>
            <Button size="sm" onClick={() => setAddingQuestion(true)}>
              <Plus className="mr-1 h-3 w-3" />
              เพิ่มคำถาม
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {exam.questions.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีคำถาม กดปุ่ม "เพิ่มคำถาม" เพื่อเริ่มต้น
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={exam.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y">
                  {exam.questions.map((q, i) => (
                    <SortableQuestionRow
                      key={q.id}
                      question={q}
                      index={i}
                      onEdit={() => setEditingQuestion(q)}
                      onDelete={() => setDeletingQuestionId(q.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Settings dialog */}
      <Dialog open={editingSettings} onOpenChange={setEditingSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตั้งค่าแบบทดสอบ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ชื่อแบบทดสอบ</Label>
              <Input value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)} />
            </div>
            <div>
              <Label>คำอธิบาย</Label>
              <Input value={settingsDescription} onChange={(e) => setSettingsDescription(e.target.value)} placeholder="อธิบายเกี่ยวกับแบบทดสอบ" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>คะแนนผ่าน (%)</Label>
                <Input type="number" min={0} max={100} value={settingsPassingScore} onChange={(e) => setSettingsPassingScore(Number(e.target.value))} />
              </div>
              <div>
                <Label>จำนวนครั้งสูงสุด</Label>
                <Input
                  type="number"
                  min={1}
                  value={settingsMaxAttempts ?? ""}
                  onChange={(e) => setSettingsMaxAttempts(e.target.value ? Number(e.target.value) : null)}
                  placeholder="ไม่จำกัด"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSettings(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveSettings} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add question dialog */}
      <Dialog open={addingQuestion} onOpenChange={setAddingQuestion}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มคำถาม</DialogTitle>
          </DialogHeader>
          <QuestionBuilder onSave={handleAddQuestion} onCancel={() => setAddingQuestion(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit question dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขคำถาม</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <QuestionBuilder
              initialData={{
                ...editingQuestion,
                config: editingQuestion.config as Record<string, unknown>,
              }}
              onSave={(data) =>
                handleUpdateQuestion({
                  questionId: editingQuestion.id,
                  ...data,
                })
              }
              onCancel={() => setEditingQuestion(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete question confirmation */}
      <Dialog open={!!deletingQuestionId} onOpenChange={() => setDeletingQuestionId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบคำถาม</DialogTitle>
            <DialogDescription>ลบคำถามนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingQuestionId(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDeleteQuestion} disabled={saving}>
              {saving ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------
// Sortable question row
// -----------------------------------------------------------------------

function SortableQuestionRow({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: ExerciseQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = QUESTION_TYPE_LABELS[question.type] ?? { label: question.type, color: "bg-gray-100 text-gray-700" };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 py-3">
      <button
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs font-medium text-muted-foreground w-6">{index + 1}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{question.text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className={`text-[10px] ${typeInfo.color}`}>
            {typeInfo.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{question.points} คะแนน</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
        <Pencil className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
