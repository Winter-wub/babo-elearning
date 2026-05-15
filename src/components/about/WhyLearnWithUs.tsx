import {
  BookOpen,
  Layers,
  ClipboardCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface HighlightItem {
  title: string;
  desc: string;
}

export interface WhyLearnWithUsContent {
  heading: string;
  subheading: string;
  items: HighlightItem[];
}

const ICONS: LucideIcon[] = [BookOpen, Layers, ClipboardCheck, BarChart3];

/**
 * 2x2 feature grid. Each card needs both title and desc (after trim).
 * Section omitted when no cards survive the filter.
 */
export function WhyLearnWithUs({
  heading,
  subheading,
  items,
}: WhyLearnWithUsContent) {
  const visible = items
    .map((item, originalIdx) => ({
      title: item.title.trim(),
      desc: item.desc.trim(),
      originalIdx,
    }))
    .filter((item) => item.title.length > 0 && item.desc.length > 0);

  if (visible.length === 0) return null;

  const h = heading.trim();
  const s = subheading.trim();

  return (
    <section className="bg-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {(h || s) && (
          <div className="text-center">
            {h && (
              <h2 className="text-2xl font-semibold text-foreground">{h}</h2>
            )}
            {s && (
              <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
                {s}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {visible.map((item) => {
            const Icon = ICONS[item.originalIdx % ICONS.length];
            return (
              <Card
                key={item.originalIdx}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="flex gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon
                      className="h-6 w-6 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
