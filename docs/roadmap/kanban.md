# Kanban

Nguồn: [`flashcard-plan.md`](../../flashcard-plan.md) §9 (lộ trình) và
[thiết kế hệ thống](../superpowers/specs/2026-11-12-flashcard-design.md).
Mỗi thẻ ship kèm test và đi qua 6 bước BA → Dev → Review → QC → PO → chờ OK (CLAUDE.md,
mục "Quy trình làm việc"). Chi tiết từng thẻ ở `tickets/K-xx.md` (mẫu: `tickets/_TEMPLATE.md`).
Bốc thẻ từ trên xuống trong cột **Cần làm**; thẻ có `chờ:` thì bỏ qua cho tới khi điều kiện
được gỡ.

Ưu tiên: **P0** chặn cả v1 · **P1** đợt hiện tại (v1 lõi) · **P2** khi còn sức.
Cỡ: S ≤ 2 ngày · M 3–5 ngày · L > 1 tuần.

## Đang làm

| ID | Việc | Ưu tiên | Cỡ | Nguồn |
|---|---|---|---|---|

## Cần làm (v1 lõi: nạp và ôn, chạy local)

| ID | Việc | Ưu tiên | Cỡ | Nguồn | Xong khi |
|---|---|---|---|---|---|
| K-02 | Schema 0001 + RLS + trigger tạo profile / settings / deck mặc định; `testdb` (testcontainers + nạp lại đúng `docker/initdb/00-supabase-shim.sql`; migration không tạo role / không đụng schema `auth`); transaction người dùng `set local role authenticated` | P0 | M | Thiết kế §4 | test DB: A không đọc / ghi được dữ liệu B, kể cả trỏ chéo `deck_id` / `item_id`; tài khoản `banned` không ghi được; user không tự đổi `status` |
| K-03 | Đăng nhập: Google qua Supabase Auth (+ đăng nhập dev `POST /api/dev/login` chỉ khi `ENV=dev`; `ENV=prod` mà có `SUPABASE_JWT_SECRET` thì từ chối khởi động), middleware JWT (JWKS + HS256 dev), `/api/me`, `/api/settings`; FE: trang Đăng nhập, `RequireAuth`, Cài đặt (tên, giọng mặc định, đăng xuất) | P0 | M | Nghiệp vụ §6, §10 · Thiết kế §5 | test token sai / hết hạn / sai issuer → 401; `banned` → 403; mọi trang trừ Đăng nhập đều chặn khi chưa đăng nhập |
| K-04 | Lõi thuần: `listparse` (đoán kind, chuẩn hoá, đọc list / CSV), `answer` (đúng / gần đúng / sai), `srs` (mức chấm, cấp độ, scheduler, đầu ngày theo timezone); fixture `testdata/answer_cases.json` chạy ở cả Go lẫn TS | P0 | M | Nghiệp vụ §2, §5, §7 · Thiết kế §7.1–7.3 | `make test-pure` + vitest `answer` xanh trên cùng fixture; edge case 4 và 5 của thiết kế §10 có test; `puregate.TestPurePackagesImports` hết SKIP và quét thật 4 package; `make test-pure` thu hẹp về 4 package thuần |
| K-05 | Nội dung (BE): deck + mục CRUD, báo trùng, hạn mức 5.000 mục / 200 mục mới mỗi ngày, import xem trước + lưu | P1 | M | Nghiệp vụ §2 · Thiết kế §6 | test HTTP từng endpoint; dán 1.000 dòng trong một request; vượt hạn mức → 429 |
| K-06 | Nội dung (FE): Thêm từng mục (Tab / Enter, báo trùng), Dán list + chọn file .csv / .txt + bảng xem trước, Sổ tay (tìm, lọc deck / cấp độ / tag, sửa, xoá, chuyển deck, ngưng ôn) | P1 | L | Nghiệp vụ §2, §6 | test component + MSW; thêm và dán được bằng bàn phím hoàn toàn |
| K-07 | Phiên ôn (BE): chọn thẻ theo gợi ý (3 nhóm, 20 mới / ngày), sinh câu hỏi + đáp án nhiễu, nhận câu trả lời (chấm lần đầu, go-fsrs, chống gửi đôi), `/api/home` | P1 | L | Nghiệp vụ §4, §5, §7 · Thiết kế §7.4–7.5 | test đồng hồ giả: học hôm nay, "ngày mai" gợi ý đúng thẻ đến hạn; gửi đôi chỉ đổi lịch một lần; mục thiếu nghĩa không vào phiên |
| K-08 | Phiên ôn (FE): Trang chủ (5 cấp độ, nút "Ôn tập N mục" / đếm ngược, Học từ mới), Flashcards + Learn, Tổng kết phiên, phím tắt, đọc tạm Web Speech UK / US | P1 | L | Nghiệp vụ §4–6 | test hàng đợi Learn (sai về cuối hàng, cấp 0–2 đúng 2 bước); làm hết phiên chỉ bằng bàn phím |
| K-09 | Nghiệm thu v1 lõi: e2e Playwright trên stack local — dán 50 mục, học một phiên, hôm sau gợi ý đúng thẻ; hai tài khoản không thấy dữ liệu của nhau | P1 | M | Nghiệp vụ §9 "Xong khi" | `make e2e` xanh |

## Chờ chủ dự án

| ID | Việc | Ưu tiên | Cỡ | Chờ |
|---|---|---|---|---|
| K-10 | Deploy thật: Supabase project, Google OAuth client (consent screen "In production"), Vercel project, biến môi trường, `docs/deployment-vercel-supabase.md` | P1 | M | chờ: chủ dự án tạo tài khoản Supabase, Google Cloud, Vercel |
| K-11 | Audio UK / US: Deepgram Aura-2 + kho `audio_library` chung + Supabase Storage (sau interface; local ghi file) + `tts_usage`; dự phòng Kokoro | P1 | L | chờ: Deepgram API key |

## Backlog (v1 đủ, sau v1 lõi)

| ID | Việc | Ưu tiên | Cỡ | Nguồn |
|---|---|---|---|---|
| K-12 | Tự điền cho `word`: Free Dictionary API (IPA UK / US, từ loại, định nghĩa) + `dict_cache` | P1 | M | Nghiệp vụ §2 |
| K-13 | Icon gợi ý nghĩa: MyMemory `en\|vi` từ trình duyệt + `translation_cache`; nút "Gợi ý cho các dòng thiếu nghĩa" | P1 | M | Nghiệp vụ §2 |
| K-14 | Admin v1: Tổng quan, Tài khoản (khoá / mở, hạn mức riêng, cấp admin, xoá), Cài đặt hệ thống (chế độ đăng ký, mã mời) | P1 | L | Nghiệp vụ §11 |
| K-15 | Câu hỏi nghe chọn / nghe gõ (cần K-11) | P2 | S | Nghiệp vụ §5 |
| K-16 | Chạy CI GitHub lần đầu: xác minh `setup-go` 1.26 và `setup-node` theo `.nvmrc` 22.15.0 (làm khi push lần đầu) | P1 | S | PO K-01 |
| K-17 | Kiểm a11y thủ công còn lại: trình đọc màn hình, forced-colors, `prefers-reduced-motion` bật thật, chế độ "Hệ thống" đổi theo hệ điều hành | P2 | S | QC K-01 |
| K-18 | Làm mạnh guard styleguard: `hardcodedText` (`toast`, `document.title`, file `.ts`, `{"…"}`, JSX nhiều dòng) và `stripComments` (hex trong chuỗi có `//`); làm cùng K-03 / K-06 | P2 | S | QC K-01 |
| K-19 | `Recover` và `statusRecorder` hỗ trợ `http.Flusher` / `Unwrap` (làm khi có endpoint streaming) | P3 | S | QC K-01 |

## Xong

| ID | Việc | Ngày | Commit | Ghi chú |
|---|---|---|---|---|
| K-01 | Nền repo: backend Go (chi, config, apperr, `/healthz`, tắt êm), frontend Vite (theme, i18n, router, AppShell), Postgres local bằng docker-compose + shim Supabase, Makefile, CI, `vercel.json` | 2026-11-12 | chưa commit | Test: Go 5 package `ok`, Vitest 154/154. Chủ dự án duyệt bảng 5 màu cấp độ. Mang sang: K-16 đến K-19, Vercel Go 1.26 vào K-10, `LevelBadge` vào K-08 |
