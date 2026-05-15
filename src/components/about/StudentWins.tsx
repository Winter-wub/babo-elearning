import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface StudentWin {
  name: string;
  achievement: string;
  quote: string;
  photo: string;
}

export interface StudentWinsContent {
  heading: string;
  subheading: string;
  students: StudentWin[];
}

/**
 * Student testimonial grid. Each card requires non-empty name (after trim).
 * Entire section omitted when no students survive the filter.
 */
export function StudentWins({
  heading,
  subheading,
  students,
}: StudentWinsContent) {
  const visible = students
    .map((s) => ({
      name: s.name.trim(),
      achievement: s.achievement.trim(),
      quote: s.quote.trim(),
      photo: s.photo.trim(),
    }))
    .filter((s) => s.name.length > 0);

  if (visible.length === 0) return null;

  const h = heading.trim();
  const sh = subheading.trim();

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(h || sh) && (
          <div className="text-center">
            {h && (
              <h2 className="text-2xl font-semibold text-foreground">{h}</h2>
            )}
            {sh && (
              <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
                {sh}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((student, idx) => (
            <Card key={idx} className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <Avatar
                  src={student.photo || null}
                  alt={`ภาพนักเรียน ${student.name}`}
                  fallback={student.name}
                  className="mx-auto h-20 w-20 ring-2 ring-border"
                />
                <p className="mt-3 font-semibold text-foreground">
                  {student.name}
                </p>
                {student.achievement && (
                  <div className="mt-2">
                    <Badge className="rounded-full">
                      {student.achievement}
                    </Badge>
                  </div>
                )}
                {student.quote && (
                  <p className="mt-3 text-sm italic leading-relaxed text-muted-foreground">
                    “{student.quote}”
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
