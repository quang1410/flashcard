import { Layers, Library, Plus, Settings, type LucideIcon } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { StringKey } from "@/i18n/strings";

// Dùng chung với FullScreenPage (pages.tsx): skip-link và <main> phải cùng một id.
export const MAIN_ID = "main";

const NAV: { to: string; key: StringKey; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", key: "nav.review", icon: Layers, end: true },
  { to: "/decks", key: "nav.notebook", icon: Library },
  { to: "/add", key: "nav.add", icon: Plus },
  { to: "/settings", key: "nav.settings", icon: Settings },
];

/**
 * Khung chung cho các màn có điều hướng. Một thẻ <nav> duy nhất: thanh tab dưới ở mobile (< 768px),
 * sidebar trái ở desktop. Phiên học và đăng nhập nằm NGOÀI khung này (toàn màn hình).
 */
export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        {t("skip.toMain")}
      </a>

      <nav
        aria-label={t("nav.label")}
        className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-t-0 md:p-3"
      >
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs md:min-h-10 md:flex-none md:flex-row md:justify-start md:gap-2 md:rounded-md md:px-3 md:text-sm",
                isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon aria-hidden="true" className="size-5" />
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <main id={MAIN_ID} tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 p-4 pb-24 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
