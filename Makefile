.PHONY: test test-pure test-fe lint tidy api web db-up db-down db-reset migrate e2e

# Toàn bộ test Go. Từ K-02 trở đi lệnh này CẦN Docker (repository/httpapi chạy trên Postgres thật qua testcontainers).
# Không có Docker thì dùng `make test-pure`.
test:
	cd backend && go test ./... -count=1 -timeout 300s

# Test Go không cần Docker: -short bỏ qua các test dùng Postgres. Phải chạy nhanh và KHÔNG cần Docker —
# nếu lệnh này bắt đầu cần Postgres thì ranh giới package đã bị phá.
# K-01: chạy cả backend/ (config, apperr, httpapi, guard import). K-04 sẽ thu hẹp lại thành
# bốn package thuần listparse, answer, srs, quiz như CLAUDE.md quy tắc 3.
test-pure:
	cd backend && go test -short ./... -count=1

# lint: gofmt + vet. Cố ý không thêm golangci-lint để khỏi thêm phụ thuộc.
lint:
	@cd backend && test -z "$$(gofmt -l .)" || (echo "gofmt: these files are not formatted:"; gofmt -l .; exit 1)
	cd backend && go vet ./...

tidy:
	cd backend && go mod tidy

# Node của frontend, ghim ở .nvmrc. Cổng chặn này không phải hình thức: Node cũ thiếu hàm Intl và API
# mà test dùng, lỗi sẽ khó hiểu hơn nhiều so với một dòng báo rõ.
NODE_MAJOR := $(shell node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)

# Toàn bộ kiểm tra frontend. Không cần Docker.
test-fe:
	@test "$(NODE_MAJOR)" -ge 20 || { \
		echo "Node >= 20 is required (see .nvmrc), found $$(node -v 2>/dev/null || echo 'no node')"; \
		echo "run: nvm use"; exit 1; }
	cd frontend && npx tsc --noEmit && npm run test && npm run build

# Chạy API Go ở cổng 8000 (PORT đổi được). Cổng bận thì báo lỗi, không tự đổi cổng.
api:
	cd backend && go run ./cmd/api

# Chạy Vite ở cổng 5173, proxy /api và /healthz sang 8000.
web:
	cd frontend && npm run dev

# Postgres 17 thường trong Docker, cổng 54322 (docker-compose.yml). Lần đầu tạo volume sẽ chạy
# docker/initdb/00-supabase-shim.sql (role + auth.users + auth.uid() giả lập Supabase). Cần Docker.
db-up:
	docker compose up -d --wait db

db-down:
	docker compose down

# Xoá cả dữ liệu local và dựng lại từ đầu (cũng chạy lại shim). Dùng khi đổi shim hoặc muốn DB sạch.
db-reset:
	docker compose down -v
	docker compose up -d --wait db

# Chạy migration vào Postgres local bằng golang-migrate (cùng công cụ khi deploy lên Supabase).
# K-01 chưa có migration nên thoát sạch; K-02 thêm file SQL và kiểm lệnh này.
# Một lệnh shell duy nhất: `exit 0` ở một dòng riêng chỉ thoát dòng đó, dòng sau vẫn chạy.
migrate:
	@if ls backend/migrations/*.up.sql >/dev/null 2>&1; then \
		docker compose --profile tools run --rm migrate; \
	else \
		echo "no migrations yet (K-02)"; \
	fi

# Khung: kịch bản Playwright thật làm ở K-09.
e2e:
	@echo "no e2e yet (K-09)"
