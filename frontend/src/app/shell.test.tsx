import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./router";
import { setLocale } from "@/i18n/config";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("AppShell", () => {
  it("renders landmarks at / and marks the current nav item", async () => {
    await setLocale("vi");
    renderAt("/");
    expect(screen.getByRole("main")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    const current = within(nav).getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("Ôn tập");
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
  });

  it("has a skip link that targets <main>", () => {
    renderAt("/");
    const skip = screen.getByRole("link", { name: "Bỏ qua điều hướng" });
    const main = screen.getByRole("main");
    expect(skip).toHaveAttribute("href", `#${main.id}`);
    expect(main.id).not.toBe("");
  });

  it.each([
    ["/decks", "Sổ tay"],
    ["/add", "Thêm"],
    ["/settings", "Cài đặt"],
  ])("registers the placeholder route %s with an i18n heading", (path, heading) => {
    renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it.each(["/study/abc", "/login"])("renders %s full-screen, without the navigation bar", (path) => {
    renderAt(path);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("shows a not-found page from i18n strings for an unknown route", () => {
    renderAt("/no-such-page");
    expect(screen.getByRole("heading", { level: 1, name: "Không tìm thấy trang" })).toBeInTheDocument();
  });

  it("the not-found text follows the language", async () => {
    await setLocale("en");
    renderAt("/nope");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
  });
});

describe("page title (WCAG 2.4.2)", () => {
  it.each([
    ["/", "Ôn tập"],
    ["/decks", "Sổ tay"],
    ["/add", "Thêm"],
    ["/settings", "Cài đặt"],
    ["/study/abc", "Phiên học"],
    ["/login", "Đăng nhập"],
    ["/no-such-page", "Không tìm thấy trang"],
  ])("%s sets the document title to the page name plus the app name (%s)", (path, title) => {
    renderAt(path);
    expect(document.title).toBe(`${title} – Flashcard tiếng Anh`);
  });

  it("the title follows the language", async () => {
    await setLocale("en");
    renderAt("/decks");
    expect(document.title).toBe("Notebook – English flashcards");
  });
});

describe("focus after navigation (WCAG 2.4.3)", () => {
  it("does not steal focus on first load", () => {
    renderAt("/");
    expect(screen.getByRole("main")).not.toHaveFocus();
  });

  it("moves focus to <main> after a client-side route change", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(screen.getByRole("link", { name: "Sổ tay" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Sổ tay" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("also moves focus into the full-screen study page", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);
    await router.navigate("/study/abc");
    expect(await screen.findByRole("heading", { level: 1, name: "Phiên học" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
  });
});

describe("language buttons", () => {
  it("mark their own language so a screen reader pronounces them correctly", () => {
    renderAt("/settings");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).toHaveAttribute("lang", "vi");
  });
});

describe("theme switch on /settings", () => {
  it("sets data-theme on <html> for light and dark, and remembers it", async () => {
    const user = userEvent.setup();
    renderAt("/settings");

    await user.click(screen.getByRole("button", { name: "Tối" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Tối" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("flashcard.theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Sáng" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("the System mode clears the stored choice", async () => {
    const user = userEvent.setup();
    renderAt("/settings");
    await user.click(screen.getByRole("button", { name: "Tối" }));
    await user.click(screen.getByRole("button", { name: "Hệ thống" }));
    expect(localStorage.getItem("flashcard.theme")).toBeNull();
    expect(["light", "dark"]).toContain(document.documentElement.getAttribute("data-theme"));
  });

  it("switches the language and updates <html lang>", async () => {
    const user = userEvent.setup();
    await setLocale("vi");
    renderAt("/settings");
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  });
});

describe("level indicator", () => {
  it("never relies on colour alone: shows the level number or label", async () => {
    const { LevelBadge } = await import("@/components/LevelBadge");
    await setLocale("vi");
    render(<LevelBadge level={3} />);
    expect(screen.getByText("Cấp 3")).toBeInTheDocument();
  });
});
