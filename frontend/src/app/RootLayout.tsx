import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { MAIN_ID } from "./AppShell";

/**
 * Gốc của mọi route. Sau mỗi lần đổi trang bằng router (không tính lần tải đầu), chuyển focus vào <main>:
 * app một trang (SPA) không tải lại trang nên người dùng bàn phím / trình đọc màn hình sẽ không biết nội dung đã đổi
 * (WCAG 2.4.3). Lần tải đầu giữ nguyên để không cướp focus.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
  }, [pathname]);

  return <Outlet />;
}
