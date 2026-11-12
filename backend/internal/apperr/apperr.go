// Package apperr định nghĩa lỗi nghiệp vụ trả về client: một mã `Code` (tiếng Anh, để máy đọc)
// và một `Msg` (tiếng Việt, hiện nguyên văn cho người dùng).
package apperr

import (
	"errors"
	"net/http"
)

// Error là lỗi có thể trả thẳng ra HTTP.
type Error struct {
	Code   string
	Msg    string
	Status int
}

func (e *Error) Error() string { return e.Code + ": " + e.Msg }

func Validation(msg string) *Error   { return &Error{"validation", msg, http.StatusBadRequest} }
func Unauthorized(msg string) *Error { return &Error{"unauthorized", msg, http.StatusUnauthorized} }
func Forbidden(msg string) *Error    { return &Error{"forbidden", msg, http.StatusForbidden} }
func NotFound(msg string) *Error     { return &Error{"not_found", msg, http.StatusNotFound} }
func Conflict(msg string) *Error     { return &Error{"conflict", msg, http.StatusConflict} }
func MethodNotAllowed(msg string) *Error {
	return &Error{"method_not_allowed", msg, http.StatusMethodNotAllowed}
}
func Limit(msg string) *Error { return &Error{"limit", msg, http.StatusTooManyRequests} }

// Internal là lỗi chung cho mọi thứ không lường trước. Msg cố ý không nói gì về nguyên nhân.
func Internal() *Error {
	return &Error{"internal", "Có lỗi xảy ra, bạn thử lại sau nhé.", http.StatusInternalServerError}
}

// From đổi một error bất kỳ thành *Error: apperr (kể cả bị bọc) giữ nguyên, còn lại thành Internal.
// nil vào thì nil ra.
func From(err error) *Error {
	if err == nil {
		return nil
	}
	if ae, ok := errors.AsType[*Error](err); ok {
		return ae
	}
	return Internal()
}
