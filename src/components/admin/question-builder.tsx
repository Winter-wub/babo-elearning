"use client";

import { useState, useCallback } from "react";
import {
  AlignLeft,
  CheckSquare,
  ChevronDown,
  ToggleLeft,
  Type,
  FileText,
  Sliders,
  ArrowLeftRight,
  TextCursorInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type QuestionTypeKey =
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "DROPDOWN"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "LINEAR_SCALE"
  | "MATCHING"
  | "FILL_IN_BLANK";

const QUESTION_TYPES: { key: QuestionTypeKey; label: string; icon: React.ReactNode }[] = [
  { key: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: <AlignLeft className="h-5 w-5" /> },
  { key: "CHECKBOXES", label: "Checkboxes", icon: <CheckSquare className="h-5 w-5" /> },
  { key: "DROPDOWN", label: "Dropdown", icon: <ChevronDown className="h-5 w-5" /> },
  { key: "TRUE_FALSE", label: "True / False", icon: <ToggleLeft className="h-5 w-5" /> },
  { key: "SHORT_ANSWER", label: "Short Answer", icon: <Type className="h-5 w-5" /> },
  { key: "PARAGRAPH", label: "Paragraph", icon: <FileText className="h-5 w-5" /> },
  { key: "LINEAR_SCALE", label: "Linear Scale", icon: <Sliders className="h-5 w-5" /> },
  { key: "MATCHING", label: "Matching", icon: <ArrowLeftRight className="h-5 w-5" /> },
  { key: "FILL_IN_BLANK", label: "Fill in Blank", icon: <TextCursorInput className="h-5 w-5" /> },
];

interface QuestionBuilderProps {
  initialData?: {
    type: string;
    text: string;
    required: boolean;
    points: number;
    config: Record<string, unknown>;
  };
  onSave: (data: {
    type: string;
    text: string;
    required: boolean;
    points: number;
    config: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
  isSaving?: boolean;
  isEditing?: boolean;
}

// -----------------------------------------------------------------------
// Default configs
// -----------------------------------------------------------------------

function getDefaultConfig(type: QuestionTypeKey): Record<string, unknown> {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
    case "DROPDOWN":
      return {
        options: [
          { id: "a", text: "", isCorrect: false },
          { id: "b", text: "", isCorrect: false },
        ],
        shuffleOptions: false,
      };
    case "TRUE_FALSE":
      return { correctAnswer: true };
    case "SHORT_ANSWER":
      return { correctAnswers: [""], caseSensitive: false, maxLength: 200 };
    case "PARAGRAPH":
      return { maxLength: 2000, correctKeywords: [], manualGrading: true };
    case "LINEAR_SCALE":
      return { min: 1, max: 5, minLabel: "", maxLabel: "", correctValue: null };
    case "MATCHING":
      return {
        pairs: [
          { id: "1", left: "", right: "" },
          { id: "2", left: "", right: "" },
        ],
      };
    case "FILL_IN_BLANK":
      return {
        blanks: [{ id: "1", acceptedAnswers: [""], caseSensitive: false }],
      };
    default:
      return {};
  }
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export function QuestionBuilder({
  initialData,
  onSave,
  onCancel,
  isSaving,
  isEditing,
}: QuestionBuilderProps) {
  const [type, setType] = useState<QuestionTypeKey>(
    (initialData?.type as QuestionTypeKey) ?? "MULTIPLE_CHOICE"
  );
  const [text, setText] = useState(initialData?.text ?? "");
  const [required, setRequired] = useState(initialData?.required ?? true);
  const [points, setPoints] = useState(initialData?.points ?? 1);
  const [config, setConfig] = useState<Record<string, unknown>>(
    initialData?.config ?? getDefaultConfig("MULTIPLE_CHOICE")
  );

  const handleTypeChange = (newType: QuestionTypeKey) => {
    setType(newType);
    setConfig(getDefaultConfig(newType));
  };

  const handleSave = () => {
    onSave({ type, text, required, points, config });
  };

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-4">
      {/* Type selector */}
      {!isEditing && (
        <>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Question Type
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {QUESTION_TYPES.map((qt) => (
              <button
                key={qt.key}
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                  type === qt.key
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                )}
                onClick={() => handleTypeChange(qt.key)}
              >
                {qt.icon}
                <span className="text-[10px] font-semibold">{qt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Question text */}
      <div className="space-y-2">
        <Label>Question Text</Label>
        <Textarea
          placeholder="Enter your question..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[60px]"
        />
        {type === "FILL_IN_BLANK" && (
          <p className="text-xs text-muted-foreground">
            Use ___ (three underscores) to indicate blanks in the question text.
          </p>
        )}
      </div>

      {/* Type-specific config editors */}
      {(type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN") && (
        <ChoiceConfigEditor
          config={config}
          onChange={setConfig}
          isMultiple={type === "CHECKBOXES"}
        />
      )}

      {type === "TRUE_FALSE" && (
        <TrueFalseConfigEditor config={config} onChange={setConfig} />
      )}

      {type === "SHORT_ANSWER" && (
        <ShortAnswerConfigEditor config={config} onChange={setConfig} />
      )}

      {type === "PARAGRAPH" && (
        <ParagraphConfigEditor config={config} onChange={setConfig} />
      )}

      {type === "LINEAR_SCALE" && (
        <LinearScaleConfigEditor config={config} onChange={setConfig} />
      )}

      {type === "MATCHING" && (
        <MatchingConfigEditor config={config} onChange={setConfig} />
      )}

      {type === "FILL_IN_BLANK" && (
        <FillInBlankConfigEditor config={config} onChange={setConfig} />
      )}

      {/* Points & required */}
      <div className="flex items-center gap-6">
        <div className="space-y-1">
          <Label className="text-xs">Points</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={required} onCheckedChange={setRequired} id="q-required" />
          <Label htmlFor="q-required" className="text-xs">Required</Label>
        </div>
        {(type === "MULTIPLE_CHOICE" || type === "CHECKBOXES" || type === "DROPDOWN") && (
          <div className="flex items-center gap-2">
            <Switch
              checked={(config.shuffleOptions as boolean) ?? false}
              onCheckedChange={(checked) =>
                setConfig((c) => ({ ...c, shuffleOptions: checked }))
              }
              id="q-shuffle"
            />
            <Label htmlFor="q-shuffle" className="text-xs">Shuffle options</Label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!text.trim() || isSaving}>
          {isSaving ? "Saving..." : isEditing ? "Update Question" : "Save Question"}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Config editors
// -----------------------------------------------------------------------

function ChoiceConfigEditor({
  config,
  onChange,
  isMultiple,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  isMultiple: boolean;
}) {
  const options = (config.options as { id: string; text: string; isCorrect: boolean }[]) ?? [];

  const updateOption = (index: number, field: string, value: unknown) => {
    const updated = options.map((o, i) => {
      if (i !== index) {
        // For single-select, uncheck others when marking one correct
        if (field === "isCorrect" && value === true && !isMultiple) {
          return { ...o, isCorrect: false };
        }
        return o;
      }
      return { ...o, [field]: value };
    });
    onChange({ ...config, options: updated });
  };

  const addOption = () => {
    const id = crypto.randomUUID().slice(0, 8);
    onChange({ ...config, options: [...options, { id, text: "", isCorrect: false }] });
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    onChange({ ...config, options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Answer Options {isMultiple ? "(select all correct)" : "(click to mark correct)"}
      </Label>
      {options.map((opt, i) => (
        <div
          key={opt.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border p-2",
            opt.isCorrect && "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-950"
          )}
        >
          <button
            type="button"
            className={cn(
              "h-4 w-4 shrink-0 border-2 transition-colors",
              isMultiple ? "rounded" : "rounded-full",
              opt.isCorrect
                ? "border-green-600 bg-green-600"
                : "border-muted-foreground/30"
            )}
            onClick={() => updateOption(i, "isCorrect", !opt.isCorrect)}
            aria-label={`Mark option ${opt.id} as ${opt.isCorrect ? "incorrect" : "correct"}`}
          />
          <Input
            value={opt.text}
            onChange={(e) => updateOption(i, "text", e.target.value)}
            placeholder={`Option ${opt.id.toUpperCase()}`}
            className="flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
          {opt.isCorrect && (
            <span className="text-[10px] font-bold uppercase text-green-700 dark:text-green-400">
              Correct
            </span>
          )}
          {options.length > 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(i)}
            >
              ×
            </Button>
          )}
        </div>
      ))}
      {options.length < 10 && (
        <Button variant="outline" size="sm" onClick={addOption} className="border-dashed">
          + Add Option
        </Button>
      )}
    </div>
  );
}

function TrueFalseConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const correctAnswer = config.correctAnswer as boolean;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Correct Answer</Label>
      <div className="flex gap-2">
        {[true, false].map((val) => (
          <button
            key={String(val)}
            type="button"
            className={cn(
              "flex-1 rounded-lg border p-3 text-center font-medium transition-colors",
              correctAnswer === val
                ? "border-green-400 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-950 dark:text-green-400"
                : "text-muted-foreground hover:border-primary/50"
            )}
            onClick={() => onChange({ ...config, correctAnswer: val })}
          >
            {val ? "True" : "False"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ShortAnswerConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const answers = (config.correctAnswers as string[]) ?? [""];
  const caseSensitive = (config.caseSensitive as boolean) ?? false;

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">
        Accepted Answers (any match = correct)
      </Label>
      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={ans}
            onChange={(e) => {
              const updated = [...answers];
              updated[i] = e.target.value;
              onChange({ ...config, correctAnswers: updated });
            }}
            placeholder={`Answer ${i + 1}`}
          />
          {answers.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onChange({ ...config, correctAnswers: answers.filter((_, j) => j !== i) })}
            >
              ×
            </Button>
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="border-dashed"
        onClick={() => onChange({ ...config, correctAnswers: [...answers, ""] })}
      >
        + Add Alternative
      </Button>
      <div className="flex items-center gap-2">
        <Switch
          checked={caseSensitive}
          onCheckedChange={(checked) => onChange({ ...config, caseSensitive: checked })}
          id="case-sensitive"
        />
        <Label htmlFor="case-sensitive" className="text-xs">Case sensitive</Label>
      </div>
    </div>
  );
}

function ParagraphConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Max Length</Label>
        <Input
          type="number"
          min={100}
          max={5000}
          value={(config.maxLength as number) ?? 2000}
          onChange={(e) => onChange({ ...config, maxLength: Number(e.target.value) })}
          className="w-32"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={(config.manualGrading as boolean) ?? true}
          onCheckedChange={(checked) => onChange({ ...config, manualGrading: checked })}
          id="manual-grading"
        />
        <Label htmlFor="manual-grading" className="text-xs">Manual grading required</Label>
      </div>
    </div>
  );
}

function LinearScaleConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const min = (config.min as number) ?? 1;
  const max = (config.max as number) ?? 5;

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            min={0}
            max={1}
            value={min}
            onChange={(e) => onChange({ ...config, min: Number(e.target.value) })}
            className="w-20"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            min={2}
            max={10}
            value={max}
            onChange={(e) => onChange({ ...config, max: Number(e.target.value) })}
            className="w-20"
          />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Min Label</Label>
          <Input
            value={(config.minLabel as string) ?? ""}
            onChange={(e) => onChange({ ...config, minLabel: e.target.value })}
            placeholder="e.g., Strongly Disagree"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Max Label</Label>
          <Input
            value={(config.maxLabel as string) ?? ""}
            onChange={(e) => onChange({ ...config, maxLabel: e.target.value })}
            placeholder="e.g., Strongly Agree"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          Correct Value (leave empty for survey-style / no score)
        </Label>
        <Input
          type="number"
          min={min}
          max={max}
          value={(config.correctValue as number) ?? ""}
          onChange={(e) =>
            onChange({
              ...config,
              correctValue: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="w-20"
          placeholder="—"
        />
      </div>
    </div>
  );
}

function MatchingConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const pairs = (config.pairs as { id: string; left: string; right: string }[]) ?? [];

  const updatePair = (index: number, field: "left" | "right", value: string) => {
    const updated = pairs.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    onChange({ ...config, pairs: updated });
  };

  const addPair = () => {
    const id = crypto.randomUUID().slice(0, 8);
    onChange({ ...config, pairs: [...pairs, { id, left: "", right: "" }] });
  };

  const removePair = (index: number) => {
    if (pairs.length <= 2) return;
    onChange({ ...config, pairs: pairs.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Matching Pairs (left → right)
      </Label>
      {pairs.map((pair, i) => (
        <div key={pair.id} className="flex items-center gap-2">
          <Input
            value={pair.left}
            onChange={(e) => updatePair(i, "left", e.target.value)}
            placeholder="Left item"
            className="flex-1"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            value={pair.right}
            onChange={(e) => updatePair(i, "right", e.target.value)}
            placeholder="Right item"
            className="flex-1"
          />
          {pairs.length > 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removePair(i)}
            >
              ×
            </Button>
          )}
        </div>
      ))}
      {pairs.length < 10 && (
        <Button variant="outline" size="sm" onClick={addPair} className="border-dashed">
          + Add Pair
        </Button>
      )}
    </div>
  );
}

function FillInBlankConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const blanks = (config.blanks as { id: string; acceptedAnswers: string[]; caseSensitive: boolean }[]) ?? [];

  const updateBlank = (index: number, answers: string[]) => {
    const updated = blanks.map((b, i) => (i === index ? { ...b, acceptedAnswers: answers } : b));
    onChange({ ...config, blanks: updated });
  };

  const addBlank = () => {
    const id = crypto.randomUUID().slice(0, 8);
    onChange({ ...config, blanks: [...blanks, { id, acceptedAnswers: [""], caseSensitive: false }] });
  };

  const removeBlank = (index: number) => {
    if (blanks.length <= 1) return;
    onChange({ ...config, blanks: blanks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">
        Blanks (each ___ in the question text)
      </Label>
      {blanks.map((blank, i) => (
        <div key={blank.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Blank {i + 1}</span>
            {blanks.length > 1 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlank(i)}>
                ×
              </Button>
            )}
          </div>
          {blank.acceptedAnswers.map((ans, j) => (
            <div key={j} className="flex items-center gap-2">
              <Input
                value={ans}
                onChange={(e) => {
                  const updated = [...blank.acceptedAnswers];
                  updated[j] = e.target.value;
                  updateBlank(i, updated);
                }}
                placeholder={`Accepted answer ${j + 1}`}
                className="flex-1"
              />
              {blank.acceptedAnswers.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => updateBlank(i, blank.acceptedAnswers.filter((_, k) => k !== j))}
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="border-dashed text-xs"
            onClick={() => updateBlank(i, [...blank.acceptedAnswers, ""])}
          >
            + Alternative
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addBlank} className="border-dashed">
        + Add Blank
      </Button>
    </div>
  );
}
