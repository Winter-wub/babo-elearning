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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  createExercise,
  updateExercise,
  deleteExercise,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from "@/actions/exercise.actions";
import { QuestionBuilder } from "@/components/admin/question-builder";
import type { ExerciseWithQuestions } from "@/types/exercise";
import type { ExerciseType, ExerciseQuestion } from "@prisma/client";

// -----------------------------------------------------------------------
// Question type labels
// -----------------------------------------------------------------------

const QUESTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  MULTIPLE_CHOICE: { label: "Multiple Choice", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  CHECKBOXES: { label: "Checkboxes", color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  DROPDOWN: { label: "Dropdown", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  TRUE_FALSE: { label: "True / False", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  SHORT_ANSWER: { label: "Short Answer", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  PARAGRAPH: { label: "Paragraph", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  LINEAR_SCALE: { label: "Linear Scale", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  MATCHING: { label: "Matching", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  FILL_IN_BLANK: { label: "Fill in Blank", color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
};

function getQuestionMeta(q: ExerciseQuestion): string {
  const config = q.config as Record<string, unknown>;
  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
    case "DROPDOWN": {
      const options = config.options as unknown[];
      return `${options?.length ?? 0} options · ${q.points} pt`;
    }
    case "TRUE_FALSE":
      return `${q.points} pt`;
    case "FILL_IN_BLANK": {
      const blanks = config.blanks as unknown[];
      return `${blanks?.length ?? 0} blank${(blanks?.length ?? 0) !== 1 ? "s" : ""} · ${q.points} pt`;
    }
    case "MATCHING": {
      const pairs = config.pairs as unknown[];
      return `${pairs?.length ?? 0} pairs · ${q.points} pt`;
    }
    case "LINEAR_SCALE": {
      const min = config.min as number;
      const max = config.max as number;
      const correctValue = config.correctValue;
      return `${min}–${max}${correctValue === null ? " · No score" : ` · ${q.points} pt`}`;
    }
    default:
      return `${q.points} pt`;
  }
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
  onEdit: (q: ExerciseQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = QUESTION_TYPE_LABELS[question.type] ?? { label: question.type, color: "" };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
    >
      <button
        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {index + 1}. {question.text}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {getQuestionMeta(question)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(question)}
          aria-label="Edit question"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(question.id)}
          aria-label="Delete question"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Exercise section (one per type)
// -----------------------------------------------------------------------

function ExerciseSection({
  videoId,
  type,
  label,
  exercise,
  onExercisesChange,
}: {
  videoId: string;
  type: ExerciseType;
  label: string;
  exercise: ExerciseWithQuestions | null;
  onExercisesChange: (fn: (prev: ExerciseWithQuestions[]) => ExerciseWithQuestions[]) => void;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExerciseQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(exercise?.title ?? "");
  const [passingScoreValue, setPassingScoreValue] = useState(exercise?.passingScore ?? 80);
  const [maxAttemptsValue, setMaxAttemptsValue] = useState<number | null>(exercise?.maxAttempts ?? null);

  const isEnabled = exercise?.isActive ?? false;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle: creates exercise if none, otherwise toggles isActive
  const handleToggle = useCallback(async (checked: boolean) => {
    setIsToggling(true);

    if (!exercise && checked) {
      // Auto-create exercise when toggling on for the first time
      const result = await createExercise({
        videoId,
        type,
        title: label,
        passingScore: 80,
      });
      if (result.success) {
        onExercisesChange((prev) => [...prev, result.data]);
        setExpanded(true);
        setTitleValue(result.data.title);
        setPassingScoreValue(result.data.passingScore);
      }
    } else if (exercise) {
      const result = await updateExercise({
        exerciseId: exercise.id,
        isActive: checked,
      });
      if (result.success) {
        onExercisesChange((prev) => prev.map((e) => (e.id === result.data.id ? result.data : e)));
        if (checked) setExpanded(true);
      }
    }

    setIsToggling(false);
  }, [exercise, videoId, type, label, onExercisesChange]);

  // Save title / passing score
  const handleSaveSettings = useCallback(async () => {
    if (!exercise) return;
    setIsBusy(true);
    const result = await updateExercise({
      exerciseId: exercise.id,
      title: titleValue,
      passingScore: passingScoreValue,
      maxAttempts: maxAttemptsValue,
    });
    setIsBusy(false);
    if (result.success) {
      onExercisesChange((prev) => prev.map((e) => (e.id === result.data.id ? result.data : e)));
      setEditTitle(false);
    }
  }, [exercise, titleValue, passingScoreValue, maxAttemptsValue, onExercisesChange]);

  // Add question
  const handleAddQuestion = useCallback(
    async (data: { type: string; text: string; required: boolean; points: number; config: Record<string, unknown> }) => {
      if (!exercise) return;
      setIsBusy(true);
      const result = await addQuestion({ exerciseId: exercise.id, ...data });
      setIsBusy(false);
      if (result.success) {
        onExercisesChange((prev) => prev.map((e) => (e.id === result.data.id ? result.data : e)));
        setShowAddQuestion(false);
      }
    },
    [exercise, onExercisesChange]
  );

  // Update question
  const handleUpdateQuestion = useCallback(
    async (data: { type: string; text: string; required: boolean; points: number; config: Record<string, unknown> }) => {
      if (!editingQuestion) return;
      setIsBusy(true);
      const result = await updateQuestion({
        questionId: editingQuestion.id,
        text: data.text,
        required: data.required,
        points: data.points,
        config: data.config,
      });
      setIsBusy(false);
      if (result.success) {
        onExercisesChange((prev) => prev.map((e) => (e.id === result.data.id ? result.data : e)));
        setEditingQuestion(null);
      }
    },
    [editingQuestion, onExercisesChange]
  );

  // Delete question
  const handleDeleteQuestion = useCallback(async () => {
    if (!deleteId) return;
    setIsBusy(true);
    const result = await deleteQuestion(deleteId);
    setIsBusy(false);
    if (result.success) {
      onExercisesChange((prev) => prev.map((e) => (e.id === result.data.id ? result.data : e)));
      setDeleteId(null);
    }
  }, [deleteId, onExercisesChange]);

  // Delete exercise
  const handleDeleteExercise = useCallback(async () => {
    if (!deleteExerciseId) return;
    setIsBusy(true);
    const result = await deleteExercise(deleteExerciseId);
    setIsBusy(false);
    if (result.success) {
      onExercisesChange((prev) => prev.filter((e) => e.id !== deleteExerciseId));
      setDeleteExerciseId(null);
      setExpanded(false);
    }
  }, [deleteExerciseId, onExercisesChange]);

  // Reorder
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!exercise) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const questions = exercise.questions;
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      const reordered = arrayMove(questions, oldIndex, newIndex);

      onExercisesChange((prev) =>
        prev.map((e) =>
          e.id === exercise.id ? { ...e, questions: reordered } : e
        )
      );

      await reorderQuestions({
        exerciseId: exercise.id,
        questionIds: reordered.map((q) => q.id),
      });
    },
    [exercise, onExercisesChange]
  );

  return (
    <div className="rounded-lg border">
      {/* Toggle header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {exercise && (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{exercise?.title ?? label}</span>
              {exercise && (
                <span className="text-xs text-muted-foreground">
                  {exercise.questions.length} questions · {exercise.passingScore}% to pass{exercise.maxAttempts ? ` · ${exercise.maxAttempts} attempts` : " · unlimited"}
                </span>
              )}
            </div>
            {!exercise && (
              <p className="text-xs text-muted-foreground">
                Toggle to enable {label.toLowerCase()}
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          aria-label={`Enable ${label}`}
        />
      </div>

      {/* Expanded content */}
      {exercise && expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Settings row */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Title</Label>
              <Input
                value={titleValue}
                onChange={(e) => { setTitleValue(e.target.value); setEditTitle(true); }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 w-28">
              <Label className="text-xs">Passing Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScoreValue}
                onChange={(e) => { setPassingScoreValue(Number(e.target.value)); setEditTitle(true); }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1 w-28">
              <Label className="text-xs">Max Attempts</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={maxAttemptsValue ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setMaxAttemptsValue(v === 0 ? null : v);
                  setEditTitle(true);
                }}
                placeholder="Unlimited"
                className="h-8 text-sm"
              />
            </div>
            {editTitle && (
              <Button size="sm" className="h-8" onClick={handleSaveSettings} disabled={isBusy || !titleValue}>
                Save
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => setDeleteExerciseId(exercise.id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>

          {/* Question list */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={exercise.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {exercise.questions.map((q, i) => (
                  <SortableQuestionRow
                    key={q.id}
                    question={q}
                    index={i}
                    onEdit={setEditingQuestion}
                    onDelete={setDeleteId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add question */}
          {showAddQuestion ? (
            <QuestionBuilder
              onSave={handleAddQuestion}
              onCancel={() => setShowAddQuestion(false)}
              isSaving={isBusy}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddQuestion(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          )}

          {/* Edit question dialog */}
          {editingQuestion && (
            <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Question</DialogTitle>
                </DialogHeader>
                <QuestionBuilder
                  initialData={{
                    type: editingQuestion.type,
                    text: editingQuestion.text,
                    required: editingQuestion.required,
                    points: editingQuestion.points,
                    config: editingQuestion.config as Record<string, unknown>,
                  }}
                  onSave={handleUpdateQuestion}
                  onCancel={() => setEditingQuestion(null)}
                  isSaving={isBusy}
                  isEditing
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Delete question confirmation */}
          <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Question</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this question? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteQuestion} disabled={isBusy}>
                  {isBusy ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete exercise confirmation */}
          <Dialog open={!!deleteExerciseId} onOpenChange={(open) => !open && setDeleteExerciseId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Exercise</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this exercise? All questions and student attempts will be permanently removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDeleteExerciseId(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteExercise} disabled={isBusy}>
                  {isBusy ? "Deleting..." : "Delete Exercise"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

interface VideoExercisesManagerProps {
  videoId: string;
  initialExercises: ExerciseWithQuestions[];
}

export function VideoExercisesManager({
  videoId,
  initialExercises,
}: VideoExercisesManagerProps) {
  const [exercises, setExercises] = useState(initialExercises);

  const preTest = exercises.find((e) => e.type === "PRE_TEST") ?? null;
  const postTest = exercises.find((e) => e.type === "POST_TEST") ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exercises</CardTitle>
        <CardDescription>
          Toggle pre-test and post-test for this video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ExerciseSection
          videoId={videoId}
          type="PRE_TEST"
          label="Pre-test"
          exercise={preTest}
          onExercisesChange={setExercises}
        />
        <ExerciseSection
          videoId={videoId}
          type="POST_TEST"
          label="Post-test"
          exercise={postTest}
          onExercisesChange={setExercises}
        />
      </CardContent>
    </Card>
  );
}
