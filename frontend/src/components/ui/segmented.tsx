import { cn } from "@/lib/utils";

// lang: ngôn ngữ của chính nhãn (vd nút "English" trong trang tiếng Việt), để trình đọc màn hình phát âm đúng.
type Option<T extends string> = { value: T; label: string; lang?: string };

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Nhóm nút chọn một: mỗi nút là <button aria-pressed>, dùng được bằng Tab / Enter / Space. */
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 cursor-pointer rounded-sm px-3 text-sm transition-colors",
            o.value === value ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
