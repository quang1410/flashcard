package apperr

import (
	"errors"
	"fmt"
	"net/http"
	"testing"
)

func TestConstructors(t *testing.T) {
	cases := []struct {
		name   string
		err    *Error
		code   string
		status int
	}{
		{"validation", Validation("Thiếu term"), "validation", http.StatusBadRequest},
		{"unauthorized", Unauthorized("Chưa đăng nhập"), "unauthorized", http.StatusUnauthorized},
		{"forbidden", Forbidden("Không có quyền"), "forbidden", http.StatusForbidden},
		{"not_found", NotFound("Không tìm thấy"), "not_found", http.StatusNotFound},
		{"method_not_allowed", MethodNotAllowed("Sai phương thức"), "method_not_allowed", http.StatusMethodNotAllowed},
		{"conflict", Conflict("Đã có mục này"), "conflict", http.StatusConflict},
		{"limit", Limit("Hết hạn mức"), "limit", http.StatusTooManyRequests},
		{"internal", Internal(), "internal", http.StatusInternalServerError},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if c.err.Code != c.code {
				t.Errorf("code = %q, want %q", c.err.Code, c.code)
			}
			if c.err.Status != c.status {
				t.Errorf("status = %d, want %d", c.err.Status, c.status)
			}
			if c.err.Msg == "" {
				t.Error("msg must not be empty")
			}
		})
	}
}

func TestFrom(t *testing.T) {
	known := Conflict("Đã có")
	cases := []struct {
		name string
		in   error
		want *Error
	}{
		{"nil stays nil", nil, nil},
		{"apperr passes through", known, known},
		{"wrapped apperr is unwrapped", fmt.Errorf("ctx: %w", known), known},
		{"unknown error becomes internal", errors.New("pq: connection refused"), Internal()},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := From(c.in)
			if c.want == nil {
				if got != nil {
					t.Fatalf("From(nil) = %v, want nil", got)
				}
				return
			}
			if got.Code != c.want.Code || got.Status != c.want.Status || got.Msg != c.want.Msg {
				t.Errorf("From() = %+v, want %+v", got, c.want)
			}
		})
	}
}

// Lỗi lạ không được lộ chi tiết nội bộ qua msg.
func TestFromUnknownDoesNotLeakDetail(t *testing.T) {
	got := From(errors.New("pq: password authentication failed for user postgres"))
	if got.Msg == "" || containsAny(got.Msg, "pq:", "password", "postgres") {
		t.Errorf("msg leaks internal detail: %q", got.Msg)
	}
}

func containsAny(s string, subs ...string) bool {
	for _, sub := range subs {
		for i := 0; i+len(sub) <= len(s); i++ {
			if s[i:i+len(sub)] == sub {
				return true
			}
		}
	}
	return false
}
