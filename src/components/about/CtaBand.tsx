import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface CtaBandContent {
  title: string;
  subtitle: string;
}

/**
 * Final call-to-action band. Section omitted when title is empty.
 * Links are hardcoded to /courses (primary) and /contact (outline).
 */
export function CtaBand({ title, subtitle }: CtaBandContent) {
  const t = title.trim();
  if (!t) return null;

  const s = subtitle.trim();

  return (
    <section className="bg-primary/10 py-16 text-center">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
          {t}
        </h2>
        {s && (
          <p className="mt-4 text-lg text-muted-foreground">{s}</p>
        )}
        <div className="mt-10 flex flex-col gap-4 justify-center items-center sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/courses">ดูคอร์สทั้งหมด</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/contact">ติดต่อเรา</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
