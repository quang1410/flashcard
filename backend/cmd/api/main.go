package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	// tzdata nhúng cơ sở dữ liệu múi giờ vào binary. Ảnh distroless / Vercel không có
	// /usr/share/zoneinfo, thiếu dòng này thì time.LoadLocation("Asia/Ho_Chi_Minh") lỗi
	// và mọi phép tính "hôm nay" theo múi giờ người dùng sẽ hỏng (CLAUDE.md quy tắc 4).
	_ "time/tzdata"

	"flashcard/internal/config"
	"flashcard/internal/httpapi"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		log.Error("invalid configuration", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Handler:           httpapi.NewRouter(httpapi.Deps{Logger: log}),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Cổng bận thì lỗi ngay ở đây, không tự đổi cổng.
	ln, err := net.Listen("tcp", ":"+cfg.Port)
	if err != nil {
		log.Error("cannot listen", "port", cfg.Port, "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Info("api listening", "port", cfg.Port, "env", cfg.Env)
	if err := serve(ctx, srv, ln, cfg.ShutdownTimeout); err != nil {
		log.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

// serve chạy srv trên ln tới khi ctx bị huỷ, rồi tắt êm: ngừng nhận kết nối mới và ĐỢI các request
// đang chạy làm xong (tối đa timeout). Phải đợi Serve trả về: ngay khi Shutdown bắt đầu, Serve đã trả
// ErrServerClosed, nếu main thoát lúc đó thì các request đang dở bị cắt.
func serve(ctx context.Context, srv *http.Server, ln net.Listener, timeout time.Duration) error {
	errc := make(chan error, 1)
	go func() { errc <- srv.Serve(ln) }()

	select {
	case err := <-errc:
		return err // listener hỏng, không phải do ta dừng
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-errc; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
