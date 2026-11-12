// Package puregate chỉ chứa test: canh ranh giới "package thuần" của CLAUDE.md quy tắc 3.
package puregate

import (
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Các package thuần phải chạy được không cần DB, mạng, context.
var purePackages = []string{"listparse", "answer", "srs", "quiz"}

func banned(path string) bool {
	switch {
	case path == "net/http", path == "database/sql", path == "context":
		return true
	case strings.HasPrefix(path, "gorm.io/"):
		return true
	}
	return false
}

// checkDir trả về danh sách vi phạm "file: import" trong dir (kể cả file _test.go).
func checkDir(t *testing.T, dir string) []string {
	t.Helper()
	var bad []string
	err := filepath.WalkDir(dir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(p, ".go") {
			return err
		}
		f, perr := parser.ParseFile(token.NewFileSet(), p, nil, parser.ImportsOnly)
		if perr != nil {
			return perr
		}
		for _, imp := range f.Imports {
			path := strings.Trim(imp.Path.Value, `"`)
			if banned(path) {
				bad = append(bad, p+": "+path)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk %s: %v", dir, err)
	}
	return bad
}

func TestPurePackagesImports(t *testing.T) {
	checked := 0
	for _, name := range purePackages {
		dir := filepath.Join("..", name)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}
		checked++
		if bad := checkDir(t, dir); len(bad) > 0 {
			t.Errorf("package %q imports a banned package:\n  %s", name, strings.Join(bad, "\n  "))
		}
	}
	if checked == 0 {
		// Không được "xanh giả": test này báo SKIP chứ không PASS khi chưa có gì để kiểm.
		// K-04 tạo các package này; từ đó test phải chạy thật (kanban K-04 ghi điều kiện này).
		t.Skip("no pure package exists yet, nothing to check (activated in K-04)")
	}
}

// Chứng minh guard bắt được vi phạm: dựng một package giả có import cấm.
func TestGuardDetectsBannedImport(t *testing.T) {
	dir := t.TempDir()
	src := "package x\n\nimport (\n\t\"context\"\n\t\"gorm.io/gorm\"\n)\n\nvar _ context.Context\nvar _ gorm.DB\n"
	if err := os.WriteFile(filepath.Join(dir, "x.go"), []byte(src), 0o600); err != nil {
		t.Fatal(err)
	}
	if bad := checkDir(t, dir); len(bad) != 2 {
		t.Fatalf("want 2 violations (context, gorm.io/gorm), got %v", bad)
	}
}

func TestGuardAllowsCleanPackage(t *testing.T) {
	dir := t.TempDir()
	src := "package x\n\nimport (\n\t\"strings\"\n\t\"time\"\n)\n\nvar _ = strings.ToLower\nvar _ time.Time\n"
	if err := os.WriteFile(filepath.Join(dir, "x.go"), []byte(src), 0o600); err != nil {
		t.Fatal(err)
	}
	if bad := checkDir(t, dir); len(bad) != 0 {
		t.Fatalf("clean package flagged: %v", bad)
	}
}
