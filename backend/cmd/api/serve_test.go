package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"testing"
	"time"
)

func listen(t *testing.T) net.Listener {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	return ln
}

// Tắt êm: khi nhận tín hiệu dừng, request đang chạy phải được làm xong rồi serve mới trả về.
func TestServeDrainsInFlightRequests(t *testing.T) {
	ln := listen(t)
	srv := &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(300 * time.Millisecond)
		_, _ = io.WriteString(w, "done")
	})}

	ctx, cancel := context.WithCancel(context.Background())
	served := make(chan error, 1)
	go func() { served <- serve(ctx, srv, ln, 5*time.Second) }()

	type result struct {
		body string
		err  error
	}
	got := make(chan result, 1)
	go func() {
		res, err := http.Get("http://" + ln.Addr().String() + "/")
		if err != nil {
			got <- result{err: err}
			return
		}
		defer res.Body.Close()
		b, err := io.ReadAll(res.Body)
		got <- result{body: string(b), err: err}
	}()

	time.Sleep(60 * time.Millisecond) // để request vào handler rồi mới dừng
	start := time.Now()
	cancel()

	select {
	case err := <-served:
		if err != nil {
			t.Fatalf("serve returned %v, want nil after a clean shutdown", err)
		}
		if time.Since(start) < 150*time.Millisecond {
			t.Fatalf("serve returned after %v: it did not wait for the in-flight request", time.Since(start))
		}
	case <-time.After(5 * time.Second):
		t.Fatal("serve did not return")
	}

	r := <-got
	if r.err != nil || r.body != "done" {
		t.Fatalf("in-flight request was cut: body=%q err=%v", r.body, r.err)
	}
}

func TestServeReturnsNilWhenIdle(t *testing.T) {
	ln := listen(t)
	ctx, cancel := context.WithCancel(context.Background())
	served := make(chan error, 1)
	go func() { served <- serve(ctx, &http.Server{Handler: http.NotFoundHandler()}, ln, time.Second) }()
	time.Sleep(30 * time.Millisecond)
	cancel()
	select {
	case err := <-served:
		if err != nil {
			t.Fatalf("serve = %v, want nil", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("serve did not return")
	}
}

func TestServeReportsListenerFailure(t *testing.T) {
	ln := listen(t)
	_ = ln.Close() // listener hỏng: Serve phải trả lỗi, không treo
	err := serve(context.Background(), &http.Server{Handler: http.NotFoundHandler()}, ln, time.Second)
	if err == nil {
		t.Fatal("want an error from a closed listener")
	}
}
