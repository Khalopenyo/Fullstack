package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"log"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type perfumePayload struct {
	ID                 string   `json:"id"`
	CatalogMode        string   `json:"catalogMode"`
	Brand              string   `json:"brand"`
	Name               string   `json:"name"`
	Family             string   `json:"family"`
	Description        string   `json:"description"`
	Tags               []string `json:"tags"`
	Notes              struct {
		Top   []string `json:"top"`
		Heart []string `json:"heart"`
		Base  []string `json:"base"`
	} `json:"notes"`
	Seasons            []string `json:"seasons"`
	DayNight           []string `json:"dayNight"`
	BasePrice          float64  `json:"basePrice"`
	BaseVolume         int      `json:"baseVolume"`
	Price              float64  `json:"price"`
	Volume             int      `json:"volume"`
	Sillage            int      `json:"sillage"`
	Longevity          int      `json:"longevity"`
	Image              string   `json:"image"`
	SearchNameRu       string   `json:"searchNameRu"`
	IsHit              bool     `json:"isHit"`
	OrderCount         int      `json:"orderCount"`
	InStock            bool     `json:"inStock"`
	Currency           string   `json:"currency"`
	Popularity         int      `json:"popularity"`
	PopularityMonth    int      `json:"popularityMonth"`
	PopularityMonthKey string   `json:"popularityMonthKey"`
	ReviewAvg          float64  `json:"reviewAvg"`
	ReviewCount        int      `json:"reviewCount"`
}

type reviewPayload struct {
	UID         string `json:"uid"`
	AuthorLabel string `json:"authorLabel"`
	Rating      int    `json:"rating"`
	Text        string `json:"text"`
	IsAnonymous bool   `json:"isAnonymous"`
}

type createOrderRequest struct {
	Items    []OrderItem `json:"items"`
	Total    float64     `json:"total"`
	Currency string      `json:"currency"`
	Channel  string      `json:"channel"`
	Delivery struct {
		Method  string `json:"method"`
		Address string `json:"address"`
	} `json:"delivery"`
}

type cartPayload struct {
	Items []OrderItem `json:"items"`
}

type reviewSummary struct {
	Avg   float64 `json:"avg"`
	Count int     `json:"count"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "invalid email")
		return
	}
	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password too short")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot hash password")
		return
	}

	var user User
	err = s.db.QueryRow(`
		INSERT INTO users (email, password_hash, display_name, is_admin, is_anonymous, created_at, updated_at)
		VALUES ($1, $2, $3, false, false, now(), now())
		RETURNING id, email, display_name, is_admin, is_anonymous, created_at, updated_at
	`, email, string(hash), strings.TrimSpace(req.DisplayName)).Scan(
		&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot create user")
		return
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 7*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}

	writeJSON(w, http.StatusCreated, AuthResponse{Token: token, User: user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "missing credentials")
		return
	}

	var storedHash string
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, display_name, is_admin, is_anonymous, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1 AND is_anonymous = false
	`, email).Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous, &storedHash, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 7*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleGuest(w http.ResponseWriter, r *http.Request) {
	var user User
	err := s.db.QueryRow(`
		INSERT INTO users (email, password_hash, display_name, is_admin, is_anonymous, created_at, updated_at)
		VALUES (NULL, NULL, $1, false, true, now(), now())
		RETURNING id, email, display_name, is_admin, is_anonymous, created_at, updated_at
	`, "Гость").Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create guest")
		return
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 7*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var user User
	err := s.db.QueryRow(`
		SELECT id, email, display_name, is_admin, is_anonymous, created_at, updated_at
		FROM users
		WHERE id = $1
	`, userCtx.ID).Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleListPerfumes(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	if mode == "" {
		mode = "retail"
	}
	rows, err := s.db.Query(`
		SELECT id, catalog_mode, brand, name, family, description,
		       to_json(tags), to_json(notes_top), to_json(notes_heart), to_json(notes_base),
		       to_json(seasons), to_json(day_night), base_price, base_volume, sillage, longevity,
		       image_url, search_name_ru, is_hit, order_count, in_stock, currency,
		       popularity, popularity_month, popularity_month_key,
		       COALESCE(review_avg, 0), COALESCE(review_count, 0), created_at, updated_at
		FROM perfumes
		WHERE catalog_mode = $1
		ORDER BY updated_at DESC NULLS LAST, id
	`, mode)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load perfumes")
		return
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var (
			p perfumePayload
			tagsJSON []byte
			notesTopJSON []byte
			notesHeartJSON []byte
			notesBaseJSON []byte
			seasonsJSON []byte
			dayNightJSON []byte
			createdAt time.Time
			updatedAt sql.NullTime
		)
		if err := rows.Scan(
			&p.ID, &p.CatalogMode, &p.Brand, &p.Name, &p.Family, &p.Description,
			&tagsJSON, &notesTopJSON, &notesHeartJSON, &notesBaseJSON,
			&seasonsJSON, &dayNightJSON, &p.BasePrice, &p.BaseVolume, &p.Sillage, &p.Longevity,
			&p.Image, &p.SearchNameRu, &p.IsHit, &p.OrderCount, &p.InStock, &p.Currency,
			&p.Popularity, &p.PopularityMonth, &p.PopularityMonthKey, &p.ReviewAvg, &p.ReviewCount, &createdAt, &updatedAt,
		); err != nil {
			log.Printf("scan perfumes: %v", err)
			writeError(w, http.StatusInternalServerError, "cannot parse perfumes")
			return
		}
		p.Tags = parseTextArrayJSON(tagsJSON)
		p.Notes.Top = parseTextArrayJSON(notesTopJSON)
		p.Notes.Heart = parseTextArrayJSON(notesHeartJSON)
		p.Notes.Base = parseTextArrayJSON(notesBaseJSON)
		p.Seasons = parseTextArrayJSON(seasonsJSON)
		p.DayNight = parseTextArrayJSON(dayNightJSON)
		payload := perfumeToResponse(p, createdAt, updatedAt)
		list = append(list, payload)
	}

	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleGetPerfume(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}

	var (
		p perfumePayload
		tagsJSON []byte
		notesTopJSON []byte
		notesHeartJSON []byte
		notesBaseJSON []byte
		seasonsJSON []byte
		dayNightJSON []byte
		createdAt time.Time
		updatedAt sql.NullTime
	)
	row := s.db.QueryRow(`
		SELECT id, catalog_mode, brand, name, family, description,
		       to_json(tags), to_json(notes_top), to_json(notes_heart), to_json(notes_base),
		       to_json(seasons), to_json(day_night), base_price, base_volume, sillage, longevity,
		       image_url, search_name_ru, is_hit, order_count, in_stock, currency,
		       popularity, popularity_month, popularity_month_key,
		       COALESCE(review_avg, 0), COALESCE(review_count, 0), created_at, updated_at
		FROM perfumes
		WHERE id = $1
	`, id)
	if err := row.Scan(
		&p.ID, &p.CatalogMode, &p.Brand, &p.Name, &p.Family, &p.Description,
		&tagsJSON, &notesTopJSON, &notesHeartJSON, &notesBaseJSON,
		&seasonsJSON, &dayNightJSON, &p.BasePrice, &p.BaseVolume, &p.Sillage, &p.Longevity,
		&p.Image, &p.SearchNameRu, &p.IsHit, &p.OrderCount, &p.InStock, &p.Currency,
		&p.Popularity, &p.PopularityMonth, &p.PopularityMonthKey, &p.ReviewAvg, &p.ReviewCount, &createdAt, &updatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load perfume")
		return
	}
	p.Tags = parseTextArrayJSON(tagsJSON)
	p.Notes.Top = parseTextArrayJSON(notesTopJSON)
	p.Notes.Heart = parseTextArrayJSON(notesHeartJSON)
	p.Notes.Base = parseTextArrayJSON(notesBaseJSON)
	p.Seasons = parseTextArrayJSON(seasonsJSON)
	p.DayNight = parseTextArrayJSON(dayNightJSON)

	payload := perfumeToResponse(p, createdAt, updatedAt)
	writeJSON(w, http.StatusOK, payload)
}

func perfumeToResponse(p perfumePayload, createdAt time.Time, updatedAt sql.NullTime) map[string]interface{} {
	payload := map[string]interface{}{
		"id":                 p.ID,
		"catalogMode":        p.CatalogMode,
		"brand":              p.Brand,
		"name":               p.Name,
		"family":             p.Family,
		"description":        p.Description,
		"tags":               p.Tags,
		"notes":              map[string]interface{}{"top": p.Notes.Top, "heart": p.Notes.Heart, "base": p.Notes.Base},
		"seasons":            p.Seasons,
		"dayNight":           p.DayNight,
		"basePrice":          p.BasePrice,
		"baseVolume":         p.BaseVolume,
		"price":              p.BasePrice,
		"volume":             p.BaseVolume,
		"sillage":            p.Sillage,
		"longevity":          p.Longevity,
		"image":              p.Image,
		"searchNameRu":       p.SearchNameRu,
		"isHit":              p.IsHit,
		"orderCount":         p.OrderCount,
		"inStock":            p.InStock,
		"currency":           p.Currency,
		"popularity":         p.Popularity,
		"popularityMonth":    p.PopularityMonth,
		"popularityMonthKey": p.PopularityMonthKey,
		"reviewAvg":          p.ReviewAvg,
		"reviewCount":        p.ReviewCount,
		"createdAt":          createdAt.UTC().Format(time.RFC3339),
	}
	if updatedAt.Valid {
		payload["updatedAt"] = updatedAt.Time.UTC().Format(time.RFC3339)
	}
	return payload
}

func (s *Server) handleUpsertPerfume(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var payload perfumePayload
	if err := readJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if id == "" {
		id = payload.ID
	}
	id = strings.TrimSpace(id)
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	mode := strings.TrimSpace(payload.CatalogMode)
	if mode == "" {
		mode = "retail"
	}
	if mode != "retail" && mode != "wholesale" {
		writeError(w, http.StatusBadRequest, "invalid catalog mode")
		return
	}
	if payload.BasePrice == 0 && payload.Price > 0 {
		payload.BasePrice = payload.Price
	}
	if payload.BaseVolume == 0 && payload.Volume > 0 {
		payload.BaseVolume = payload.Volume
	}

	_, err := s.db.Exec(`
		INSERT INTO perfumes (
			id, catalog_mode, brand, name, family, description,
			tags, notes_top, notes_heart, notes_base, seasons, day_night,
			base_price, base_volume, sillage, longevity, image_url, search_name_ru,
			is_hit, order_count, in_stock, currency, popularity, popularity_month,
			popularity_month_key, review_avg, review_count, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,
			$7,$8,$9,$10,$11,$12,
			$13,$14,$15,$16,$17,$18,
			$19,$20,$21,$22,$23,$24,
			$25,$26,$27,now(),now()
		)
		ON CONFLICT (id) DO UPDATE SET
			catalog_mode = EXCLUDED.catalog_mode,
			brand = EXCLUDED.brand,
			name = EXCLUDED.name,
			family = EXCLUDED.family,
			description = EXCLUDED.description,
			tags = EXCLUDED.tags,
			notes_top = EXCLUDED.notes_top,
			notes_heart = EXCLUDED.notes_heart,
			notes_base = EXCLUDED.notes_base,
			seasons = EXCLUDED.seasons,
			day_night = EXCLUDED.day_night,
			base_price = EXCLUDED.base_price,
			base_volume = EXCLUDED.base_volume,
			sillage = EXCLUDED.sillage,
			longevity = EXCLUDED.longevity,
			image_url = EXCLUDED.image_url,
			search_name_ru = EXCLUDED.search_name_ru,
			is_hit = EXCLUDED.is_hit,
			order_count = EXCLUDED.order_count,
			in_stock = EXCLUDED.in_stock,
			currency = EXCLUDED.currency,
			popularity = EXCLUDED.popularity,
			popularity_month = EXCLUDED.popularity_month,
			popularity_month_key = EXCLUDED.popularity_month_key,
			review_avg = EXCLUDED.review_avg,
			review_count = EXCLUDED.review_count,
			updated_at = now()
	`,
		id, mode, payload.Brand, payload.Name, payload.Family, payload.Description,
		pgtype.FlatArray[string](payload.Tags),
		pgtype.FlatArray[string](payload.Notes.Top),
		pgtype.FlatArray[string](payload.Notes.Heart),
		pgtype.FlatArray[string](payload.Notes.Base),
		pgtype.FlatArray[string](payload.Seasons),
		pgtype.FlatArray[string](payload.DayNight),
		payload.BasePrice, payload.BaseVolume, payload.Sillage, payload.Longevity, payload.Image, payload.SearchNameRu,
		payload.IsHit, payload.OrderCount, payload.InStock, payload.Currency, payload.Popularity,
		payload.PopularityMonth, payload.PopularityMonthKey, payload.ReviewAvg, payload.ReviewCount,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save perfume")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"id": id})
}

func (s *Server) handleDeletePerfume(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	if _, err := s.db.Exec("DELETE FROM perfumes WHERE id=$1", id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot delete perfume")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleCreateOrder(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req createOrderRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "empty order")
		return
	}

	var user User
	if err := s.db.QueryRow(`
		SELECT id, email, display_name, is_admin, is_anonymous
		FROM users WHERE id = $1
	`, userCtx.ID).Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}

	itemsJSON, err := json.Marshal(req.Items)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot encode items")
		return
	}
	currency := strings.TrimSpace(req.Currency)
	if currency == "" {
		currency = "₽"
	}

	tx, err := s.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot start transaction")
		return
	}
	defer tx.Rollback()

	var orderID string
	err = tx.QueryRow(`
		INSERT INTO orders (
			user_id, is_anonymous, email, display_name, items, total, currency,
			channel, delivery_method, delivery_address, fulfilled, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,now())
		RETURNING id
	`, user.ID, user.IsAnonymous, user.Email, user.DisplayName, itemsJSON, req.Total, currency,
		req.Channel, req.Delivery.Method, strings.TrimSpace(req.Delivery.Address),
	).Scan(&orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create order")
		return
	}

	counts := make(map[string]int)
	for _, item := range req.Items {
		if item.ID == "" {
			continue
		}
		counts[item.ID] += item.Qty
	}

	for id, qty := range counts {
		if qty <= 0 {
			continue
		}
		if _, err := tx.Exec(`
			UPDATE perfumes SET order_count = COALESCE(order_count, 0) + $1 WHERE id = $2
		`, qty, id); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot update perfume order count")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save order")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": orderID})
}

func (s *Server) handleListOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`
		SELECT id, user_id, is_anonymous, email, display_name, items, total, currency,
		       channel, delivery_method, delivery_address, fulfilled, created_at
		FROM orders
		ORDER BY created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load orders")
		return
	}
	defer rows.Close()

	var list []Order
	for rows.Next() {
		var (
			order Order
			itemsJSON []byte
			createdAt time.Time
		)
		if err := rows.Scan(
			&order.ID, &order.UserID, &order.IsAnonymous, &order.Email, &order.DisplayName, &itemsJSON,
			&order.Total, &order.Currency, &order.Channel, &order.DeliveryMethod, &order.DeliveryAddress,
			&order.Fulfilled, &createdAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse orders")
			return
		}
		if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
			order.Items = []OrderItem{}
		}
		order.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		list = append(list, order)
	}

	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleUpdateOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	var body struct {
		Fulfilled bool `json:"fulfilled"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if _, err := s.db.Exec(`UPDATE orders SET fulfilled=$1 WHERE id=$2`, body.Fulfilled, id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update order")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleDeleteOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	if _, err := s.db.Exec(`DELETE FROM orders WHERE id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot delete order")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`
		SELECT id, email, display_name, is_admin, is_anonymous, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load users")
		return
	}
	defer rows.Close()

	var list []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous, &user.CreatedAt, &user.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse users")
			return
		}
		list = append(list, user)
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleGetCart(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var itemsJSON []byte
	err := s.db.QueryRow(`SELECT items FROM carts WHERE user_id=$1`, userCtx.ID).Scan(&itemsJSON)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusOK, cartPayload{Items: []OrderItem{}})
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load cart")
		return
	}
	var items []OrderItem
	if err := json.Unmarshal(itemsJSON, &items); err != nil {
		items = []OrderItem{}
	}
	writeJSON(w, http.StatusOK, cartPayload{Items: items})
}

func (s *Server) handleSaveCart(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var payload cartPayload
	if err := readJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	itemsJSON, err := json.Marshal(payload.Items)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot encode cart")
		return
	}
	_, err = s.db.Exec(`
		INSERT INTO carts (user_id, items, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = now()
	`, userCtx.ID, itemsJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save cart")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListFavorites(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := s.db.Query(`SELECT perfume_id FROM favorites WHERE user_id=$1`, userCtx.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load favorites")
		return
	}
	defer rows.Close()
	var list []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse favorites")
			return
		}
		list = append(list, id)
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleAddFavorite(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	perfumeID := chi.URLParam(r, "perfumeId")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}
	if _, err := s.db.Exec(`
		INSERT INTO favorites (user_id, perfume_id, created_at)
		VALUES ($1,$2,now())
		ON CONFLICT (user_id, perfume_id) DO NOTHING
	`, userCtx.ID, perfumeID); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot add favorite")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleRemoveFavorite(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	perfumeID := chi.URLParam(r, "perfumeId")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}
	if _, err := s.db.Exec(`DELETE FROM favorites WHERE user_id=$1 AND perfume_id=$2`, userCtx.ID, perfumeID); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot remove favorite")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListReviews(w http.ResponseWriter, r *http.Request) {
	perfumeID := chi.URLParam(r, "perfumeId")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}
	rows, err := s.db.Query(`
		SELECT user_id, author_label, rating, text, is_anonymous, created_at, updated_at
		FROM reviews
		WHERE perfume_id = $1
		ORDER BY created_at DESC
	`, perfumeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load reviews")
		return
	}
	defer rows.Close()
	var list []Review
	for rows.Next() {
		var review Review
		var createdAt time.Time
		var updatedAt time.Time
		if err := rows.Scan(&review.ID, &review.AuthorLabel, &review.Rating, &review.Text, &review.IsAnonymous, &createdAt, &updatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse reviews")
			return
		}
		review.UID = review.ID
		review.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		review.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		list = append(list, review)
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleUpsertReview(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	perfumeID := chi.URLParam(r, "perfumeId")
	reviewID := chi.URLParam(r, "reviewId")
	if perfumeID == "" || reviewID == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	if reviewID != userCtx.ID && !userCtx.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	var payload reviewPayload
	if err := readJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if payload.Rating < 1 || payload.Rating > 5 {
		writeError(w, http.StatusBadRequest, "invalid rating")
		return
	}
	if strings.TrimSpace(payload.Text) == "" {
		writeError(w, http.StatusBadRequest, "missing text")
		return
	}

	_, err := s.db.Exec(`
		INSERT INTO reviews (perfume_id, user_id, author_label, rating, text, is_anonymous, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,now(),now())
		ON CONFLICT (perfume_id, user_id) DO UPDATE SET
			author_label = EXCLUDED.author_label,
			rating = EXCLUDED.rating,
			text = EXCLUDED.text,
			is_anonymous = EXCLUDED.is_anonymous,
			updated_at = now()
	`, perfumeID, reviewID, strings.TrimSpace(payload.AuthorLabel), payload.Rating, strings.TrimSpace(payload.Text), payload.IsAnonymous)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save review")
		return
	}

	summary, err := s.updateReviewSummary(perfumeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update summary")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) handleDeleteReview(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	perfumeID := chi.URLParam(r, "perfumeId")
	reviewID := chi.URLParam(r, "reviewId")
	if perfumeID == "" || reviewID == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	if reviewID != userCtx.ID && !userCtx.IsAdmin {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	if _, err := s.db.Exec(`DELETE FROM reviews WHERE perfume_id=$1 AND user_id=$2`, perfumeID, reviewID); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot delete review")
		return
	}
	summary, err := s.updateReviewSummary(perfumeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update summary")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) handleReviewSummary(w http.ResponseWriter, r *http.Request) {
	perfumeID := chi.URLParam(r, "perfumeId")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}
	summary, err := s.getReviewSummary(perfumeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load summary")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (s *Server) handleLogStat(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		PerfumeID string `json:"perfumeId"`
		Type      string `json:"type"`
	}
	if err := readJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if payload.PerfumeID == "" {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}
	if payload.Type == "" {
		payload.Type = "view"
	}
	if _, err := s.db.Exec(`
		INSERT INTO stat_events (perfume_id, type, created_at)
		VALUES ($1,$2,now())
	`, payload.PerfumeID, payload.Type); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save event")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) getReviewSummary(perfumeID string) (reviewSummary, error) {
	var summary reviewSummary
	err := s.db.QueryRow(`
		SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*)
		FROM reviews WHERE perfume_id = $1
	`, perfumeID).Scan(&summary.Avg, &summary.Count)
	if err != nil {
		return reviewSummary{}, err
	}
	return summary, nil
}

func (s *Server) updateReviewSummary(perfumeID string) (reviewSummary, error) {
	summary, err := s.getReviewSummary(perfumeID)
	if err != nil {
		return reviewSummary{}, err
	}
	_, err = s.db.Exec(`
		UPDATE perfumes
		SET review_avg = $1, review_count = $2
		WHERE id = $3
	`, summary.Avg, summary.Count, perfumeID)
	if err != nil {
		return reviewSummary{}, err
	}
	return summary, nil
}

func parseTextArrayJSON(data []byte) []string {
	if len(data) == 0 {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal(data, &out); err != nil {
		return []string{}
	}
	return out
}
