import type { RouteObject } from "react-router";
import { AppShell } from "./AppShell";
import { RootLayout } from "./RootLayout";
import { FullScreenPage, NotFoundPage, PlaceholderPage, SettingsPage } from "./pages";

// Trong khung (có thanh điều hướng): Ôn tập, Sổ tay, Thêm, Cài đặt, 404.
// Ngoài khung (toàn màn hình): phiên học và đăng nhập — /login chỉ giữ chỗ, K-03 làm thật.
// RootLayout bọc tất cả để chuyển focus sau mỗi lần đổi trang.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <PlaceholderPage titleKey="nav.review" /> },
          { path: "/decks", element: <PlaceholderPage titleKey="nav.notebook" /> },
          { path: "/add", element: <PlaceholderPage titleKey="nav.add" /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      { path: "/study/:deckId", element: <FullScreenPage titleKey="study.title" exit /> },
      { path: "/login", element: <FullScreenPage titleKey="login.title" /> },
    ],
  },
];
