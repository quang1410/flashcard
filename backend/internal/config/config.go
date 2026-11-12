// Package config đọc biến môi trường vào một struct, báo lỗi rõ tên biến.
package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Config chứa cấu hình của backend. K-01 chưa nối DB nên DatabaseURL / SupabaseURL
// chỉ bắt buộc ở môi trường prod.
type Config struct {
	Port            string
	Env             string // dev | prod
	DatabaseURL     string
	SupabaseURL     string
	ShutdownTimeout time.Duration
}

// Load đọc cấu hình qua getenv (truyền os.Getenv ở main, truyền map ở test).
func Load(getenv func(string) string) (Config, error) {
	c := Config{
		Port:            getenv("PORT"),
		Env:             getenv("ENV"),
		DatabaseURL:     getenv("DATABASE_URL"),
		SupabaseURL:     getenv("SUPABASE_URL"),
		ShutdownTimeout: 10 * time.Second,
	}
	if c.Port == "" {
		c.Port = "8000"
	}
	// Chỉ chữ số: Atoi nhận cả "+80" nhưng net.Listen thì không.
	if n, err := strconv.Atoi(c.Port); err != nil || n < 1 || n > 65535 || strings.Trim(c.Port, "0123456789") != "" {
		return Config{}, fmt.Errorf("PORT must be a number between 1 and 65535, got %q", c.Port)
	}
	if c.Env == "" {
		c.Env = "dev"
	}
	if c.Env != "dev" && c.Env != "prod" {
		return Config{}, fmt.Errorf("ENV must be dev or prod, got %q", c.Env)
	}
	if c.Env == "prod" {
		if c.DatabaseURL == "" {
			return Config{}, fmt.Errorf("DATABASE_URL is required when ENV=prod")
		}
		if c.SupabaseURL == "" {
			return Config{}, fmt.Errorf("SUPABASE_URL is required when ENV=prod")
		}
	}
	return c, nil
}
