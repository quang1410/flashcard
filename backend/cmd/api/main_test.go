package main

import (
	"go/parser"
	"go/token"
	"testing"
)

// Quy tắc 4: main.go phải import blank time/tzdata. Ảnh distroless và Vercel không có
// zoneinfo hệ thống, thiếu dòng này thì time.LoadLocation("Asia/Ho_Chi_Minh") lỗi.
func TestMainImportsTzdata(t *testing.T) {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "main.go", nil, parser.ImportsOnly)
	if err != nil {
		t.Fatalf("parse main.go: %v", err)
	}
	for _, imp := range f.Imports {
		if imp.Path.Value == `"time/tzdata"` {
			if imp.Name == nil || imp.Name.Name != "_" {
				t.Fatalf(`time/tzdata must be a blank import (_ "time/tzdata")`)
			}
			return
		}
	}
	t.Fatal(`main.go does not import _ "time/tzdata" (CLAUDE.md rule 4)`)
}
