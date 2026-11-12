# Plan tính năng cơ bản – Web flashcard học tiếng Anh

_Ngày: 2026-11-12 (bản 5) · Trạng thái: phần lớn quyết định đã chốt, còn 4 điểm chờ Galvin xác nhận · Bản đầy đủ có sơ đồ: https://claude.ai/artifact/BoiE1MP2jspDrqwpEDpEZ3_

Bản 3 cập nhật theo câu trả lời của Galvin: chỉ đăng nhập bằng Google; audio lấy qua API; không dùng Google Cloud TTS; nghĩa tiếng Việt tự nhập kèm icon gợi ý gọi API; toàn bộ chạy trên Vercel miễn phí; giọng mặc định chọn theo giọng có nhiều lựa chọn miễn phí hơn; 20 thẻ mới mỗi ngày. Bản 4 thêm trang quản trị (mục 11). Bản 5 đổi backend sang Go theo yêu cầu của Galvin (mục 8). Tài liệu này thay thế phần stack và "map chấm điểm" trong `research-flashcard-srs.md`.

## 1. Mục tiêu và phạm vi

Web bắt buộc đăng nhập Google, mỗi tài khoản tự nạp từ hoặc câu tiếng Anh, nghe giọng Anh–Anh hoặc Anh–Mỹ, học bằng nhiều chế độ kiểu Quizlet trong giao diện học kiểu Mochi, có lịch ôn spaced repetition. Toàn bộ chạy trên dịch vụ miễn phí.

**Galvin đã nói:** bắt buộc đăng nhập, nhiều tài khoản, đăng nhập bằng Google; mọi thứ miễn phí, không dùng dịch vụ bắt khai thẻ; audio UK + US, ưu tiên qua API; giọng mặc định là giọng có nhiều lựa chọn miễn phí hơn; nghĩa tiếng Việt tự nhập, icon gợi ý bấm vào gọi API; toàn bộ trên Vercel miễn phí; 20 thẻ mới/ngày; thêm từng mục hoặc dán list; mục là từ, cụm từ hoặc câu; không cần ảnh; học theo gợi ý hoặc tự chọn; nhiều chế độ dựa trên Quizlet; giao diện học giống Mochi; có trang admin để quản lý; backend viết bằng Go.

**Giả định (chưa xác nhận):** đăng ký mặc định mở cho mọi tài khoản Google, không mã mời (đọc câu "không cần, đăng nhập bằng Google" theo nghĩa này); dữ liệu riêng theo tài khoản; "miễn phí" = không trả tiền, không khai thẻ, tín dụng tặng một lần không cần thẻ vẫn tính là miễn phí; quy mô vài chục tài khoản, phi thương mại; dùng qua trình duyệt trên máy tính và điện thoại.

**Không làm ở bản cơ bản:** ảnh, khoá học dựng sẵn, chia sẻ bộ thẻ, đăng nhập email/mật khẩu, Quizlet Live, Gravity, app native, chấm phát âm, thu phí.

## 2. Thêm nội dung

- Trường của một mục: term (bắt buộc), kind (word/phrase/sentence, tự đoán: 1 từ = word; kết thúc . ? ! hoặc ≥ 6 từ = sentence), meaning_vi (tự nhập, có icon gợi ý), IPA + từ loại + định nghĩa tiếng Anh (tự điền, chỉ cho word), ví dụ + nghĩa ví dụ, ghi chú, tag, deck.
- Thêm từng mục: form một dòng, Tab giữa term và nghĩa, Enter lưu; tra từ điển nền; báo trùng.
- Nhập list: ô dán + file .csv/.txt. Dấu ngăn term–nghĩa: Tab (mặc định), phẩy, gạch ngang, tuỳ chọn. Ngăn giữa mục: xuống dòng hoặc chấm phẩy (giống Quizlet Import). Dòng thiếu nghĩa vẫn nhận. Bảng xem trước: tổng số, trùng, dòng lỗi.
- Tự điền sau khi lưu: word → Free Dictionary API; phrase/sentence → chỉ sinh audio. Hàng đợi, cache.
- **Gợi ý nghĩa tiếng Việt:** ô nghĩa luôn để tự gõ; icon gợi ý bên cạnh, chỉ gọi API khi bấm. Gọi MyMemory `en|vi` từ trình duyệt (không key, CORS, 5.000 ký tự/ngày theo IP, mỗi lần ≤ 500 byte), hiện 1–3 chip, bấm chip để điền rồi sửa. Cache dùng chung `translation_cache`. List dán vào có nút "Gợi ý cho các dòng thiếu nghĩa", dừng khi hết hạn mức ngày. Không bao giờ tự điền.
- Sổ tay: sửa, xoá, chuyển deck, tìm, lọc theo cấp độ/tag, công tắc "ngưng ôn".

## 3. Audio UK và US

- **Nguồn chính: Deepgram Aura-2 API.** Tín dụng 200 USD một lần, không hết hạn, không cần thẻ; Aura-2 0,030 USD/1.000 ký tự ≈ 6,6 triệu ký tự. 41 giọng tiếng Anh; giọng Anh: `aura-2-pandora-en` (nữ), `aura-2-draco-en` (nam); phần lớn còn lại là giọng Mỹ.
- **Dự phòng: Kokoro (`kokoro-js`) trong trình duyệt** khi hết tín dụng (20 giọng Mỹ, 8 giọng Anh; Anh tốt nhất B-, Mỹ tốt nhất A; model 86–92 MB).
- **Đọc tạm:** Web Speech API (`en-GB`/`en-US`) khi file chưa sẵn sàng.
- Đã loại: Google Cloud TTS (bắt billing); Edge Read Aloud qua `msedge-tts` (API không chính thức, đổi xác thực 12/2025); ElevenLabs (10.000 ký tự/tháng, phi thương mại).
- **Giọng mặc định: US.** Giá Deepgram như nhau cho mọi giọng; US có hơn 30 giọng so với 2 giọng UK, và chất lượng dự phòng Kokoro cho US tốt nhất. Mỗi tài khoản đổi được trong Cài đặt.
- Luồng: tìm kho audio chung theo hash nội dung + giọng → chưa có thì backend Go gọi Deepgram (key ở server) → lưu mp3 vào Supabase Storage. Chỉ sinh ngay giọng mặc định; giọng còn lại sinh khi có người bấm nghe lần đầu. App tự đếm ký tự đã gửi (`tts_usage`); đạt 6 triệu ký tự (~180 USD) hoặc API báo hết tín dụng thì chuyển sang Kokoro.
- Ước lượng: 6 triệu ký tự, 30 ký tự/mục ≈ 200.000 file audio.
- Interface chung: `synthesize(text, accent)`.
- UI: loa UK, loa US, ốc sên (0,75×, cùng file); cài đặt giọng mặc định (US) và tự phát; phím R / Shift+R.

## 4. Hai cách vào học

**Học theo gợi ý** – phiên tối đa 20 thẻ, ưu tiên: (1) thẻ đang học dở tới bước lặp; (2) thẻ đến hạn, khả năng quên cao trước; (3) thẻ mới, **tối đa 20/ngày** (chỉnh được). Luôn ghi vào lịch. Hết thẻ đến hạn → đồng hồ đếm ngược + mời học từ mới hoặc tự chọn.

**Tự chọn** – tick mục trong sổ tay hoặc chọn cả deck/tag/cấp độ/nhóm "hay sai", rồi chọn chế độ. Tính lịch: chưa học → lần học đầu; đến hạn → ôn bình thường; chưa đến hạn → mặc định chỉ luyện thêm (ghi log, không đổi lịch), có công tắc "Tính vào lịch ôn". Match và Test không bao giờ đổi lịch.

## 5. Chế độ học

| Chế độ | Cách học | Đổi lịch | Bản |
|---|---|---|---|
| Flashcards | Lật thẻ, tự chấm Chưa nhớ / Nhớ | Có | v1 |
| Learn | Trắc nghiệm → gõ; sai quay lại cuối hàng; đúng 2 lần thì xong | Có | v1 |
| Write | Hiện nghĩa, gõ term | Có | v2 |
| Spell | Nghe, gõ lại (câu ≤ 8 từ) | Có | v2 |
| Match | Ghép 6 cặp tính giờ | Không | v2 |
| Test | Đề tự sinh, chấm cuối bài | Không | v3 |

Dạng câu hỏi: chọn nghĩa, chọn từ, nghe chọn, gõ, nghe gõ, xếp câu (chỉ sentence), điền chỗ trống (chỉ sentence), đúng/sai (chỉ Test).

Quy tắc: đáp án nhiễu lấy từ mục cùng loại của chính tài khoản, ưu tiên cùng deck và từ loại (dưới 4 mục thì dùng dạng gõ); chấm gõ bỏ qua hoa thường, khoảng trắng thừa, dấu câu cuối; sai 1 ký tự ở từ ≥ 5 ký tự = "gần đúng"; nút "Tôi gõ đúng" và "Không biết"; phím 1–4, Enter, Space.

## 6. Giao diện kiểu Mochi

Lấy cấu trúc và nhịp của Mochi, không chép nhân vật, hình vẽ, màu thương hiệu.

Màn hình: Đăng nhập (một nút "Đăng nhập bằng Google"; lần đầu tự tạo tài khoản; mọi màn khác chỉ mở sau khi đăng nhập) · Trang chủ/Ôn tập (biểu đồ 5 cấp độ, nút "Ôn tập N mục" hoặc đồng hồ đếm ngược, chuỗi ngày, nút Học từ mới) · Học từ mới · Phiên ôn · Tổng kết phiên · Sổ tay · Thêm nội dung · Cài đặt (tên hiển thị, giọng mặc định, đăng xuất) · Chờ kích hoạt (chỉ khi đăng ký cần mã mời hoặc đã đóng) · Quản trị (chỉ admin, mục 11).

Nguyên tắc: mỗi màn một việc; nền sáng, một màu nhấn, 5 màu cố định cho 5 cấp độ; chữ term lớn nhất; phản hồi tức thì, chuyển động < 0,2 giây; làm được cả phiên bằng bàn phím; một nhân vật tự vẽ.

## 7. Lịch ôn và chấm điểm

```go
import fsrs "github.com/open-spaced-repetition/go-fsrs/v4" // FSRS-6, MIT

p := fsrs.DefaultParam()
p.RequestRetention = 0.9
p.EnableFuzz = true
p.LearningSteps = []float64{1, 10} // phút
p.RelearningSteps = []float64{10}
f := fsrs.NewFSRS(p)
info, err := f.Next(card, time.Now(), fsrs.Good) // info.Card, info.ReviewLog
```

| Kết quả | Rating |
|---|---|
| Sai / "Không biết" / flashcard "Chưa nhớ" | Again |
| Gõ gần đúng, hoặc đúng sau khi xin gợi ý | Hard |
| Đúng / flashcard "Nhớ" | Good |
| Đúng ở dạng gõ, nghe gõ, xếp câu và nhanh hơn ngưỡng (3 giây + 0,3 giây/ký tự, cần chỉnh) | Easy |

- Mỗi thẻ chấm một lần mỗi phiên, theo lần trả lời đầu tiên. Hoàn tác bằng `f.Rollback(card, log)`.
- Lịch ôn và (về sau) tham số FSRS tính riêng cho từng tài khoản.

5 cấp độ (lớp hiển thị, tính từ stability; ngưỡng là đề xuất): 1 < 1 ngày (chọn nghĩa, nghe chọn) · 2 1–3 ngày (chọn từ, nghe chọn) · 3 3–7 ngày (gõ có gợi ý chữ đầu, điền chỗ trống) · 4 7–21 ngày (gõ, nghe gõ, xếp câu) · 5 > 21 ngày (gõ, nghe gõ).

Thời điểm vàng = `due` sớm nhất. "Đã nhớ" = số mục cấp 4–5. Thông báo (v3): gộp, tối đa 1 lần/2 giờ, im lặng 22:00–07:00.

## 8. Data model và kiến trúc

Giao diện Next.js + backend Go trong cùng một dự án Vercel Hobby (Vercel Services); Supabase (Auth + Postgres + Storage) gói Free.

Khối: Tài khoản (Google qua Supabase Auth) · Nội dung (CRUD + parser list thuần) · Từ điển (tra + cache chung) · Gợi ý nghĩa (MyMemory từ trình duyệt + cache chung) · Audio (`synthesize`: Go tìm kho chung → gọi Deepgram; hết tín dụng thì trình duyệt dùng Kokoro) · Câu hỏi (Go tạo câu hỏi; trình duyệt kiểm tra câu trả lời để phản hồi ngay; đều là hàm thuần) · Lịch ôn (gom phiên, rating, go-fsrs, log) · Quản trị (API /api/admin/*, mục 11).

```
-- Riêng theo tài khoản: mọi bảng có user_id và bật Row Level Security
profiles          (user_id, display_name, avatar_url, status, created_at)
                  -- tên và ảnh lấy từ Google; status = active | pending | banned
decks             (id, user_id, name, created_at)
items             (id, user_id, deck_id, term, kind, meaning_vi, ipa_uk, ipa_us,
                   part_of_speech, definition_en, example, example_vi,
                   note, tags, suspended, created_at)
card_states       (item_id, user_id, due, stability, difficulty, reps, lapses, state,
                   last_review, ...các trường Card còn lại của go-fsrs)
sessions          (id, user_id, entry, mode, started_at, finished_at, total, correct)
review_logs       (id, user_id, item_id, session_id, question_type, correct,
                   response_ms, rating, counted, reviewed_at)
settings          (user_id, default_accent = 'us', autoplay, new_per_day = 20,
                   session_size = 20, notify)

-- Dùng chung: tài khoản nào đăng nhập cũng đọc được
audio_library     (text_hash, accent, provider, voice, file_path, created_at)
dict_cache        (term, payload, fetched_at)
translation_cache (term, suggestions, fetched_at)

-- Chỉ server ghi
tts_usage         (provider, chars_used, updated_at)

-- Quản trị (mục 11): chỉ server ghi, chỉ admin đọc
admins            (user_id, granted_by, granted_at)
app_settings      (key, value, updated_by, updated_at)
                  -- chế độ đăng ký, hạn mức mặc định, ngưỡng Kokoro
user_limits       (user_id, max_items, max_new_per_day)  -- chỉ khi khác mặc định
invite_codes      (code, created_by, max_uses, used_count, expires_at)
admin_audit_log   (id, admin_id, action, target_user_id, detail, created_at)
```

**Backend Go:**
- Chạy trên Vercel: hai service trong một dự án: `web/` (Next.js, chỉ giao diện) và `api/` (server Go `net/http`, nghe cổng `PORT`); `vercel.json` đưa `/api/*` sang Go, còn lại sang Next.js — chung tên miền, không CORS. Go runtime và Vercel Services đều đang Beta (dùng được trên mọi gói kể cả Hobby); nếu trục trặc thì chuyển server Go sang nơi khác không phải viết lại.
- Đăng nhập: trình duyệt đăng nhập Google bằng supabase-js, gửi access token mỗi request; Go tự kiểm chữ ký bằng JWKS của Supabase (`/auth/v1/.well-known/jwks.json`), kiểm issuer, lấy `user_id`.
- Database: `pgx` v5 qua pooler Supabase chế độ transaction (cổng 6543, dành cho serverless); không hỗ trợ prepared statements nên đặt `default_query_exec_mode=simple_protocol`.
- RLS vẫn là lớp chặn cuối: mỗi request của người dùng chạy trong transaction mở đầu bằng `SET LOCAL ROLE authenticated` + đặt `request.jwt.claims` từ token, để policy `auth.uid() = user_id` vẫn áp dụng. Chỉ API admin bỏ qua bước này, sau khi kiểm quyền.
- Truy vấn: SQL thuần + `sqlc` sinh code Go có kiểu; migration là file SQL quản lý bằng Supabase CLI.
- Chia việc: trình duyệt lo giao diện, kiểm tra câu trả lời, Kokoro, MyMemory, Web Speech; Go lo mọi đọc ghi dữ liệu, đọc list, tạo phiên và câu hỏi, mức chấm, FSRS, Deepgram, Free Dictionary, API admin, tác vụ hẹn giờ.

```
flashcard/
├─ vercel.json            -- hai service: web (Next.js), api (Go); /api/* → api
├─ web/                   -- Next.js: chỉ giao diện, gọi /api
└─ api/
   ├─ go.mod
   ├─ cmd/api/main.go     -- khởi động server, nghe cổng PORT
   ├─ internal/auth/      -- kiểm token Supabase, user_id, quyền admin
   ├─ internal/db/        -- pgx, transaction có RLS, code sinh từ sqlc
   ├─ internal/content/   -- deck, mục, đọc list
   ├─ internal/review/    -- phiên, câu hỏi, mức chấm, go-fsrs
   ├─ internal/audio/     -- Deepgram, Supabase Storage, tts_usage
   ├─ internal/dict/      -- Free Dictionary, dict_cache
   ├─ internal/admin/     -- /api/admin/*
   └─ migrations/         -- file SQL
```

Triển khai: key Deepgram và khóa quản trị Supabase chỉ ở backend Go (biến môi trường Vercel); RLS là lớp chặn cuối; `go test` dạng bảng cho hàm thuần ở backend + test hàm kiểm tra câu trả lời ở trình duyệt + test tài khoản A không đọc được dữ liệu tài khoản B + test tài khoản thường không mở được /admin và không gọi được thao tác quản trị, kể cả gọi thẳng API.

## 9. Lộ trình

- **v1 – Nạp và ôn:** đăng nhập Google, đa tài khoản; thêm từng mục + dán list; phiên âm + audio UK/US; Flashcards + Learn + FSRS; gợi ý ôn, 5 cấp độ, sổ tay; admin: Tổng quan, Tài khoản, Cài đặt hệ thống. _Xong khi:_ dán 50 mục, học một phiên, hôm sau app gợi ý đúng thẻ; hai tài khoản không thấy dữ liệu của nhau.
- **v2 – Đủ chế độ:** tự chọn từ sổ tay; Write, Spell, Match; xếp câu, điền chỗ trống; tổng kết phiên, chuỗi ngày; hoàn tác, ngưng ôn; admin: Kho audio, Cache, Nhật ký. _Xong khi:_ chọn 10 mục bất kỳ và học được bằng mọi chế độ.
- **v3 – Hoàn thiện:** Test tự sinh; thông báo thời điểm vàng; thống kê, xuất CSV; tối ưu tham số FSRS. _Xong khi:_ nhận thông báo đúng lúc; làm đề 20 câu và xem lại câu sai.

Admin tối thiểu vào v1 vì đăng ký mở cần cách khóa tài khoản lạm dụng ngay từ đầu.

## 10. Tài khoản, đăng nhập và dịch vụ miễn phí

- Đăng nhập chỉ bằng Google qua Supabase Auth; chỉ xin `openid`, `email`, `profile`. Với các quyền cơ bản này Google cho mọi tài khoản đăng nhập mà không cần duyệt app; màn hình xin quyền chưa hiện tên/logo app cho tới khi xác minh thương hiệu. Chuyển OAuth consent screen sang "In production" (Testing giới hạn 100 người dùng thử).
- Riêng theo tài khoản: deck, mục, lịch ôn, nhật ký, cài đặt, chuỗi ngày, thành tích. Dùng chung: kho audio, tra từ điển, gợi ý nghĩa.

| Việc | Dịch vụ | Hạn mức miễn phí | Điều cần biết |
|---|---|---|---|
| Đăng nhập | Supabase Auth + Google OAuth | 50.000 MAU | OAuth client của Google không tính phí |
| Database | Supabase Postgres | 500 MB | Tạm dừng nếu ít hoạt động 7 ngày; khôi phục được trong 1 năm |
| File audio | Supabase Storage | 1 GB, file ≤ 50 MB, 5 GB tải ra/tháng | |
| Chạy web | Vercel Hobby (Next.js + Go) | 1 triệu lượt gọi hàm, 100 GB truyền tải/tháng | Chỉ dùng cá nhân, phi thương mại; Go runtime và Services đang Beta |
| Giọng đọc | Deepgram Aura-2 | 200 USD một lần, không hết hạn, không cần thẻ (~6,6 triệu ký tự) | Không tự nạp lại |
| Giọng đọc dự phòng | Kokoro trong trình duyệt | Không giới hạn | Model 86–92 MB |
| Gợi ý nghĩa | MyMemory | 5.000 ký tự/ngày theo IP, không key | Gọi từ trình duyệt |
| Từ điển | Free Dictionary API | Không cần key | Nên cache |
| Lịch ôn | go-fsrs v4 (FSRS-6) | MIT | |

Giữ trong hạn mức: giới hạn mỗi tài khoản 5.000 mục và 200 mục mới/ngày; audio mp3 nén (ước lượng 10–15 KB/mục cho hai giọng, cần đo lại); kho audio/từ điển/gợi ý dùng chung; giọng thứ hai chỉ sinh khi có người bấm nghe; tác vụ hẹn giờ miễn phí truy vấn database mỗi ngày để Supabase không tạm dừng; nếu thu phí thì phải rời Vercel Hobby.

## 11. Trang quản trị

Trang `/admin` chỉ mở cho tài khoản quản trị (lúc đầu chỉ Galvin). Dùng để giữ app trong hạn mức miễn phí và xử lý tài khoản lạm dụng khi đăng ký mở, không phải vào dashboard Supabase/Deepgram. Admin chỉ thấy số đếm của từng tài khoản, không xem hay sửa thẻ và lịch ôn của người khác.

**Ai là admin:** bảng `admins` chỉ server ghi, người dùng không tự cấp quyền được; admin đầu tiên thêm bằng một câu SQL chạy một lần trong Supabase, sau đó cấp/bỏ quyền trong trang Tài khoản; giao diện ẩn `/admin` với người thường, nhưng quyền thật được kiểm ở API Go (middleware cho `/api/admin/*` tra bảng `admins`); thao tác vượt RLS dùng khóa quản trị Supabase, chỉ ở backend Go sau bước kiểm tra; mọi thao tác ghi vào `admin_audit_log`.

| Màn hình | Có gì | Bản |
|---|---|---|
| Tổng quan | Số tài khoản, người học trong 7 ngày, đăng ký mới hôm nay; thanh hạn mức: tín dụng Deepgram còn lại, database/500 MB, Storage/1 GB; nhà cung cấp audio đang dùng | v1 |
| Tài khoản | Tìm theo email/tên: ngày tạo, lần học gần nhất, số mục, số mục mới hôm nay, trạng thái. Duyệt, khóa/mở khóa, hạn mức riêng, cấp/bỏ admin, xóa tài khoản kèm dữ liệu (gõ lại email để xác nhận) | v1 |
| Cài đặt hệ thống | Chế độ đăng ký, mã mời, hạn mức mặc định (5.000 mục, 200 mục mới/ngày), ngưỡng chuyển Kokoro (6 triệu ký tự), nút ép dùng Kokoro ngay | v1 |
| Kho audio | Tìm theo nội dung, nghe UK/US, xóa file đọc sai để sinh lại; thống kê theo nhà cung cấp | v2 |
| Cache từ điển và gợi ý nghĩa | Tìm và xóa mục sai trong `dict_cache`, `translation_cache` | v2 |
| Nhật ký | Thao tác admin gần đây, lọc theo admin và tài khoản bị tác động | v2 |

**Chế độ đăng ký** (`profiles.status`): Mở (mặc định, dùng ngay) · Cần mã mời (chờ đến khi nhập mã; mã có số lượt và hạn) · Đóng (chờ admin duyệt). Tài khoản chưa kích hoạt chỉ thấy màn hình chờ; RLS chặn ghi.

**Khóa/xóa:** backend Go gọi REST API quản trị của Supabase Auth với tham số `ban_duration` (cùng tham số hàm `updateUserById` của thư viện JS dùng) — khóa lâu dài `'876000h'`, mở khóa `'none'`; khi khóa còn đặt `profiles.status = banned`, middleware của API Go từ chối mọi request của tài khoản không `active` (token cũ có thể còn hạn); khóa không xóa dữ liệu; xóa tài khoản xóa người dùng trong Supabase Auth, các dòng có `user_id` tự xóa theo.

**Số liệu:** tín dụng Deepgram qua `GET /v1/projects/{project_id}/balances` (không đọc được thì hiện số ký tự từ `tts_usage`); database qua hàm SQL bọc `pg_database_size(current_database())`, chỉ admin gọi; Storage = tổng kích thước trong `storage.objects` của bucket audio; tài khoản qua API quản trị của Supabase Auth ghép số đếm của app. Thanh hạn mức cam > 80%, đỏ > 95%.

## 12. Quyết định

**Đã chốt (12/11/2026):** đăng nhập chỉ Google · audio qua API Deepgram, hết tín dụng thì Kokoro · không dùng Google Cloud TTS · nghĩa tự nhập + icon gợi ý gọi MyMemory · backend Go + giao diện Next.js, cùng trên Vercel + Supabase · giọng mặc định US · 20 thẻ mới/ngày · có trang quản trị ở /admin, phần tối thiểu vào v1.

**Còn cần Galvin xác nhận:**
1. Đăng ký mặc định mở cho mọi tài khoản Google, không mã mời; admin có công tắc chuyển sang cần mã mời hoặc đóng – hiểu đúng chưa?
2. Tín dụng Deepgram là khoản tặng một lần; đồng ý dùng rồi chuyển sang Kokoro khi hết?
3. Tự chọn với thẻ chưa đến hạn: mặc định không đổi lịch ôn (chưa trả lời, giữ đề xuất).
4. Admin chỉ thấy số đếm, không xem thẻ người khác; chưa có bộ thẻ mẫu dùng chung – có cần admin tạo bộ thẻ mẫu (ví dụ 3.000 từ thông dụng) không?

## Nguồn (mở ngày 2026-11-12)

- Mochi: https://mochidemy.com/blog/mochimochi-tinh-nang/ · https://mochidemy.com/blog/mochimochi-hoat-dong-nhu-the-nao/ · https://mochidemy.com/blog/mochimochi-web/ · https://mochidemy.com/en/
- Quizlet: https://help.quizlet.com/hc/en-us/articles/360029977151-Creating-sets-by-importing-content · https://quizlet.com/blog/how-to-create-the-best-quizlet-sets
- Lịch ôn: https://pkg.go.dev/github.com/open-spaced-repetition/go-fsrs/v4 · https://docs.ankiweb.net/filtered-decks.html
- Audio: https://www.deepgram.com/pricing · https://developers.deepgram.com/docs/tts-models · https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX · https://cdn.jsdelivr.net/npm/msedge-tts@2.0.5/README.md · https://toolradar.com/guides/best-free-text-to-speech-tools · https://cloud.google.com/text-to-speech/pricing · https://api.dictionaryapi.dev/api/v2/entries/en/hello
- Gợi ý nghĩa: https://lilting.ch/en/articles/mymemory-api
- Đăng nhập và dịch vụ: https://developers.google.com/identity/protocols/oauth2/production-readiness/overview · https://supabase.com/pricing · https://supabase.com/docs/guides/platform/free-project-pausing · https://vercel.com/docs/plans/hobby
- Trang quản trị: https://supabase.com/docs/reference/javascript/auth-api-updateuserbyid · https://developers.deepgram.com/reference/manage/v-1/projects/balances/list
- Backend Go: https://vercel.com/docs/functions/runtimes/go · https://vercel.com/docs/services · https://supabase.com/docs/guides/auth/jwts · https://supabase.com/docs/guides/database/connecting/connecting-to-postgres
