package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"runtime/debug"
	"time"

	"flashcard/internal/apperr"
)

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// RequestID gắn X-Request-Id (giữ nguyên nếu client gửi lên) để lần theo log.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		// Chỉ nhận id an toàn để đưa vào header phản hồi và log; còn lại thì tự sinh.
		if !validRequestID.MatchString(id) {
			var b [8]byte
			_, _ = rand.Read(b[:])
			id = hex.EncodeToString(b[:])
		}
		w.Header().Set("X-Request-Id", id)
		next.ServeHTTP(w, r)
	})
}

// Recover biến panic thành 500 internal; chi tiết chỉ vào log, không ra client.
func Recover(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if v := recover(); v != nil {
					// ErrAbortHandler là cách chuẩn để huỷ response đang ghi dở: để net/http xử lý, không nuốt.
					if v == http.ErrAbortHandler {
						panic(v)
					}
					log.Error("panic in handler", "panic", v, "path", r.URL.Path, "stack", string(debug.Stack()))
					WriteError(w, apperr.Internal())
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// AccessLog ghi một dòng log cho mỗi request.
func AccessLog(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			log.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status,
				"ms", time.Since(start).Milliseconds(), "id", w.Header().Get("X-Request-Id"))
		})
	}
}
