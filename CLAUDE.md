# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Sản phẩm

Web flashcard học tiếng Anh: đăng nhập Google, tự nạp từ / cụm từ / câu, nghe giọng Anh–Anh và Anh–Mỹ,
học bằng nhiều chế độ kiểu Quizlet trong giao diện kiểu Mochi, lịch ôn spaced repetition (FSRS).
Mọi dịch vụ đều miễn phí.

Nguồn sự thật về nghiệp vụ là `flashcard-plan.md`. Thiết kế hệ thống nằm ở
`docs/superpowers/specs/2026-11-12-flashcard-design.md`. Đọc cả hai trước khi code.

## Stack

- Backend: Go 1.26, chi v5, GORM, go-fsrs v4, PostgreSQL của Supabase. Module path `flashcard`, thư mục `backend/`.
- Frontend: Vite + React 19 + TypeScript, react-router v7, TanStack Query v5, shadcn/ui, Tailwind v4,
  `@supabase/supabase-js` (chỉ Auth). Thư mục `frontend/`.
- Hạ tầng: Supabase Free (Auth Google + Postgres + Storage), Vercel Hobby (Services `web` + `api`).
- Local: Postgres 17 thường trong Docker (`make db-up`, cổng 54322), KHÔNG chạy stack Supabase. Migration viết cho Supabase
  (giả định có `auth.users`, `auth.uid()`, role `authenticated`); `docker/initdb/00-supabase-shim.sql` giả lập chúng chỉ ở local,
  không bao giờ chạy trên Supabase thật. Đăng nhập local là đăng nhập dev (thiết kế mục 5).
- Không dùng Next.js, không dùng sqlc, không dùng dịch vụ bắt khai thẻ hay trả phí.

## Quy tắc bất di bất dịch

1. **RLS là lớp chặn cuối.** Mọi bảng riêng theo tài khoản có `user_id` và bật Row Level Security.
   Mọi request của người dùng chạy trong transaction mở đầu bằng `set local role authenticated` +
   `set_config('request.jwt.claims', …, true)`. Chỉ API admin được bỏ qua, và chỉ sau khi kiểm quyền.
   Test "tài khoản A không đọc / ghi được dữ liệu tài khoản B" phải chạy ở tầng DB, không chỉ ở service.
2. **Không lưu trường suy diễn.** Cấp độ 1–5, "đã nhớ", số đến hạn, thời điểm vàng, số thẻ mới hôm nay
   đều tính lúc đọc, không có cột trong DB.
3. **`internal/listparse`, `internal/answer`, `internal/srs`, `internal/quiz` là package thuần** — cấm import
   GORM, `net/http`, `database/sql`, `context`. Test của chúng chạy không cần Docker (`make test-pure`).
4. **Lưu UTC, tính "hôm nay" theo `settings.timezone` (IANA, mặc định `Asia/Ho_Chi_Minh`).**
   Không hardcode `+7`. `main.go` phải import `_ "time/tzdata"`.
5. **Lịch ôn chỉ đổi qua `internal/srs` (go-fsrs).** Mỗi thẻ chấm một lần mỗi phiên, theo lần trả lời
   đầu tiên. Bảng mức chấm Again/Hard/Good/Easy copy nguyên văn từ `flashcard-plan.md` §7.
6. **Một bộ quy tắc chấm câu trả lời, hai bản cài.** Go (`internal/answer`) và TS (`frontend/src/lib/answer.ts`)
   cùng chạy fixture `testdata/answer_cases.json`. Đổi quy tắc là đổi fixture trước.
7. **Bí mật chỉ ở backend.** Key Deepgram, khoá service role của Supabase chỉ nằm trong biến môi trường
   của Go. Frontend chỉ có `VITE_SUPABASE_URL` và anon key.
8. **Không chép tài sản của Mochi / Quizlet** (nhân vật, hình vẽ, màu thương hiệu). Chỉ lấy cấu trúc và nhịp.
9. **Code tiếng Anh, comment tiếng Việt.** Mọi định danh trong code — tên biến, hàm, kiểu, package, file,
   key JSON, tên cột DB, route, message log/error, chuỗi test — đều viết bằng tiếng Anh. Comment và tài liệu
   (`docs/`, CLAUDE.md) viết bằng tiếng Việt.

   Ngoại lệ: **dữ liệu hiển thị cho người dùng** vẫn là tiếng Việt — text trên UI và `msg` của lỗi nghiệp vụ
   trả về client. Lỗi nội bộ và log vẫn là tiếng Anh.

## Theme

`docs/design/theme.css` là nguồn sự thật (chép từ trading-journal), **không sửa**. Component chỉ dùng
biến ngữ nghĩa (`--surface-*`, `--text-*`, `--border-*`, `--status-*`, `--primary`), không hardcode hex.
Dark mode qua `[data-theme="dark"]`. Theme tắt hết `shadow-*` — phân tầng bằng border và bậc surface.
5 màu cấp độ là token `--level-1` … `--level-5` trong `frontend/src/styles/bridge.css`, lấy từ thang màu có sẵn.
Chữ phải đạt tương phản WCAG AA (4,5:1); `--primary` trần trên nền trắng không đủ cho chữ thường.

## i18n

Mọi chuỗi hiển thị nằm ở `frontend/src/i18n/strings.ts`, song ngữ `{ vi, en }` trong cùng một mục.
Nội suy dùng MỘT ngoặc: `{n}`, không phải `{{n}}` (giống trading-journal). Test chạm chuỗi có tham số
phải assert kết quả đã nội suy.

## Testing (bắt buộc)

Mỗi feature ship kèm test trong cùng lần thay đổi, không dời sang sau. Backend dùng table-driven test
cạnh code. Trước khi báo "xong" phải chạy test thật và báo kết quả thật. Sửa bug thì thêm regression test
fail trên code cũ, pass trên code mới.

Chạy: `make test` (Go, cần Docker) · `make test-pure` (không Docker) · `make test-fe` · `make e2e`.

## Roadmap

v1 lõi (đang làm) → v1 đủ (từ điển, gợi ý nghĩa, audio, admin) → v2 đủ chế độ → v3 hoàn thiện
(`flashcard-plan.md` §9). Việc hằng ngày theo `docs/roadmap/kanban.md`.

## Quy trình làm việc (bắt buộc)

Chủ dự án duyệt từng bước; Claude không tự chuyển sang ticket mới khi chưa được OK.

### Đầu phiên — khi được hỏi "đang làm tới đâu / định hướng thế nào"

Đọc `docs/roadmap/kanban.md`, `git status`, `git log` gần nhất và các ticket đang dở trong
`docs/roadmap/tickets/`, rồi báo cáo ngắn:

1. Đã xong gì (kể từ lần báo trước), commit nào.
2. Đang dở gì, đang ở bước nào của quy trình dưới đây.
3. Đề xuất ticket tiếp theo (lấy từ trên xuống trong cột **Cần làm**) và lý do.
4. Việc đang chờ chủ dự án (cột **Chờ chủ dự án**).

Rồi **dừng, chờ OK**. Không code trước khi được duyệt.

### Mỗi ticket đi qua 6 bước, theo thứ tự

Tên ở cột "Ai" là tên file trong `.claude/agents/` (vd `product-manager` →
`.claude/agents/product-manager.md`). Gọi bằng Agent tool với agent có `name:` trong file đó;
nếu phiên chưa nạp agent thì dùng `general-purpose` và bảo nó đọc file persona trước khi làm.
BA, QC và PO chỉ đọc và chạy test, không sửa code.

| # | Bước | Ai | Đầu ra |
|---|---|---|---|
| 1 | **BA check** | `product-manager` + `design-ux-architect` (ticket có UI thêm `design-ui-designer`) | `docs/roadmap/tickets/K-xx.md`: bối cảnh, phạm vi / ngoài phạm vi, tiêu chí nghiệm thu đo được, edge case, quy tắc CLAUDE.md bị chạm. Chỗ mơ hồ thì hỏi chủ dự án, không tự đoán |
| 2 | **Dev** | Claude | Code theo TDD: test fail trước, rồi sửa. Chạy test thật (mục Testing) |
| 3 | **Review** | skill `code-review` (so với nhánh `main`, spec là file ticket) | Sửa hết finding đúng; finding bỏ qua phải ghi lý do vào ticket |
| 4 | **QC/QA** | `testing-reality-checker` + `testing-evidence-collector`; thêm `testing-api-tester` (API), `testing-accessibility-auditor` (UI), `security-appsec-engineer` (auth, RLS) khi liên quan | Đối chiếu từng tiêu chí nghiệm thu với bằng chứng (output test, file:dòng). Fail thì quay lại bước 2 |
| 5 | **PO nghiệm thu** | `product-manager` | Kết luận đạt / chưa đạt theo tiêu chí ở bước 1, ghi vào ticket |
| 6 | **Báo cáo + lên plan tiếp** | Claude | Báo chủ dự án: làm gì, kết quả test, kết quả review/QC/PO, rủi ro còn lại; đề xuất ticket kế tiếp. **Dừng, chờ OK** |

### Khi chủ dự án OK

- Chỉ commit khi chủ dự án bảo commit. Một ticket một commit, message tiếng Việt kiểu
  `feat(be): …` / `fix(fe): …` (K-xx), chỉ một dòng tiêu đề. `git add` từng đường dẫn, không `git add -A`.
  Push / mở PR chỉ khi được yêu cầu.
- Kanban: chuyển thẻ sang cột **Xong**, ghi ngày, commit hash, ghi chú ngắn.
- Ticket file: đánh dấu `Trạng thái: Xong`.
- Thẻ mới phát sinh trong lúc làm (finding chưa sửa, ý tưởng) → thêm vào **Cần làm** hoặc
  **Backlog** kèm mức ưu tiên, không âm thầm làm luôn.
