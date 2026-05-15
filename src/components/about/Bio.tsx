import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface BioContent {
  heading: string;
  paragraphs: string[];
  badges: string[];
}

/**
 * Instructor bio section. Each paragraph and badge filters individually.
 * Section omitted when heading + all paragraphs are empty after trim.
 */
export function Bio({ heading, paragraphs, badges }: BioContent) {
  const h = heading.trim();
  const visibleParagraphs = paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const visibleBadges = badges.map((b) => b.trim()).filter((b) => b.length > 0);

  if (!h && visibleParagraphs.length === 0) {
    return null;
  }

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {h && (
          <h2 className="mb-8 text-2xl font-semibold text-foreground">{h}</h2>
        )}
        <Card className="border-l-4 border-l-primary rounded-r-lg">
          <CardContent className="p-8">
            {visibleParagraphs.map((p, idx) => (
              <p
                key={idx}
                className={
                  idx < visibleParagraphs.length - 1
                    ? "leading-relaxed text-muted-foreground mb-5"
                    : "leading-relaxed text-muted-foreground"
                }
              >
                {p}
              </p>
            ))}
            {visibleBadges.length > 0 && (
              <ul
                role="list"
                className="mt-8 flex flex-wrap gap-3 list-none p-0"
              >
                {visibleBadges.map((b, idx) => (
                  <li key={idx}>
                    <Badge variant="outline" className="rounded-full">
                      {b}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
