export type ThemeMode = "light" | "dark" | "system";
export type Theme = "light" | "dark";

// Khoá này cũng nằm trong script inline của index.html (chạy trước lần vẽ đầu để không nháy sai màu).
export const THEME_KEY = "flashcard.theme";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStore(): Store | undefined {
  try {
    return localStorage;
  } catch {
    return undefined; // truy cập storage cũng có thể ném lỗi
  }
}

export function readMode(store: Pick<Store, "getItem"> | undefined = defaultStore()): ThemeMode {
  try {
    const v = store?.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function systemPrefersDark(matchMedia: typeof window.matchMedia | undefined = window.matchMedia?.bind(window)): boolean {
  return matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): Theme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

type ApplyOptions = { root?: HTMLElement; store?: Store; prefersDark?: boolean };

/** Đặt data-theme và lưu lựa chọn. "Hệ thống" xoá khoá để lần sau theo hệ điều hành. */
export function applyMode(mode: ThemeMode, opts: ApplyOptions = {}): void {
  const root = opts.root ?? document.documentElement;
  const store = "store" in opts ? opts.store : defaultStore();
  root.setAttribute("data-theme", resolveTheme(mode, opts.prefersDark ?? systemPrefersDark()));
  try {
    if (mode === "system") store?.removeItem(THEME_KEY);
    else store?.setItem(THEME_KEY, mode);
  } catch {
    /* storage bị chặn: giao diện vẫn đổi, chỉ không nhớ được */
  }
}

type WatchOptions = { root?: HTMLElement; store?: Store; matchMedia?: typeof window.matchMedia };

/** Khi đang ở chế độ "Hệ thống", đổi theo hệ điều hành ngay lúc nó đổi. Trả về hàm huỷ. */
export function subscribeSystemTheme(opts: WatchOptions = {}): () => void {
  const root = opts.root ?? document.documentElement;
  const store = opts.store ?? defaultStore();
  const mql = (opts.matchMedia ?? window.matchMedia?.bind(window))?.("(prefers-color-scheme: dark)");
  if (!mql) return () => {};
  const onChange = (e: { matches: boolean }) => {
    if (readMode(store) === "system") root.setAttribute("data-theme", resolveTheme("system", e.matches));
  };
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
