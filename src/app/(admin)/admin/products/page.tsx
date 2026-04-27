import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ProductsTable } from "@/components/admin/products-table";
import { getProducts } from "@/actions/product.actions";

export const metadata: Metadata = {
  title: "จัดการสินค้า",
};

interface Props {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}

async function ProductsContent({ searchParams }: Props) {
  const params = await searchParams;

  const result = await getProducts({
    search: params.search,
    page: params.page ? Number(params.page) : 1,
  });

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return <ProductsTable products={result.data.items} meta={result.data.meta} />;
}

export default function AdminProductsPage(props: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">จัดการสินค้า</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          กำหนดราคาสำหรับเพลย์ลิสต์เพื่อเปิดขาย
        </p>
      </div>

      <Suspense fallback={<Spinner size="lg" />}>
        <ProductsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
