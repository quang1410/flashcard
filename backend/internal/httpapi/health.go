package httpapi

import "net/http"

// healthz chỉ báo tiến trình còn sống: không đòi đăng nhập, không ping DB.
func healthz(w http.ResponseWriter, _ *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
