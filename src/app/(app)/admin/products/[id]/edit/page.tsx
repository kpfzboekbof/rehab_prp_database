import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { ToggleActiveButton } from "@/components/products/toggle-active-button";
import { updateProduct } from "@/server/actions/products";
import { getProduct } from "@/server/queries/products";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const action = updateProduct.bind(null, product.id);
  const usageCount = product._count.treatments;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/admin/products" className="underline-offset-4 hover:underline">
          PRP 品項管理
        </Link>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯品項</CardTitle>
          <CardDescription>
            修改「{product.name}」
            {usageCount > 0 && ` · 已用於 ${usageCount} 筆治療紀錄`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            action={action}
            submitLabel="儲存變更"
            defaults={{
              name: product.name,
              unitPrice: product.unitPrice,
              notes: product.notes ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>啟用狀態</CardTitle>
          <CardDescription>
            {product.active
              ? "此品項目前啟用中，可在治療紀錄中選用。"
              : "此品項目前已停用，新建治療紀錄時不會顯示在下拉選單。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-neutral-600">
              {product.active ? "目前狀態：" : "目前狀態："}
              {product.active ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  啟用中
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-400/30">
                  已停用
                </span>
              )}
            </div>
            <ToggleActiveButton
              id={product.id}
              active={product.active}
              usageCount={usageCount}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
