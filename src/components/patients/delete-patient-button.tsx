"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { softDeletePatient } from "@/server/actions/patients";

interface DeletePatientButtonProps {
  id: string;
  name: string;
}

export function DeletePatientButton({ id, name }: DeletePatientButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm(`確定要刪除病人「${name}」嗎？\n\n（資料會保留在資料庫中，符合病歷保存規定，但不再出現於清單中。）`)) {
          return;
        }
        startTransition(async () => {
          await softDeletePatient(id);
        });
      }}
    >
      {pending ? "刪除中…" : "刪除"}
    </Button>
  );
}
