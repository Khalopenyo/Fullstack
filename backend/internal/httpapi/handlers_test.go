package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/go-chi/chi/v5"
	"parfum-backend/internal/app"
)

func TestRequireAdminRejectsNonAdmin(t *testing.T) {
	s := NewServer(app.Config{JWTSecret: "test-secret"}, nil)
	token, err := s.issueToken(authUser{ID: "u1", IsAdmin: false}, time.Minute)
	if err != nil {
		t.Fatalf("token: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler := s.requireAdmin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, rr.Code)
	}
}

func TestHandleSetUserAdminRejectsSelfDemote(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	s := NewServer(app.Config{JWTSecret: "test-secret"}, db)
	body := bytes.NewBufferString(`{"isAdmin": false}`)
	req := httptest.NewRequest(http.MethodPut, "/api/users/u1/admin", body)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("id", "u1")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	req = req.WithContext(withAuthUser(req.Context(), authUser{ID: "u1", IsAdmin: true}))
	rr := httptest.NewRecorder()

	s.handleSetUserAdmin(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, rr.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected db calls: %v", err)
	}
}

func TestHandleSetUserAdminRejectsLastAdmin(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	s := NewServer(app.Config{JWTSecret: "test-secret"}, db)
	body := bytes.NewBufferString(`{"isAdmin": false}`)
	req := httptest.NewRequest(http.MethodPut, "/api/users/u2/admin", body)
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("id", "u2")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
	req = req.WithContext(withAuthUser(req.Context(), authUser{ID: "u1", IsAdmin: true}))
	rr := httptest.NewRecorder()

	mock.ExpectQuery("SELECT is_admin FROM users WHERE id=\\$1").
		WithArgs("u2").
		WillReturnRows(sqlmock.NewRows([]string{"is_admin"}).AddRow(true))
	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users WHERE is_admin = true AND id <> \\$1").
		WithArgs("u2").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	s.handleSetUserAdmin(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected %d, got %d", http.StatusForbidden, rr.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("db expectations: %v", err)
	}
}

func TestHandleListUsers(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	s := NewServer(app.Config{JWTSecret: "test-secret"}, db)
	rows := sqlmock.NewRows([]string{"id", "email", "display_name", "is_admin", "is_anonymous", "created_at", "updated_at"}).
		AddRow("u1", "a@example.com", "Alice", false, false, time.Now(), time.Now())
	mock.ExpectQuery("(?s)SELECT id, email, display_name, is_admin, is_anonymous, created_at, updated_at FROM users.*is_anonymous = false").
		WillReturnRows(rows)

	req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
	rr := httptest.NewRecorder()
	s.handleListUsers(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d", http.StatusOK, rr.Code)
	}

	var out []User
	if err := json.NewDecoder(rr.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) != 1 || out[0].ID != "u1" {
		t.Fatalf("unexpected response: %#v", out)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("db expectations: %v", err)
	}
}

func TestHandleCreateOrderGuest(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	s := NewServer(app.Config{JWTSecret: "test-secret"}, db)
	reqBody := createOrderRequest{
		Items:    []OrderItem{{ID: "p1", Qty: 2}},
		Total:    100,
		Currency: "₽",
		Channel:  "wa",
		Contact: struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		}{
			Name:  "Гость",
			Phone: "+79990001122",
		},
		Delivery: struct {
			Method  string `json:"method"`
			Address string `json:"address"`
		}{Method: "pickup"},
	}
	payload, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/orders", bytes.NewReader(payload))
	req = req.WithContext(withAuthUser(context.Background(), authUser{ID: "guest_1", IsAnonymous: true}))
	rr := httptest.NewRecorder()

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT base_price, currency FROM perfumes WHERE id=\\$1").
		WithArgs("p1").
		WillReturnRows(sqlmock.NewRows([]string{"base_price", "currency"}).AddRow(50.0, "₽"))
	mock.ExpectQuery("(?s)INSERT INTO orders").
		WithArgs(nil, true, "", "Гость", "+79990001122", sqlmock.AnyArg(), 100.0, "₽", "wa", "pickup", "").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("order1"))
	mock.ExpectExec("(?s)UPDATE perfumes SET order_count").
		WithArgs(2, "p1").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	s.handleCreateOrder(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d", http.StatusCreated, rr.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("db expectations: %v", err)
	}
}
