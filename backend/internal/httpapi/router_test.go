package httpapi

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"flashcard/internal/apperr"
)

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()
	return NewRouter(Deps{Logger: slog.New(slog.NewTextHandler(io.Discard, nil))})
}

func do(h http.Handler, method, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
	return rec
}

func TestHealthz(t *testing.T) {
	rec := do(newTestRouter(t), http.MethodGet, "/healthz")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q", ct)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"status":"ok"}` {
		t.Errorf("body = %s", got)
	}
}

func TestHealthzNeedsNoAuthHeader(t *testing.T) {
	// /healthz chỉ báo tiến trình sống, không đòi đăng nhập, không ping DB.
	rec := do(newTestRouter(t), http.MethodGet, "/healthz")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestUnknownRouteIsJSON404(t *testing.T) {
	rec := do(newTestRouter(t), http.MethodGet, "/does-not-exist")
	assertErrorBody(t, rec, http.StatusNotFound, "not_found")
}

func TestWrongMethodIsJSON405(t *testing.T) {
	rec := do(newTestRouter(t), http.MethodPost, "/healthz")
	assertErrorBody(t, rec, http.StatusMethodNotAllowed, "method_not_allowed")
}

func assertErrorBody(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if rec.Code != status {
		t.Fatalf("status = %d, want %d", rec.Code, status)
	}
	var body struct {
		Error string `json:"error"`
		Msg   string `json:"msg"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body is not JSON: %v (%s)", err, rec.Body.String())
	}
	if body.Error != code {
		t.Errorf("error = %q, want %q", body.Error, code)
	}
	if body.Msg == "" {
		t.Error("msg must not be empty")
	}
}

func TestWriteErrorMapsAppErr(t *testing.T) {
	cases := []struct {
		name   string
		err    error
		status int
		code   string
	}{
		{"validation", apperr.Validation("Sai dữ liệu"), 400, "validation"},
		{"conflict", apperr.Conflict("Đã có"), 409, "conflict"},
		{"limit", apperr.Limit("Hết hạn mức"), 429, "limit"},
		{"unknown error", io.ErrUnexpectedEOF, 500, "internal"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			WriteError(rec, c.err)
			assertErrorBody(t, rec, c.status, c.code)
		})
	}
}

func TestWriteErrorDoesNotLeakInternalDetail(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, io.ErrUnexpectedEOF)
	if strings.Contains(rec.Body.String(), "EOF") {
		t.Errorf("body leaks internal error: %s", rec.Body.String())
	}
}

func TestRecoverTurnsPanicInto500(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	h := Recover(logger)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	assertErrorBody(t, rec, http.StatusInternalServerError, "internal")
	if strings.Contains(rec.Body.String(), "boom") {
		t.Errorf("body leaks panic value: %s", rec.Body.String())
	}
	if !strings.Contains(logs.String(), "boom") {
		t.Errorf("panic must be logged, got %q", logs.String())
	}
}

func TestServerSurvivesPanic(t *testing.T) {
	h := Recover(slog.New(slog.NewTextHandler(io.Discard, nil)))(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/panic" {
			panic("boom")
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	srv := httptest.NewServer(h)
	defer srv.Close()
	for _, p := range []string{"/panic", "/ok"} {
		res, err := http.Get(srv.URL + p)
		if err != nil {
			t.Fatalf("GET %s: %v (server died?)", p, err)
		}
		res.Body.Close()
	}
}

func TestRequestIDKeepsAValidClientID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	req.Header.Set("X-Request-Id", "abc-123_DEF")
	rec := httptest.NewRecorder()
	newTestRouter(t).ServeHTTP(rec, req)
	if got := rec.Header().Get("X-Request-Id"); got != "abc-123_DEF" {
		t.Errorf("X-Request-Id = %q, want the client value kept", got)
	}
}

func TestRequestIDReplacesUnsafeClientID(t *testing.T) {
	for _, bad := range []string{"has space", "semi;colon", "quote\"x", "<script>", strings.Repeat("a", 65), "tiếng-việt"} {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.Header.Set("X-Request-Id", bad)
		rec := httptest.NewRecorder()
		newTestRouter(t).ServeHTTP(rec, req)
		got := rec.Header().Get("X-Request-Id")
		if got == bad || got == "" {
			t.Errorf("client id %q was echoed or dropped: got %q", bad, got)
		}
	}
}

// http.ErrAbortHandler là cách chuẩn để huỷ một response đang ghi dở: Recover không được nuốt nó.
func TestRecoverRepanicsErrAbortHandler(t *testing.T) {
	h := Recover(slog.New(slog.NewTextHandler(io.Discard, nil)))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(http.ErrAbortHandler)
	}))
	defer func() {
		if r := recover(); r != http.ErrAbortHandler {
			t.Fatalf("recovered %v, want http.ErrAbortHandler re-panicked", r)
		}
	}()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	t.Fatal("expected a panic")
}

func TestRequestIDIsSetAndEchoed(t *testing.T) {
	rec := do(newTestRouter(t), http.MethodGet, "/healthz")
	if rec.Header().Get("X-Request-Id") == "" {
		t.Error("X-Request-Id header missing")
	}
}
