package httpapi

import (
	"encoding/json"
	"net/http"

	"flashcard/internal/apperr"
)

// WriteJSON ghi body JSON với status cho trước.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

type errorBody struct {
	Error string `json:"error"`
	Msg   string `json:"msg"`
}

// WriteError ghi lỗi dạng {"error","msg"}. Lỗi không phải apperr thành 500 internal,
// không lộ chi tiết.
func WriteError(w http.ResponseWriter, err error) {
	ae := apperr.From(err)
	WriteJSON(w, ae.Status, errorBody{Error: ae.Code, Msg: ae.Msg})
}
