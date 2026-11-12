package config

import (
	"strings"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

func TestLoad(t *testing.T) {
	cases := []struct {
		name    string
		env     map[string]string
		wantErr string // rỗng = không lỗi
		check   func(t *testing.T, c Config)
	}{
		{
			name: "defaults in dev",
			env:  map[string]string{},
			check: func(t *testing.T, c Config) {
				if c.Port != "8000" {
					t.Errorf("Port = %q, want 8000", c.Port)
				}
				if c.Env != "dev" {
					t.Errorf("Env = %q, want dev", c.Env)
				}
			},
		},
		{
			name: "PORT empty falls back to 8000",
			env:  map[string]string{"PORT": ""},
			check: func(t *testing.T, c Config) {
				if c.Port != "8000" {
					t.Errorf("Port = %q", c.Port)
				}
			},
		},
		{
			name: "PORT is read",
			env:  map[string]string{"PORT": "9100"},
			check: func(t *testing.T, c Config) {
				if c.Port != "9100" {
					t.Errorf("Port = %q", c.Port)
				}
			},
		},
		{name: "PORT not a number", env: map[string]string{"PORT": "abc"}, wantErr: "PORT"},
		{name: "PORT out of range", env: map[string]string{"PORT": "70000"}, wantErr: "PORT"},
		{name: "PORT with a plus sign", env: map[string]string{"PORT": "+80"}, wantErr: "PORT"},
		{name: "PORT with spaces", env: map[string]string{"PORT": " 80"}, wantErr: "PORT"},
		{name: "ENV unknown value", env: map[string]string{"ENV": "staging2"}, wantErr: "ENV"},
		{
			name:    "prod requires DATABASE_URL",
			env:     map[string]string{"ENV": "prod", "SUPABASE_URL": "https://x.supabase.co"},
			wantErr: "DATABASE_URL",
		},
		{
			name:    "prod requires SUPABASE_URL",
			env:     map[string]string{"ENV": "prod", "DATABASE_URL": "postgres://x"},
			wantErr: "SUPABASE_URL",
		},
		{
			name: "prod with all required",
			env:  map[string]string{"ENV": "prod", "DATABASE_URL": "postgres://x", "SUPABASE_URL": "https://x.supabase.co"},
			check: func(t *testing.T, c Config) {
				if c.DatabaseURL != "postgres://x" || c.SupabaseURL != "https://x.supabase.co" {
					t.Errorf("unexpected config: %+v", c)
				}
			},
		},
		{
			name: "shutdown timeout has a default",
			env:  map[string]string{},
			check: func(t *testing.T, c Config) {
				if c.ShutdownTimeout != 10*time.Second {
					t.Errorf("ShutdownTimeout = %v", c.ShutdownTimeout)
				}
			},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := Load(env(c.env))
			if c.wantErr != "" {
				if err == nil {
					t.Fatalf("want error mentioning %q, got nil", c.wantErr)
				}
				if !strings.Contains(err.Error(), c.wantErr) {
					t.Fatalf("error %q does not name %q", err, c.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if c.check != nil {
				c.check(t, got)
			}
		})
	}
}
