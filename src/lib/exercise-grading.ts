import type {
  ChoiceConfig,
  TrueFalseConfig,
  ShortAnswerConfig,
  FillInBlankConfig,
  MatchingConfig,
  LinearScaleConfig,
} from "@/types/exercise";

export function stripCorrectAnswers(
  type: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "CHECKBOXES":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      return {
        options: c.options.map((o) => ({ id: o.id, text: o.text })),
        shuffleOptions: c.shuffleOptions,
      };
    }
    case "TRUE_FALSE":
      return {};
    case "SHORT_ANSWER":
      return { maxLength: (config as unknown as ShortAnswerConfig).maxLength };
    case "PARAGRAPH":
      return { maxLength: (config as unknown as { maxLength: number }).maxLength };
    case "LINEAR_SCALE": {
      const c = config as unknown as LinearScaleConfig;
      return { min: c.min, max: c.max, minLabel: c.minLabel, maxLabel: c.maxLabel };
    }
    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      const rights = c.pairs.map((p) => p.right);
      for (let i = rights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rights[i], rights[j]] = [rights[j], rights[i]];
      }
      return {
        leftItems: c.pairs.map((p) => ({ id: p.id, text: p.left })),
        rightItems: rights,
      };
    }
    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      return { blanks: c.blanks.map((b) => ({ id: b.id })) };
    }
    default:
      return {};
  }
}

export function gradeAnswer(
  type: string,
  config: Record<string, unknown>,
  answer: unknown,
  maxPoints: number
): { correct: boolean | null; points: number } {
  if (answer === undefined || answer === null || answer === "") {
    return { correct: false, points: 0 };
  }

  switch (type) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      const correctOption = c.options.find((o) => o.isCorrect);
      const isCorrect = correctOption?.id === answer;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "CHECKBOXES": {
      const c = config as unknown as ChoiceConfig;
      const correctIds = new Set(c.options.filter((o) => o.isCorrect).map((o) => o.id));
      const selectedIds = new Set(answer as string[]);
      const isCorrect =
        correctIds.size === selectedIds.size &&
        [...correctIds].every((id) => selectedIds.has(id));
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "TRUE_FALSE": {
      const c = config as unknown as TrueFalseConfig;
      const isCorrect = c.correctAnswer === answer;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "SHORT_ANSWER": {
      const c = config as unknown as ShortAnswerConfig;
      const studentStr = String(answer);
      const isCorrect = c.correctAnswers.some((a) =>
        c.caseSensitive ? a === studentStr : a.toLowerCase() === studentStr.toLowerCase()
      );
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      const studentAnswers = answer as Record<string, string>;
      let allCorrect = true;

      for (const blank of c.blanks) {
        const studentStr = studentAnswers[blank.id] ?? "";
        const matches = blank.acceptedAnswers.some((a) =>
          blank.caseSensitive ? a === studentStr : a.toLowerCase() === studentStr.toLowerCase()
        );
        if (!matches) allCorrect = false;
      }

      return { correct: allCorrect, points: allCorrect ? maxPoints : 0 };
    }

    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      const studentPairs = answer as Record<string, string>;
      let allCorrect = true;

      for (const pair of c.pairs) {
        if (studentPairs[pair.id] !== pair.right) {
          allCorrect = false;
          break;
        }
      }

      return { correct: allCorrect, points: allCorrect ? maxPoints : 0 };
    }

    case "LINEAR_SCALE": {
      const c = config as unknown as LinearScaleConfig;
      if (c.correctValue === null) {
        return { correct: null, points: 0 };
      }
      const isCorrect = Number(answer) === c.correctValue;
      return { correct: isCorrect, points: isCorrect ? maxPoints : 0 };
    }

    case "PARAGRAPH": {
      return { correct: null, points: 0 };
    }

    default:
      return { correct: null, points: 0 };
  }
}

export function getCorrectAnswer(type: string, config: Record<string, unknown>): unknown {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN": {
      const c = config as unknown as ChoiceConfig;
      const correct = c.options.find((o) => o.isCorrect);
      return correct?.text ?? null;
    }
    case "CHECKBOXES": {
      const c = config as unknown as ChoiceConfig;
      return c.options.filter((o) => o.isCorrect).map((o) => o.text);
    }
    case "TRUE_FALSE":
      return (config as unknown as TrueFalseConfig).correctAnswer;
    case "SHORT_ANSWER":
      return (config as unknown as ShortAnswerConfig).correctAnswers;
    case "FILL_IN_BLANK": {
      const c = config as unknown as FillInBlankConfig;
      return c.blanks.map((b) => b.acceptedAnswers[0]);
    }
    case "MATCHING": {
      const c = config as unknown as MatchingConfig;
      return Object.fromEntries(c.pairs.map((p) => [p.left, p.right]));
    }
    case "LINEAR_SCALE":
      return (config as unknown as LinearScaleConfig).correctValue;
    case "PARAGRAPH":
      return null;
    default:
      return null;
  }
}
