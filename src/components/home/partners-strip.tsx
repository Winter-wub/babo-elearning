interface Partner {
  name: string;
  logoSrc: string;
}

// Static partner list — real SVG logos dropped into /public/images/partners/ by content team.
// Until then, placeholder divs preserve the layout with no broken-image states.
const PARTNERS: Partner[] = [
  { name: "Partner A", logoSrc: "/images/partners/partner-a.svg" },
  { name: "Partner B", logoSrc: "/images/partners/partner-b.svg" },
  { name: "Partner C", logoSrc: "/images/partners/partner-c.svg" },
  { name: "Partner D", logoSrc: "/images/partners/partner-d.svg" },
  { name: "Partner E", logoSrc: "/images/partners/partner-e.svg" },
  { name: "Partner F", logoSrc: "/images/partners/partner-f.svg" },
];

export function PartnersStrip() {
  return (
    <section className="border-t border-border py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading — small, uppercase, muted to not compete with primary content */}
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Trusted Partners
        </p>

        <div className="flex flex-wrap items-center justify-center gap-8">
          {PARTNERS.map((partner) => (
            // Placeholder div styled to the target logo dimensions.
            // Replace with <img src={partner.logoSrc} alt={partner.name} ... />
            // once the content team provides the actual SVG files.
            <div
              key={partner.name}
              className="flex h-8 w-24 items-center justify-center rounded bg-muted text-xs text-muted-foreground"
              aria-label={partner.name}
            >
              {partner.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
