import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Chuỗi class viết đầy đủ: Tailwind chỉ sinh CSS cho tên nó thấy nguyên văn trong source.
const DOT = ["bg-level-1", "bg-level-2", "bg-level-3", "bg-level-4", "bg-level-5"] as const;

/** Cấp độ 1–5. Màu chỉ là phần phụ: luôn kèm nhãn "Cấp N" để không ai phải phân biệt bằng màu. */
export function LevelBadge({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span aria-hidden="true" className={cn("size-2.5 rounded-full", DOT[level - 1])} />
      {t("level.label", { n: level })}
    </span>
  );
}
