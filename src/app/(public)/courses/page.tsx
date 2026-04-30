import type { Metadata } from "next";
import { getPublicProducts } from "@/actions/product.actions";
import { CourseCard } from "@/components/courses/course-card";

export const metadata: Metadata = {
  title: "คอร์สเรียน",
  description: "เลือกคอร์สเรียนภาษาอังกฤษที่เหมาะกับคุณ",
};

export default async function CoursesPage() {
  const result = await getPublicProducts();
  const products = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          คอร์สเรียน
        </h1>
        <p className="mt-2 text-muted-foreground">
          เลือกคอร์สที่เหมาะกับคุณ เริ่มเรียนได้ทันทีหลังชำระเงิน
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          ยังไม่มีคอร์สเรียนในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <CourseCard
              key={product.id}
              product={product}
              hasDemo={product.playlist.hasDemo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
