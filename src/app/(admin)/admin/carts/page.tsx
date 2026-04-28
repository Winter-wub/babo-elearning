import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AdminCartsTable } from "@/components/admin/carts/admin-carts-table";
import { getAdminCarts } from "@/actions/cart.actions";

export const metadata: Metadata = {
  title: "ตะกร้าสินค้า",
};

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function CartsContent({ searchParams }: Props) {
  const params = await searchParams;
  const result = await getAdminCarts({
    page: params.page ? Number(params.page) : 1,
    search: params.search || undefined,
  });

  if (!result.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </div>
    );
  }

  return (
    <AdminCartsTable
      carts={result.data.items}
      meta={result.data.meta}
      initialSearch={params.search}
    />
  );
}

export default function AdminCartsPage(props: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ตะกร้าสินค้า</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ดูตะกร้าสินค้าของนักเรียน
        </p>
      </div>
      <Suspense fallback={<Spinner size="lg" />}>
        <CartsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
