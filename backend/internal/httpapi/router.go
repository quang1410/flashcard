// Package httpapi chứa handler, DTO và middleware. Nghiệp vụ nằm ở service (từ K-02).
package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"flashcard/internal/apperr"
)

// Deps là những thứ router cần. Các ticket sau thêm service vào đây.
type Deps struct {
	Logger *slog.Logger
}

// NewRouter dựng router chi. Vercel đưa /api/* và /healthz sang service này.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(RequestID, Recover(d.Logger), AccessLog(d.Logger))

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		WriteError(w, apperr.NotFound("Không tìm thấy đường dẫn này."))
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		WriteError(w, apperr.MethodNotAllowed("Phương thức này không được hỗ trợ."))
	})

	r.Get("/healthz", healthz)
	return r
}
