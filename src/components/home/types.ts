export type PublicVideo = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  playCount: number;
  isFeatured: boolean;
};
