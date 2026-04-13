import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "@/server/actions/products";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-sm text-neutral-500">
        <Link href="/admin/products" className="underline-offset-4 hover:underline">
          PRP 品項管理
        </Link>
        <span className="mx-2">/</span>
        <span>新增品項</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增 PRP 品項</CardTitle>
          <CardDescription>建立新的 PRP 品項後即可在治療紀錄中選用</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm action={createProduct} submitLabel="建立品項" />
        </CardContent>
      </Card>
    </div>
  );
}
