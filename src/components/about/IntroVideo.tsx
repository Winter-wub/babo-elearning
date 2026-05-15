export interface IntroVideoContent {
  title: string;
  subtitle: string;
  url: string;
  poster: string;
}

/**
 * Intro video section — entire section omitted when url is empty after trim.
 */
export function IntroVideo({ title, subtitle, url, poster }: IntroVideoContent) {
  const videoUrl = url.trim();
  if (!videoUrl) return null;

  const t = title.trim();
  const s = subtitle.trim();
  const p = poster.trim();

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-4xl px-4 text-center">
        {t && (
          <h2 className="text-2xl font-semibold text-foreground">{t}</h2>
        )}
        {s && (
          <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">{s}</p>
        )}
        <div className="mt-10 aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
          <video
            controls
            preload="metadata"
            playsInline
            controlsList="nodownload"
            poster={p || undefined}
            className="h-full w-full"
          >
            <source src={videoUrl} type="video/mp4" />
            เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
          </video>
        </div>
      </div>
    </section>
  );
}
