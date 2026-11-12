// Mọi chuỗi hiển thị nằm ở đây, song ngữ trong cùng một mục: thêm một chuỗi là thêm đúng một dòng.
// Nội suy dùng MỘT ngoặc: {n}, không phải {{n}} (xem config.ts).
export type Entry = { vi: string; en: string };

export const strings = {
  "app.name": { vi: "Flashcard tiếng Anh", en: "English flashcards" },

  "nav.label": { vi: "Điều hướng chính", en: "Main navigation" },
  "nav.review": { vi: "Ôn tập", en: "Review" },
  "nav.notebook": { vi: "Sổ tay", en: "Notebook" },
  "nav.add": { vi: "Thêm", en: "Add" },
  "nav.settings": { vi: "Cài đặt", en: "Settings" },
  "skip.toMain": { vi: "Bỏ qua điều hướng", en: "Skip navigation" },

  "placeholder.body": { vi: "Màn hình này sẽ được làm ở ticket sau.", en: "This screen is built in a later ticket." },

  "notFound.title": { vi: "Không tìm thấy trang", en: "Page not found" },
  "notFound.back": { vi: "Về trang chủ", en: "Back to home" },

  "login.title": { vi: "Đăng nhập", en: "Sign in" },
  "study.title": { vi: "Phiên học", en: "Study session" },
  "study.exit": { vi: "Thoát", en: "Exit" },

  "settings.appearance": { vi: "Giao diện", en: "Appearance" },
  "settings.language": { vi: "Ngôn ngữ", en: "Language" },
  "theme.light": { vi: "Sáng", en: "Light" },
  "theme.dark": { vi: "Tối", en: "Dark" },
  "theme.system": { vi: "Hệ thống", en: "System" },
  "lang.vi": { vi: "Tiếng Việt", en: "Tiếng Việt" },
  "lang.en": { vi: "English", en: "English" },

  "items.count": { vi: "{n} mục", en: "{n} items" },
  "level.label": { vi: "Cấp {n}", en: "Level {n}" },
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof strings;

function pick(lang: keyof Entry): Record<string, string> {
  return Object.fromEntries(Object.entries(strings).map(([k, v]) => [k, v[lang]]));
}

export const vi = pick("vi");
export const en = pick("en");
