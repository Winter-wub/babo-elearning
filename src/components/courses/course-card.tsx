import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PriceDisplay } from "@/components/shared/price-display";
import type { Product, Playlist } from "@prisma/client";

type CourseProduct = Product & {
  playlist: Pick<Playlist, "id" | "title" | "slug" | "thumbnailUrl" | "isActive"> & {
    _count: { videos: number };
  };
};

interface CourseCardProps {
  product: CourseProduct;
}

export function CourseCard({ product }: CourseCardProps) {
  const { playlist } = product;

  return (
    <Link
      href={`/playlists/${playlist.slug}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-md">
        {playlist.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-muted"
            aria-hidden="true"
          />
        )}
        <div className="absolute bottom-2 left-2">
          <Badge variant="secondary" className="text-xs shadow">
            {playlist._count.videos} วิดีโอ
          </Badge>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
          {playlist.title}
        </p>
        <PriceDisplay
          priceSatang={product.priceSatang}
          salePriceSatang={product.salePriceSatang}
        />
      </div>
    </Link>
  );
}
