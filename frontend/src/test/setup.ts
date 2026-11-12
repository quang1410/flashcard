import "@testing-library/jest-dom/vitest";
import { configure, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { setLocale } from "@/i18n/config";

// findBy* / waitFor chờ tối đa 5 giây: test đầu của một file phải chờ vitest biên dịch nguội.
configure({ asyncUtilTimeout: 5000 });

afterEach(async () => {
  cleanup();
  // Mỗi test bắt đầu từ trạng thái sạch: không rò theme / ngôn ngữ giữa các case.
  // Ngôn ngữ của i18next nằm ở cấp module nên phải đặt lại tay, xoá localStorage là chưa đủ.
  await setLocale("vi");
  try {
    localStorage.clear();
  } catch {
    /* storage bị chặn thì bỏ qua */
  }
  document.documentElement.removeAttribute("data-theme");
});
