# Thiết kế hệ thống – Web flashcard học tiếng Anh

Ngày: 2026-11-12 · Trạng thái: chờ chủ dự án duyệt · Nghiệp vụ: [`flashcard-plan.md`](../../../flashcard-plan.md) (bản 5)

Tài liệu này chốt **cách xây** những gì `flashcard-plan.md` mô tả. Nghiệp vụ (chế độ học, mức chấm,
hạn mức, dịch vụ miễn phí) lấy từ file đó; chỗ nào hai file vênh nhau thì file nghiệp vụ thắng,
trừ các thay đổi ghi ở §1.

Cách tổ chức source, quy trình làm việc, agent và skill theo dự án `trading-journal-web-app`
(chủ dự án yêu cầu ngày 12/11/2026).

## 1. Khác với bản 5 của file nghiệp vụ

| Bản 5 nói | Thiết kế này | Lý do |
|---|---|---|
| Giao diện Next.js trong `web/` | Vite + React 19 SPA trong `frontend/` | Giống trading-journal; giao diện chỉ gọi `/api`, không cần SSR. Vercel Services đã chạy được cặp `vite` + `go` ở trading-journal |
| Backend Go `net/http` trong `api/` | Go + chi v5 trong `backend/`, module `flashcard` | Giống trading-journal |
| `pgx` + `sqlc` | GORM + driver postgres, `PreferSimpleProtocol: true` | Giống trading-journal; pooler 6543 chế độ transaction không nhận prepared statement |
| Migration bằng Supabase CLI; stack Supabase chạy local | File SQL `backend/migrations/NNNN_ten.up.sql` / `.down.sql`, chạy bằng golang-migrate. **Local dùng Postgres 17 thường trong Docker** (`docker-compose.yml`, cổng 54322), không chạy stack Supabase | Giống trading-journal (chủ dự án chọn 12/11/2026). Stack Supabase local kéo ~10 container, lần chạy đầu thất bại vì container analytics. Migration vẫn viết cho Supabase: chạy được lên Supabase thật bằng đúng lệnh `migrate … up` (xem mục 4 "Local khác production") |
| Go (không ghi bản) | Go 1.26 | `go-fsrs/v4` v4.0.0 đòi `go 1.26` |
| Chỉ đăng nhập Google | Google ở production; **local không có Supabase Auth**, thay bằng đăng nhập dev: nhập email, backend ký token HS256 (mục 5) | Local chưa có OAuth client của Google và không còn stack Supabase. Form chỉ hiện khi `VITE_DEV_LOGIN=1`, route dev chỉ gắn khi `ENV=dev` |

## 2. Stack

- **Backend:** Go 1.26, chi v5, GORM, golang-jwt v5 + keyfunc v3 (JWKS), go-fsrs v4, testcontainers-go (Postgres 17).
- **Frontend:** Vite + React 19 + TypeScript, react-router v7, TanStack Query v5, shadcn/ui (radix-ui),
  Tailwind v4, react-hook-form + zod, i18next (vi mặc định, en), `@supabase/supabase-js` (chỉ phần Auth),
  Vitest + Testing Library + MSW, Playwright.
- **Hạ tầng:** Supabase (Auth + Postgres + Storage) gói Free; Vercel Hobby (Services `web` + `api`).
- Không Next.js, không sqlc, không ORM khác.

## 3. Cấu trúc thư mục

```
flashcard/
├─ CLAUDE.md · AGENTS.md · flashcard-plan.md · Makefile · vercel.json · .env.example · .nvmrc
├─ .claude/agents/         -- persona (chép từ trading-journal)
├─ .claude/skills/ → .agents/skills/   -- code-review, find-skills, frontend-design, vercel-react-best-practices
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ design/theme.css     -- token màu, nguồn sự thật, không sửa
│  ├─ roadmap/kanban.md · roadmap/tickets/K-xx.md
│  └─ superpowers/specs/ · superpowers/plans/
├─ docker-compose.yml      -- Postgres 17 local (cổng 54322) + dịch vụ migrate (golang-migrate)
├─ docker/initdb/00-supabase-shim.sql   -- giả lập auth.users, auth.uid(), role anon/authenticated (CHỈ local + test)
├─ testdata/answer_cases.json   -- fixture chấm câu trả lời, Go và TS cùng đọc
├─ backend/
│  ├─ cmd/api/main.go      -- import _ "time/tzdata"; nghe cổng PORT
│  ├─ migrations/          -- NNNN_*.up.sql / .down.sql
│  └─ internal/
│     ├─ config/  apperr/  auth/  httpapi/  service/  repository/  testdb/
│     ├─ listparse/        -- THUẦN: đoán kind, chuẩn hoá term, đọc list dán / CSV
│     ├─ answer/           -- THUẦN: chấm câu gõ (đúng / gần đúng / sai)
│     ├─ srs/              -- THUẦN: bọc go-fsrs, mức chấm, cấp độ 1–5, ngày theo timezone
│     └─ quiz/             -- THUẦN: chọn thẻ cho phiên, sinh câu hỏi + đáp án nhiễu
└─ frontend/src/
   ├─ app/ (router, providers, AppShell)  components/ (ui/ của shadcn, dùng chung)
   ├─ features/ auth/ home/ study/ add/ notebook/ settings/
   ├─ lib/ (api.ts, supabase.ts, answer.ts, speech.ts, queryKeys.ts)
   ├─ i18n/strings.ts  styles/ (theme.css bản chép, bridge.css, index.css)  test/
```

Tầng backend: `httpapi` (handler, DTO, middleware) → `service` (nghiệp vụ, nhận interface `Store`)
→ `repository` (GORM). Bốn package thuần không import GORM, `net/http`, `database/sql`, `context`.

## 4. Dữ liệu

Tất cả là `timestamptz` (UTC). Bảng riêng theo tài khoản có `user_id uuid not null references auth.users on delete cascade`.

```sql
profiles    (user_id pk, display_name, avatar_url, status text check in ('active','pending','banned') default 'active', created_at)
settings    (user_id pk, default_accent text check in ('us','uk') default 'us', autoplay bool default true,
             new_per_day int default 20 check 0..200, session_size int default 20 check 5..50,
             timezone text default 'Asia/Ho_Chi_Minh', notify bool default false)
decks       (id uuid pk, user_id, name text 1..100, is_default bool default false, created_at)
             unique (user_id, lower(name)); unique (user_id) where is_default
items       (id uuid pk, user_id, deck_id → decks, term text 1..300, kind text check in ('word','phrase','sentence'),
             meaning_vi text default '' (≤ 500), ipa_uk, ipa_us, part_of_speech, definition_en, example, example_vi,
             note, tags text[] default '{}', suspended bool default false, created_at, updated_at)
             index (user_id, lower(term)); index (user_id, deck_id)
card_states (item_id pk → items on delete cascade, user_id, due, stability, difficulty, scheduled_days, reps, lapses,
             state smallint, last_review, remaining_steps, created_at)   -- một dòng = thẻ đã học ít nhất 1 lần
             index (user_id, due)
sessions    (id uuid pk, user_id, entry text check in ('suggested','new'), mode text check in ('flashcards','learn'),
             started_at, finished_at null, total int default 0, correct int default 0)
review_logs (id uuid pk, user_id, item_id → items cascade, session_id → sessions cascade, question_type, outcome,
             correct bool, answer text, response_ms int, rating smallint null, counted bool, prev_card jsonb null, reviewed_at)
             unique (session_id, item_id) where counted        -- chống chấm hai lần
```

- **Không lưu trường suy diễn:** cấp độ 1–5, "đã nhớ", số thẻ đến hạn, thời điểm vàng, số thẻ mới hôm nay đều tính lúc đọc.
- `term` được lưu đã trim và gộp khoảng trắng; trùng = cùng `lower(term)` trong một tài khoản.
- Trigger `after insert on auth.users` tạo `profiles` (tên + ảnh từ `raw_user_meta_data`), `settings`, và deck mặc định "Sổ tay chung".
- Bảng dùng chung (`audio_library`, `dict_cache`, `translation_cache`, `tts_usage`) và bảng quản trị thêm ở ticket tương ứng, không tạo sớm.

**RLS:** bật trên mọi bảng trên. Hàm `public.is_active()` (security definer) = profile của `auth.uid()` có `status='active'`.

- Đọc: `user_id = auth.uid()`.
- Ghi: `user_id = auth.uid() and is_active()`, và với `items.deck_id`, `card_states.item_id`, `review_logs.item_id/session_id`:
  phải trỏ tới dòng của chính tài khoản đó.
- `profiles`: người dùng chỉ được `update (display_name)` — cấp quyền theo cột, để không tự đổi `status`.
- `revoke all on ... from anon`.

Backend kết nối bằng user `postgres` (qua pooler). Mỗi request của người dùng chạy trong một transaction mở đầu bằng
`set local role authenticated` và `select set_config('request.jwt.claims', <claims JSON>, true)`.
**Local khác production (chủ dự án chọn Postgres thường cho local):** migration giả định Supabase đã có sẵn schema `auth`,
bảng `auth.users`, hàm `auth.uid()` và role `anon` / `authenticated` / `service_role`. Production có sẵn tất cả;
Postgres local thì không, nên `docker/initdb/00-supabase-shim.sql` tạo bản giả tối thiểu (docker-compose mount vào
`/docker-entrypoint-initdb.d`, chạy một lần khi volume còn trống; `make db-reset` dựng lại). Test (`testdb`, K-02) nạp lại
đúng file này vào Postgres của testcontainers. Ràng buộc:
- Shim KHÔNG nằm trong `backend/migrations` và không bao giờ chạy trên Supabase thật (nó định nghĩa lại `auth.uid()`).
- Migration không được tạo / sửa schema `auth` và không được `create role`; chỉ tham chiếu `auth.users(id)` và gọi `auth.uid()`.
- Hành vi RLS đã kiểm trên Postgres thường (12/11/2026): `auth.uid()` đọc `request.jwt.claims.sub`, user A chỉ đọc dòng của A,
  ghi dòng mang `user_id` của B bị `new row violates row-level security policy`, `anon` không claims có `auth.uid()` là null.

## 5. Đăng nhập

- Trình duyệt: `supabase.auth.signInWithOAuth({ provider: 'google' })`, scope mặc định (`openid email profile`).
- Mỗi request gửi `Authorization: Bearer <access_token>`.
- Go kiểm token: khoá công khai lấy từ `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (ES256/RS256);
  token HS256 chỉ nhận khi có `SUPABASE_JWT_SECRET` (stack local). Kiểm `iss = {SUPABASE_URL}/auth/v1`,
  `aud = authenticated`, `exp`. `sub` là `user_id`.
- Middleware tra `profiles.status`: không phải `active` → 403 `account_inactive` (token cũ có thể còn hạn).
- **Đăng nhập dev (local, không có Supabase Auth):** khi `ENV=dev`, backend gắn thêm `POST /api/dev/login {email}`: tạo
  (nếu chưa có) dòng `auth.users`, rồi ký token HS256 bằng `SUPABASE_JWT_SECRET` với cùng claims Supabase
  (`sub`, `email`, `role=authenticated`, `aud=authenticated`, `iss`). Route này KHÔNG được gắn khi `ENV=prod`
  (`config` từ chối khởi động khi `ENV=prod` mà `SUPABASE_JWT_SECRET` không rỗng, để token HS256 tự ký không bao giờ
  được nhận ở production; test route-table kiểm). Từ đó mọi request đi cùng một đường kiểm token và RLS như production. Làm ở K-03.
- Storage (audio, K-11) không có Supabase Storage ở local: viết sau interface, local ghi file / bộ nhớ, production dùng Supabase Storage.

## 6. API (v1 lõi)

Lỗi theo dạng của trading-journal: `{"error": "<code>", "msg": "<chữ tiếng Việt cho người dùng>"}`.

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/healthz` | không cần đăng nhập |
| GET | `/api/me` | profile + settings |
| PATCH | `/api/settings` | `display_name`, `default_accent`, `autoplay`, `new_per_day`, `session_size`, `timezone` |
| GET/POST | `/api/decks` | danh sách kèm số mục; tạo |
| PATCH/DELETE | `/api/decks/{id}` | xoá deck: mục chuyển về deck mặc định; deck mặc định không xoá được |
| GET | `/api/items` | `q`, `deck`, `level` (0 = chưa học, 1–5), `tag`, `suspended`, `page` (50/trang) → `{items, total}` |
| POST | `/api/items` | trùng → 409 `duplicate` kèm mục đã có; gửi `force: true` để vẫn thêm |
| PATCH/DELETE | `/api/items/{id}` | sửa từng trường, chuyển deck, `suspended` |
| POST | `/api/items/import/preview` | `{text, format: text\|csv, sep: tab\|comma\|dash\|custom, custom, item_sep: newline\|semicolon}` → các dòng kèm trạng thái + tổng |
| POST | `/api/items/import` | `{deck_id, rows:[{term, meaning}], skip_duplicates}` ≤ 1.000 dòng → `{created, skipped}` |
| GET | `/api/home` | số mục theo cấp độ 1–5, số mới còn được học hôm nay, số đến hạn, `next_due_at`, số mục thiếu nghĩa |
| POST | `/api/sessions` | `{entry: suggested\|new, mode: flashcards\|learn}` → phiên + thẻ + câu hỏi |
| POST | `/api/sessions/{id}/answers` | xem §7.5 |
| POST | `/api/sessions/{id}/finish` | đóng phiên, trả tổng kết |

Hạn mức: 5.000 mục/tài khoản, 200 mục thêm mới/ngày (theo timezone của tài khoản). Vượt → 429 `limit` kèm số còn được thêm.
Ở bản này là hằng số trong `service`; ticket admin chuyển sang `app_settings` / `user_limits`.

## 7. Quy tắc nghiệp vụ (package thuần)

### 7.1 `listparse`
- `GuessKind`: 1 từ → `word`; kết thúc bằng `.` `?` `!` hoặc ≥ 6 từ → `sentence`; còn lại `phrase`.
- `NormalizeTerm`: bỏ BOM, trim, gộp mọi khoảng trắng Unicode thành một dấu cách. Khoá trùng = `lower` của kết quả đó.
- `Parse`: ngăn giữa mục là xuống dòng (`\n`, `\r\n`) hoặc `;` (người dùng chọn). Dòng trống bỏ qua, không đếm.
  Ngăn term–nghĩa tách ở **lần xuất hiện đầu tiên**: Tab, `,`, hoặc ` - ` / ` – ` / ` — ` (có dấu cách hai bên, để `well-known` không bị tách),
  hoặc chuỗi tuỳ chọn. `format: csv` đọc bằng `encoding/csv` (chịu ngoặc kép), cột 1 term, cột 2 nghĩa.
- Trạng thái dòng: `ok`, `duplicate_existing`, `duplicate_in_paste`, `error` (term rỗng; term > 300 ký tự; nghĩa > 500 ký tự). Dòng thiếu nghĩa vẫn `ok`.

### 7.2 `answer`
- Chuẩn hoá: thường hoá, `’ ‘` → `'`, `“ ”` → `"`, gộp khoảng trắng, trim, bỏ dấu câu cuối (`. ? ! , ; :`, lặp).
- Kết quả: `correct`; `near` khi khoảng cách OSA (Levenshtein có hoán vị kề) = 1 và đáp án ≥ 5 ký tự; còn lại `wrong`.
- Bản TS ở `frontend/src/lib/answer.ts` cho phản hồi tức thì. Cả hai đọc `testdata/answer_cases.json`; đổi quy tắc là đổi fixture.

### 7.3 `srs`
- Scheduler: `DefaultParam()`, `RequestRetention 0.9`, `EnableFuzz true`, `LearningSteps {1, 10}` (phút), `RelearningSteps {10}`.
- Mức chấm (đúng bảng ở §7 file nghiệp vụ):
  - `wrong`, `dont_know`, flashcard "Chưa nhớ" → Again
  - `near`, hoặc đúng sau khi bấm "Gợi ý" → Hard
  - đúng, flashcard "Nhớ", "Tôi gõ đúng" → Good
  - đúng ở dạng gõ, không gợi ý, nhanh hơn `3000 + 300 × số ký tự đáp án` ms → Easy
- Cấp độ: chưa có `card_states` hoặc `state = New` → 0; stability `< 1` → 1, `< 3` → 2, `< 7` → 3, `≤ 21` → 4, `> 21` → 5.
- `StartOfDay(now, tz)`: nửa đêm theo `settings.timezone`, không hardcode +7.

### 7.4 `quiz`
- **Chọn thẻ (`entry=suggested`)**, tối đa `session_size`, bỏ mục `suspended` và mục chưa có nghĩa:
  1. thẻ Learning/Relearning có `due ≤ now`, `due` sớm trước;
  2. thẻ Review có `due ≤ now`, khả năng nhớ (`Retrievability`) thấp trước;
  3. thẻ mới, cũ trước, tối đa `new_per_day − số card_states tạo từ đầu ngày hôm nay`.
- `entry=new`: chỉ nhóm 3.
- **Câu hỏi theo cấp độ** (Learn): 0–1 → chọn nghĩa rồi gõ có gợi ý chữ đầu; 2 → chọn từ rồi gõ có gợi ý chữ đầu;
  3 → gõ có gợi ý chữ đầu; 4–5 → gõ. Cấp 0–2 phải đúng 2 bước mới xong; cấp 3–5 một bước.
- **Flashcards:** một bước, mặt trước term, mặt sau nghĩa; tự chấm Nhớ / Chưa nhớ.
- **Đáp án nhiễu:** 3 mục cùng `kind` của chính tài khoản, có nghĩa, khác term và khác nghĩa với đáp án; ưu tiên cùng deck,
  rồi cùng từ loại, rồi ngẫu nhiên. Không đủ 3 → bước trắc nghiệm đổi thành gõ có gợi ý chữ đầu.
- Nghe chọn, nghe gõ, xếp câu, điền chỗ trống chưa có ở bản này (cần audio / thuộc v2).

### 7.5 Trả lời
- Client chấm ngay để phản hồi, rồi gửi `{item_id, question_type, choice_id?, text?, self_grade?, dont_know?, override?, used_hint?, response_ms}`.
- Server chấm lại theo cùng quy tắc (trắc nghiệm: `choice_id == item_id`).
- Lần trả lời **đầu tiên** của thẻ trong phiên (`insert ... on conflict do nothing` trên chỉ mục `counted`): tính rating, chạy `f.Next`,
  ghi `card_states`, lưu `prev_card` để hoàn tác ở v2. Lần sau chỉ ghi log `counted=false`, không đổi lịch.
- Learn: sai thì thẻ về cuối hàng, hỏi lại đúng bước đó; "Tôi gõ đúng" chỉ hiện sau câu gõ sai / gần đúng.
- Phím: 1–4 chọn, Enter gửi / tiếp, Space lật thẻ, R / Shift+R đọc UK / US.

## 8. Giao diện

- Theme: `docs/design/theme.css` (chép từ trading-journal) là nguồn sự thật, không sửa. Component chỉ dùng biến ngữ nghĩa
  (`--surface-*`, `--text-*`, `--border-*`, `--status-*`, `--primary`). 5 màu cấp độ là token riêng trong `bridge.css`
  (`--level-1` … `--level-5`), lấy từ thang màu có sẵn trong theme, kiểm tương phản ≥ 3:1 với nền.
- Bố cục kiểu Mochi: mỗi màn một việc, term là chữ lớn nhất, phản hồi tức thì, chuyển động < 0,2 giây. Không chép nhân vật,
  hình, màu của Mochi.
- Đọc tạm bằng Web Speech API (`en-US` / `en-GB`) ở bản này; audio Deepgram ở ticket audio.

## 9. Chạy local

- `make db-up` dựng Postgres 17 trong Docker (cổng 54322, DB `flashcard`, user / mật khẩu `postgres`); `make db-down` tắt;
  `make db-reset` xoá dữ liệu và dựng lại (chạy lại shim).
- `make migrate` chạy `backend/migrations` vào Postgres local bằng golang-migrate. Lên Supabase thật dùng cùng công cụ
  với chuỗi kết nối của Supabase (như `docs/deployment-vercel-supabase.md` của trading-journal; viết cho flashcard ở K-10).
- `make api` (Go, cổng 8000) · `make web` (Vite 5173, proxy `/api` sang 8000).
- `make test` (Go, cần Docker) · `make test-pure` (không Docker) · `make test-fe` · `make e2e`.

## 10. Edge case dễ bị bỏ sót (phải có test)

1. Mục chưa có nghĩa: vẫn lưu, không vào phiên ôn, trang chủ báo "N mục thiếu nghĩa".
2. Gửi đôi câu trả lời đầu tiên (mạng chập chờn, bấm hai lần): lịch ôn chỉ đổi một lần.
3. Trỏ chéo tài khoản: tạo mục với `deck_id` của người khác, trả lời với `item_id` của người khác → bị chặn ở RLS, không chỉ ở service.
4. Chữ dán / gõ "bẩn": `\r\n`, BOM của file .txt, dấu nháy cong `don’t`, khoảng trắng đôi, dấu `?` cuối câu.
5. "Hôm nay" theo `Asia/Ho_Chi_Minh`: hạn 20 thẻ mới reset lúc 00:00 giờ VN, không phải 07:00 (nửa đêm UTC).
