package httpapi

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
	"strconv"

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
	ID          string   `json:"id"`
	CatalogMode string   `json:"catalogMode"`
	Brand       string   `json:"brand"`
	Name        string   `json:"name"`
	Family      string   `json:"family"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Notes       struct {
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
	StockQty           *int     `json:"stockQty"`
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
	Contact  struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Phone string `json:"phone"`
	} `json:"contact"`
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

type presetPayload struct {
	ID         string   `json:"id"`
	Title      string   `json:"title"`
	Subtitle   string   `json:"subtitle"`
	Notes      string   `json:"notes"`
	Groups     []struct {
		Title      string   `json:"title"`
		Subtitle   string   `json:"subtitle"`
		Notes      string   `json:"notes"`
		PerfumeIDs []string `json:"perfumeIds"`
	} `json:"groups"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if !s.allowAuth(r) {
		writeError(w, http.StatusTooManyRequests, "too many requests")
		return
	}
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

	var (
		user        User
		dbEmail     sql.NullString
		displayName sql.NullString
		createdAt   time.Time
		updatedAt   sql.NullTime
	)
	err = s.db.QueryRow(`
		INSERT INTO users (email, password_hash, display_name, is_admin, is_anonymous, created_at, updated_at)
		VALUES ($1, $2, $3, false, false, now(), now())
		RETURNING id, email, display_name, is_admin, is_anonymous, created_at, updated_at
	`, email, string(hash), strings.TrimSpace(req.DisplayName)).Scan(
		&user.ID, &dbEmail, &displayName, &user.IsAdmin, &user.IsAnonymous, &createdAt, &updatedAt,
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

	if dbEmail.Valid {
		user.Email = dbEmail.String
	}
	if displayName.Valid {
		user.DisplayName = displayName.String
	}
	user.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if updatedAt.Valid {
		user.UpdatedAt = updatedAt.Time.UTC().Format(time.RFC3339)
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 15*time.Minute)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}
	if err := s.setRefreshCookie(w, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue refresh")
		return
	}

	writeJSON(w, http.StatusCreated, AuthResponse{Token: token, User: user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.allowAuth(r) {
		writeError(w, http.StatusTooManyRequests, "too many requests")
		return
	}
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

	var (
		storedHash  string
		user        User
		dbEmail     sql.NullString
		displayName sql.NullString
		createdAt   time.Time
		updatedAt   sql.NullTime
	)
	err := s.db.QueryRow(`
		SELECT id, email, display_name, is_admin, is_anonymous, password_hash, created_at, updated_at
		FROM users
		WHERE email = $1 AND is_anonymous = false
	`, email).Scan(&user.ID, &dbEmail, &displayName, &user.IsAdmin, &user.IsAnonymous, &storedHash, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}

	if dbEmail.Valid {
		user.Email = dbEmail.String
	}
	if displayName.Valid {
		user.DisplayName = displayName.String
	}
	user.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if updatedAt.Valid {
		user.UpdatedAt = updatedAt.Time.UTC().Format(time.RFC3339)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 15*time.Minute)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}
	if err := s.setRefreshCookie(w, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue refresh")
		return
	}

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleGuest(w http.ResponseWriter, r *http.Request) {
	if !s.allowAuth(r) {
		writeError(w, http.StatusTooManyRequests, "too many requests")
		return
	}
	guestID, err := newGuestID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create guest")
		return
	}

	user := User{
		ID:          guestID,
		DisplayName: "Гость",
		IsAdmin:     false,
		IsAnonymous: true,
	}

	token, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 12*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}

	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := s.getRefreshCookie(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	user, newToken, expiresAt, err := s.rotateRefreshToken(refreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    newToken,
		Path:     "/api/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
		Expires:  expiresAt,
	})
	access, err := s.issueToken(authUser{ID: user.ID, IsAdmin: user.IsAdmin, IsAnonymous: user.IsAnonymous}, 15*time.Minute)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot issue token")
		return
	}
	writeJSON(w, http.StatusOK, AuthResponse{Token: access, User: user})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	refreshToken, err := s.getRefreshCookie(r)
	if err == nil {
		_ = s.revokeRefreshToken(refreshToken)
	}
	s.clearRefreshCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, User{
			ID:          userCtx.ID,
			DisplayName: "Гость",
			IsAdmin:     false,
			IsAnonymous: true,
		})
		return
	}
	var (
		user        User
		dbEmail     sql.NullString
		displayName sql.NullString
		createdAt   time.Time
		updatedAt   sql.NullTime
	)
	err := s.db.QueryRow(`
		SELECT id, email, display_name, is_admin, is_anonymous, created_at, updated_at
		FROM users
		WHERE id = $1
	`, userCtx.ID).Scan(&user.ID, &dbEmail, &displayName, &user.IsAdmin, &user.IsAnonymous, &createdAt, &updatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}
	if dbEmail.Valid {
		user.Email = dbEmail.String
	}
	if displayName.Valid {
		user.DisplayName = displayName.String
	}
	user.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if updatedAt.Valid {
		user.UpdatedAt = updatedAt.Time.UTC().Format(time.RFC3339)
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleListPerfumes(w http.ResponseWriter, r *http.Request) {
	mode := strings.TrimSpace(r.URL.Query().Get("mode"))
	if mode == "" {
		mode = "retail"
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	mustNotes := splitQueryList(r.URL.Query().Get("mustNotes"))
	avoidNotes := splitQueryList(r.URL.Query().Get("avoidNotes"))
	seasons := splitQueryList(r.URL.Query().Get("seasons"))
	dayNight := splitQueryList(r.URL.Query().Get("dayNight"))
	presetIDs := splitQueryList(r.URL.Query().Get("presetIds"))
	sort := strings.TrimSpace(r.URL.Query().Get("sort"))

	pageParam := strings.TrimSpace(r.URL.Query().Get("page"))
	pageSizeParam := strings.TrimSpace(r.URL.Query().Get("pageSize"))
	page := parsePositiveInt(pageParam, 1)
	pageSize := parsePositiveInt(pageSizeParam, 12)
	if pageSize < 1 {
		pageSize = 12
	}
	if pageSize > 60 {
		pageSize = 60
	}

	usePaging := pageParam != "" || pageSizeParam != "" || q != "" || len(mustNotes) > 0 || len(avoidNotes) > 0 || len(seasons) > 0 || len(dayNight) > 0 || len(presetIDs) > 0 || sort != ""

	where := []string{"catalog_mode = $1"}
	args := []interface{}{mode}
	presetArgIndex := 0

	if q != "" {
		args = append(args, "%"+q+"%")
		idx := len(args)
		where = append(where, "(brand ILIKE $"+itoa(idx)+" OR name ILIKE $"+itoa(idx)+" OR search_name_ru ILIKE $"+itoa(idx)+
			" OR array_to_string(tags, ' ') ILIKE $"+itoa(idx)+
			" OR array_to_string(notes_top, ' ') ILIKE $"+itoa(idx)+
			" OR array_to_string(notes_heart, ' ') ILIKE $"+itoa(idx)+
			" OR array_to_string(notes_base, ' ') ILIKE $"+itoa(idx)+")")
	}
	if len(seasons) > 0 {
		args = append(args, pgtype.FlatArray[string](seasons))
		where = append(where, "seasons && $"+itoa(len(args)))
	}
	if len(dayNight) > 0 {
		args = append(args, pgtype.FlatArray[string](dayNight))
		where = append(where, "day_night && $"+itoa(len(args)))
	}
	if len(mustNotes) > 0 {
		args = append(args, pgtype.FlatArray[string](mustNotes))
		where = append(where, "(notes_top || notes_heart || notes_base) @> $"+itoa(len(args)))
	}
	if len(avoidNotes) > 0 {
		args = append(args, pgtype.FlatArray[string](avoidNotes))
		where = append(where, "NOT ((notes_top || notes_heart || notes_base) && $"+itoa(len(args))+")")
	}
	if len(presetIDs) > 0 {
		args = append(args, pgtype.FlatArray[string](presetIDs))
		presetArgIndex = len(args)
		where = append(where, "id = ANY($"+itoa(len(args))+")")
	}

	whereSQL := strings.Join(where, " AND ")
	orderBy := "updated_at DESC NULLS LAST, id"
	switch sort {
	case "popular":
		orderBy = "order_count DESC, is_hit DESC, updated_at DESC NULLS LAST, id"
	case "new":
		orderBy = "updated_at DESC NULLS LAST, created_at DESC, id"
	case "priceAsc":
		orderBy = "base_price ASC, id"
	case "priceDesc":
		orderBy = "base_price DESC, id"
	case "hit":
		orderBy = "is_hit DESC, order_count DESC, id"
	case "preset":
		if presetArgIndex > 0 {
			orderBy = "array_position($" + itoa(presetArgIndex) + "::text[], id) ASC NULLS LAST"
		}
	}

	if !usePaging {
		rows, err := s.db.Query(`
			SELECT id, catalog_mode, brand, name, family, description,
			       to_json(tags), to_json(notes_top), to_json(notes_heart), to_json(notes_base),
			       to_json(seasons), to_json(day_night), base_price, base_volume, sillage, longevity,
		       image_url, search_name_ru, is_hit, order_count, in_stock, stock_qty, currency,
			       popularity, popularity_month, popularity_month_key,
			       COALESCE(review_avg, 0), COALESCE(review_count, 0), created_at, updated_at
			FROM perfumes
			WHERE `+whereSQL+`
			ORDER BY `+orderBy, args...)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot load perfumes")
			return
		}
		defer rows.Close()
		list, err := scanPerfumeRows(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse perfumes")
			return
		}
		writeJSON(w, http.StatusOK, list)
		return
	}

	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM perfumes WHERE "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot count perfumes")
		return
	}

	offset := (page - 1) * pageSize
	argsPage := append([]interface{}{}, args...)
	argsPage = append(argsPage, pageSize, offset)
	rows, err := s.db.Query(`
		SELECT id, catalog_mode, brand, name, family, description,
		       to_json(tags), to_json(notes_top), to_json(notes_heart), to_json(notes_base),
		       to_json(seasons), to_json(day_night), base_price, base_volume, sillage, longevity,
		       image_url, search_name_ru, is_hit, order_count, in_stock, stock_qty, currency,
		       popularity, popularity_month, popularity_month_key,
		       COALESCE(review_avg, 0), COALESCE(review_count, 0), created_at, updated_at
		FROM perfumes
		WHERE `+whereSQL+`
		ORDER BY `+orderBy+`
		LIMIT $`+itoa(len(argsPage)-1)+` OFFSET $`+itoa(len(argsPage))+`
	`, argsPage...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load perfumes")
		return
	}
	defer rows.Close()
	list, err := scanPerfumeRows(rows)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot parse perfumes")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":    list,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (s *Server) handleGetPerfume(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}

	var (
		p              perfumePayload
		tagsJSON       []byte
		notesTopJSON   []byte
		notesHeartJSON []byte
		notesBaseJSON  []byte
		seasonsJSON    []byte
		dayNightJSON   []byte
		createdAt      time.Time
		updatedAt      sql.NullTime
	)
	row := s.db.QueryRow(`
		SELECT id, catalog_mode, brand, name, family, description,
		       to_json(tags), to_json(notes_top), to_json(notes_heart), to_json(notes_base),
		       to_json(seasons), to_json(day_night), base_price, base_volume, sillage, longevity,
		       image_url, search_name_ru, is_hit, order_count, in_stock, stock_qty, currency,
		       popularity, popularity_month, popularity_month_key,
		       COALESCE(review_avg, 0), COALESCE(review_count, 0), created_at, updated_at
		FROM perfumes
		WHERE id = $1
	`, id)
	if err := row.Scan(
		&p.ID, &p.CatalogMode, &p.Brand, &p.Name, &p.Family, &p.Description,
		&tagsJSON, &notesTopJSON, &notesHeartJSON, &notesBaseJSON,
		&seasonsJSON, &dayNightJSON, &p.BasePrice, &p.BaseVolume, &p.Sillage, &p.Longevity,
		&p.Image, &p.SearchNameRu, &p.IsHit, &p.OrderCount, &p.InStock, &p.StockQty, &p.Currency,
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
		"stockQty":           p.StockQty,
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
			is_hit, order_count, in_stock, stock_qty, currency, popularity, popularity_month,
			popularity_month_key, review_avg, review_count, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,
			$7,$8,$9,$10,$11,$12,
			$13,$14,$15,$16,$17,$18,
			$19,$20,$21,$22,$23,$24,
			$25,$26,$27,$28,now(),now()
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
			stock_qty = EXCLUDED.stock_qty,
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
		payload.IsHit, payload.OrderCount, payload.InStock, payload.StockQty, payload.Currency, payload.Popularity,
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

	contactName := strings.TrimSpace(req.Contact.Name)
	contactEmail := strings.TrimSpace(req.Contact.Email)
	contactPhone := strings.TrimSpace(req.Contact.Phone)
	if userCtx.IsAnonymous && !isValidPhone(contactPhone) {
		writeError(w, http.StatusBadRequest, "invalid phone")
		return
	}

	user := User{
		ID:          userCtx.ID,
		IsAnonymous: userCtx.IsAnonymous,
	}
	if !userCtx.IsAnonymous {
		if err := s.db.QueryRow(`
			SELECT id, email, display_name, is_admin, is_anonymous
			FROM users WHERE id = $1
		`, userCtx.ID).Scan(&user.ID, &user.Email, &user.DisplayName, &user.IsAdmin, &user.IsAnonymous); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot load user")
			return
		}
	} else {
		user.DisplayName = "Гость"
	}
	if contactName != "" {
		user.DisplayName = contactName
	}
	if contactEmail != "" {
		user.Email = contactEmail
	}

	tx, err := s.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot start transaction")
		return
	}
	defer tx.Rollback()

	orderItems := make([]OrderItem, 0, len(req.Items))
	var currency string
	var total float64
	for _, item := range req.Items {
		if item.ID == "" || item.Qty <= 0 {
			continue
		}
		var price float64
		var itemCurrency string
		if err := tx.QueryRow(`SELECT base_price, currency FROM perfumes WHERE id=$1`, item.ID).Scan(&price, &itemCurrency); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusBadRequest, "invalid perfume id")
				return
			}
			writeError(w, http.StatusInternalServerError, "cannot load perfume")
			return
		}
		if currency == "" {
			currency = itemCurrency
		} else if itemCurrency != "" && itemCurrency != currency {
			writeError(w, http.StatusBadRequest, "mixed currency")
			return
		}
		orderItems = append(orderItems, OrderItem{
			ID:     item.ID,
			Volume: item.Volume,
			Mix:    item.Mix,
			Qty:    item.Qty,
			Price:  price,
		})
		total += price * float64(item.Qty)
	}
	if len(orderItems) == 0 {
		writeError(w, http.StatusBadRequest, "empty order")
		return
	}
	if currency == "" {
		currency = "₽"
	}

	itemsJSON, err := json.Marshal(orderItems)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot encode items")
		return
	}

	var (
		orderID string
		userID  interface{}
	)
	if !user.IsAnonymous {
		userID = user.ID
	}
	err = tx.QueryRow(`
		INSERT INTO orders (
			user_id, is_anonymous, email, display_name, phone, items, total, currency,
			channel, delivery_method, delivery_address, fulfilled, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,now())
		RETURNING id
	`, userID, user.IsAnonymous, user.Email, user.DisplayName, contactPhone, itemsJSON, total, currency,
		req.Channel, req.Delivery.Method, strings.TrimSpace(req.Delivery.Address),
	).Scan(&orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create order")
		return
	}

	counts := make(map[string]int)
	for _, item := range orderItems {
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
	page := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("page")), 1)
	pageSize := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("pageSize")), 20)
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	channel := strings.TrimSpace(r.URL.Query().Get("channel"))
	fulfilledParam := strings.TrimSpace(r.URL.Query().Get("fulfilled"))

	where := []string{}
	args := []interface{}{}
	if channel != "" && channel != "all" {
		args = append(args, channel)
		where = append(where, "channel = $"+itoa(len(args)))
	}
	if fulfilledParam != "" {
		if fulfilledParam == "true" || fulfilledParam == "false" {
			args = append(args, fulfilledParam == "true")
			where = append(where, "fulfilled = $"+itoa(len(args)))
		}
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM orders "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot count orders")
		return
	}
	offset := (page - 1) * pageSize
	argsPage := append([]interface{}{}, args...)
	argsPage = append(argsPage, pageSize, offset)

	rows, err := s.db.Query(`
		SELECT id, user_id, is_anonymous, email, display_name, phone, items, total, currency,
		       channel, delivery_method, delivery_address, fulfilled, created_at
		FROM orders
		`+whereSQL+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(len(argsPage)-1)+` OFFSET $`+itoa(len(argsPage))+`
	`, argsPage...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load orders")
		return
	}
	defer rows.Close()

	var list []Order
	for rows.Next() {
		var (
			order     Order
			userID    sql.NullString
			itemsJSON []byte
			createdAt time.Time
		)
		if err := rows.Scan(
			&order.ID, &userID, &order.IsAnonymous, &order.Email, &order.DisplayName, &order.Phone, &itemsJSON,
			&order.Total, &order.Currency, &order.Channel, &order.DeliveryMethod, &order.DeliveryAddress,
			&order.Fulfilled, &createdAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse orders")
			return
		}
		if userID.Valid {
			order.UserID = userID.String
		}
		if err := json.Unmarshal(itemsJSON, &order.Items); err != nil {
			order.Items = []OrderItem{}
		}
		order.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		list = append(list, order)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":    list,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
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
	tx, err := s.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot start transaction")
		return
	}
	defer tx.Rollback()

	var currentFulfilled bool
	var itemsJSON []byte
	if err := tx.QueryRow(`SELECT fulfilled, items FROM orders WHERE id=$1`, id).Scan(&currentFulfilled, &itemsJSON); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load order")
		return
	}

	if _, err := tx.Exec(`UPDATE orders SET fulfilled=$1 WHERE id=$2`, body.Fulfilled, id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update order")
		return
	}

	if !currentFulfilled && body.Fulfilled {
		var items []OrderItem
		if err := json.Unmarshal(itemsJSON, &items); err == nil {
			for _, item := range items {
				if item.ID == "" || item.Qty <= 0 {
					continue
				}
				if _, err := tx.Exec(`
					UPDATE perfumes
					SET stock_qty = GREATEST(stock_qty - $1, 0),
					    in_stock = CASE WHEN stock_qty - $1 <= 0 THEN false ELSE in_stock END
					WHERE id = $2 AND stock_qty IS NOT NULL
				`, item.Qty, item.ID); err != nil {
					writeError(w, http.StatusInternalServerError, "cannot update stock")
					return
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
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
	page := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("page")), 1)
	pageSize := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("pageSize")), 20)
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	where := []string{"is_anonymous = false"}
	args := []interface{}{}
	if q != "" {
		args = append(args, "%"+q+"%")
		where = append(where, "(email ILIKE $"+itoa(len(args))+" OR display_name ILIKE $"+itoa(len(args))+" OR id::text ILIKE $"+itoa(len(args))+")")
	}
	whereSQL := "WHERE " + strings.Join(where, " AND ")

	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM users "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot count users")
		return
	}
	offset := (page - 1) * pageSize
	argsPage := append([]interface{}{}, args...)
	argsPage = append(argsPage, pageSize, offset)

	rows, err := s.db.Query(`
		SELECT id, email, display_name, is_admin, is_anonymous, created_at, updated_at
		FROM users
		`+whereSQL+`
		ORDER BY created_at DESC
		LIMIT $`+itoa(len(argsPage)-1)+` OFFSET $`+itoa(len(argsPage))+`
	`, argsPage...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load users")
		return
	}
	defer rows.Close()

	var list []User
	for rows.Next() {
		var (
			user        User
			dbEmail     sql.NullString
			displayName sql.NullString
			createdAt   time.Time
			updatedAt   sql.NullTime
		)
		if err := rows.Scan(&user.ID, &dbEmail, &displayName, &user.IsAdmin, &user.IsAnonymous, &createdAt, &updatedAt); err != nil {
			log.Printf("scan users: %v", err)
			writeError(w, http.StatusInternalServerError, "cannot parse users")
			return
		}
		if dbEmail.Valid {
			user.Email = dbEmail.String
		}
		if displayName.Valid {
			user.DisplayName = displayName.String
		}
		user.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if updatedAt.Valid {
			user.UpdatedAt = updatedAt.Time.UTC().Format(time.RFC3339)
		}
		list = append(list, user)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":    list,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (s *Server) handleSetUserAdmin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	userCtx, ok := authUserFrom(r.Context())
	var body struct {
		IsAdmin bool `json:"isAdmin"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if ok && userCtx.ID == id && !body.IsAdmin {
		writeError(w, http.StatusForbidden, "cannot demote self")
		return
	}
	var currentIsAdmin bool
	if err := s.db.QueryRow(`SELECT is_admin FROM users WHERE id=$1`, id).Scan(&currentIsAdmin); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}
	if currentIsAdmin && !body.IsAdmin {
		count, err := s.countOtherAdmins(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot load admins")
			return
		}
		if count == 0 {
			writeError(w, http.StatusForbidden, "cannot demote last admin")
			return
		}
	}
	res, err := s.db.Exec(`UPDATE users SET is_admin=$1, updated_at=now() WHERE id=$2`, body.IsAdmin, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update user")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	userCtx, ok := authUserFrom(r.Context())
	if ok && userCtx.ID == id {
		writeError(w, http.StatusForbidden, "cannot delete self")
		return
	}
	var currentIsAdmin bool
	if err := s.db.QueryRow(`SELECT is_admin FROM users WHERE id=$1`, id).Scan(&currentIsAdmin); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "cannot load user")
		return
	}
	if currentIsAdmin {
		count, err := s.countOtherAdmins(id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot load admins")
			return
		}
		if count == 0 {
			writeError(w, http.StatusForbidden, "cannot delete last admin")
			return
		}
	}
	res, err := s.db.Exec(`DELETE FROM users WHERE id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot delete user")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleStockReport(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	includeUnlimited := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("includeUnlimited")), "true")
	low := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("low")), 5)
	if low <= 0 {
		low = 5
	}
	page := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("page")), 1)
	pageSize := parsePositiveInt(strings.TrimSpace(r.URL.Query().Get("pageSize")), 20)
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	where := []string{}
	args := []interface{}{}
	if !includeUnlimited {
		where = append(where, "stock_qty IS NOT NULL")
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		where = append(where, "(id ILIKE $"+itoa(len(args))+" OR brand ILIKE $"+itoa(len(args))+" OR name ILIKE $"+itoa(len(args))+")")
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	var summary struct {
		Total     int `json:"total"`
		Unlimited int `json:"unlimited"`
		Zero      int `json:"zero"`
		Low       int `json:"low"`
	}
	argsSummary := append([]interface{}{}, args...)
	argsSummary = append(argsSummary, low)
	querySummary := `
		SELECT
		  COUNT(*) AS total,
		  COUNT(*) FILTER (WHERE stock_qty IS NULL) AS unlimited,
		  COUNT(*) FILTER (WHERE stock_qty = 0) AS zero,
		  COUNT(*) FILTER (WHERE stock_qty > 0 AND stock_qty <= $` + itoa(len(argsSummary)) + `) AS low
		FROM perfumes
	` + whereSQL
	if err := s.db.QueryRow(querySummary, argsSummary...).Scan(&summary.Total, &summary.Unlimited, &summary.Zero, &summary.Low); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load stock summary")
		return
	}

	var total int
	if err := s.db.QueryRow("SELECT COUNT(*) FROM perfumes "+whereSQL, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot count stock")
		return
	}

	offset := (page - 1) * pageSize
	argsPage := append([]interface{}{}, args...)
	argsPage = append(argsPage, pageSize, offset)

	rows, err := s.db.Query(`
		SELECT id, brand, name, image_url, in_stock, stock_qty, updated_at
		FROM perfumes
		`+whereSQL+`
		ORDER BY stock_qty ASC NULLS LAST, updated_at DESC NULLS LAST, id
		LIMIT $`+itoa(len(argsPage)-1)+` OFFSET $`+itoa(len(argsPage))+`
	`, argsPage...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load stock")
		return
	}
	defer rows.Close()

	type stockRow struct {
		ID       string `json:"id"`
		Brand    string `json:"brand"`
		Name     string `json:"name"`
		Image    string `json:"image"`
		InStock  bool   `json:"inStock"`
		StockQty *int   `json:"stockQty"`
		Updated  string `json:"updatedAt"`
	}
	var list []stockRow
	for rows.Next() {
		var (
			row      stockRow
			qty      sql.NullInt64
			updated  sql.NullTime
		)
		if err := rows.Scan(&row.ID, &row.Brand, &row.Name, &row.Image, &row.InStock, &qty, &updated); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse stock")
			return
		}
		if qty.Valid {
			v := int(qty.Int64)
			row.StockQty = &v
		}
		if updated.Valid {
			row.Updated = updated.Time.UTC().Format(time.RFC3339)
		}
		list = append(list, row)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":    list,
		"summary":  summary,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (s *Server) handleUpdateStock(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	var body struct {
		StockQty *int `json:"stockQty"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.StockQty != nil && *body.StockQty < 0 {
		writeError(w, http.StatusBadRequest, "invalid stock qty")
		return
	}

	if body.StockQty == nil {
		if _, err := s.db.Exec(`UPDATE perfumes SET stock_qty=NULL WHERE id=$1`, id); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot update stock")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}

	if _, err := s.db.Exec(`
		UPDATE perfumes
		SET stock_qty=$1,
		    in_stock = CASE WHEN $1 > 0 THEN true ELSE false END
		WHERE id=$2
	`, *body.StockQty, id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update stock")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleGetCart(w http.ResponseWriter, r *http.Request) {
	userCtx, ok := authUserFrom(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, cartPayload{Items: []OrderItem{}})
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
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, []string{})
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
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
	if userCtx.IsAnonymous {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
	if userCtx.IsAnonymous {
		writeError(w, http.StatusForbidden, "forbidden")
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
	if userCtx.IsAnonymous {
		writeError(w, http.StatusForbidden, "forbidden")
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
	if !s.allowStat(r) {
		writeError(w, http.StatusTooManyRequests, "too many requests")
		return
	}
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
	if !isAllowedStatType(payload.Type) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ignored"})
		return
	}
	if !s.allowStatEvent(r, payload.PerfumeID, payload.Type) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "deduped"})
		return
	}
	if _, err := s.db.Exec(`
		INSERT INTO stat_events_daily (day, perfume_id, type, count)
		VALUES (CURRENT_DATE, $1, $2, 1)
		ON CONFLICT (day, perfume_id, type) DO UPDATE
		SET count = stat_events_daily.count + 1
	`, payload.PerfumeID, payload.Type); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save event")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListPresets(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(`
		SELECT id, title, subtitle, notes, position
		FROM presets
		ORDER BY position ASC, updated_at DESC, created_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load presets")
		return
	}
	defer rows.Close()

	var list []Preset
	presetIndex := make(map[string]*Preset)
	for rows.Next() {
		var p Preset
		var position int
		if err := rows.Scan(&p.ID, &p.Title, &p.Subtitle, &p.Notes, &position); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse presets")
			return
		}
		list = append(list, p)
		presetIndex[p.ID] = &list[len(list)-1]
	}

	if len(list) == 0 {
		writeJSON(w, http.StatusOK, []Preset{})
		return
	}

	groupRows, err := s.db.Query(`
		SELECT id, preset_id, title, subtitle, notes, position
		FROM preset_groups
		ORDER BY position ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load preset groups")
		return
	}
	defer groupRows.Close()

	groupIndex := make(map[string]*PresetGroup)
	for groupRows.Next() {
		var g PresetGroup
		var presetID string
		var position int
		if err := groupRows.Scan(&g.ID, &presetID, &g.Title, &g.Subtitle, &g.Notes, &position); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse preset groups")
			return
		}
		if p, ok := presetIndex[presetID]; ok {
			p.Groups = append(p.Groups, g)
			groupIndex[g.ID] = &p.Groups[len(p.Groups)-1]
		}
	}

	itemRows, err := s.db.Query(`
		SELECT group_id, perfume_id
		FROM preset_group_items
		ORDER BY position ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot load preset items")
		return
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var groupID string
		var perfumeID string
		if err := itemRows.Scan(&groupID, &perfumeID); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot parse preset items")
			return
		}
		if g, ok := groupIndex[groupID]; ok {
			g.PerfumeIDs = append(g.PerfumeIDs, perfumeID)
		}
	}

	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleUpsertPreset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body presetPayload
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	title := strings.TrimSpace(body.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "missing title")
		return
	}
	subtitle := strings.TrimSpace(body.Subtitle)
	notes := strings.TrimSpace(body.Notes)

	tx, err := s.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot start transaction")
		return
	}
	defer tx.Rollback()

	if id == "" {
		if err := tx.QueryRow(`
			INSERT INTO presets (title, subtitle, notes, created_at, updated_at)
			VALUES ($1,$2,$3,now(),now())
			RETURNING id
		`, title, subtitle, notes).Scan(&id); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot create preset")
			return
		}
	} else {
		res, err := tx.Exec(`
			UPDATE presets SET title=$1, subtitle=$2, notes=$3, updated_at=now()
			WHERE id=$4
		`, title, subtitle, notes, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot update preset")
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
	}

	if _, err := tx.Exec(`DELETE FROM preset_groups WHERE preset_id=$1`, id); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot update preset groups")
		return
	}
	for gi, g := range body.Groups {
		groupTitle := strings.TrimSpace(g.Title)
		if groupTitle == "" {
			continue
		}
		groupSubtitle := strings.TrimSpace(g.Subtitle)
		groupNotes := strings.TrimSpace(g.Notes)
		var groupID string
		if err := tx.QueryRow(`
			INSERT INTO preset_groups (preset_id, title, subtitle, notes, position, created_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,now(),now())
			RETURNING id
		`, id, groupTitle, groupSubtitle, groupNotes, gi).Scan(&groupID); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot create preset group")
			return
		}
		seen := make(map[string]bool)
		pos := 0
		for _, raw := range g.PerfumeIDs {
			v := strings.TrimSpace(raw)
			if v == "" || seen[v] {
				continue
			}
			seen[v] = true
			if _, err := tx.Exec(`
				INSERT INTO preset_group_items (group_id, perfume_id, position)
				VALUES ($1,$2,$3)
			`, groupID, v, pos); err != nil {
				writeError(w, http.StatusBadRequest, "invalid perfume id")
				return
			}
			pos++
		}
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save preset")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"id": id})
}

func (s *Server) handleDeletePreset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing id")
		return
	}
	res, err := s.db.Exec(`DELETE FROM presets WHERE id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot delete preset")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusNotFound, "not found")
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

func scanPerfumeRows(rows *sql.Rows) ([]map[string]interface{}, error) {
	var list []map[string]interface{}
	for rows.Next() {
		var (
			p              perfumePayload
			tagsJSON       []byte
			notesTopJSON   []byte
			notesHeartJSON []byte
			notesBaseJSON  []byte
			seasonsJSON    []byte
			dayNightJSON   []byte
			createdAt      time.Time
			updatedAt      sql.NullTime
		)
		if err := rows.Scan(
			&p.ID, &p.CatalogMode, &p.Brand, &p.Name, &p.Family, &p.Description,
			&tagsJSON, &notesTopJSON, &notesHeartJSON, &notesBaseJSON,
			&seasonsJSON, &dayNightJSON, &p.BasePrice, &p.BaseVolume, &p.Sillage, &p.Longevity,
		&p.Image, &p.SearchNameRu, &p.IsHit, &p.OrderCount, &p.InStock, &p.StockQty, &p.Currency,
			&p.Popularity, &p.PopularityMonth, &p.PopularityMonthKey, &p.ReviewAvg, &p.ReviewCount, &createdAt, &updatedAt,
		); err != nil {
			log.Printf("scan perfumes: %v", err)
			return nil, err
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
	return list, nil
}

func splitQueryList(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		v := strings.TrimSpace(p)
		if v != "" {
			out = append(out, v)
		}
	}
	return out
}

func parsePositiveInt(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

func newGuestID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return "guest_" + hex.EncodeToString(b[:]), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (s *Server) setRefreshCookie(w http.ResponseWriter, userID string) error {
	refreshToken, expiresAt, err := s.createRefreshToken(userID)
	if err != nil {
		return err
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
		Expires:  expiresAt,
	})
	return nil
}

func (s *Server) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cfg.CookieSecure,
		MaxAge:   -1,
	})
}

func (s *Server) getRefreshCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		return "", err
	}
	token := strings.TrimSpace(cookie.Value)
	if token == "" {
		return "", errors.New("missing token")
	}
	return token, nil
}

func (s *Server) createRefreshToken(userID string) (string, time.Time, error) {
	raw, err := newRandomToken(32)
	if err != nil {
		return "", time.Time{}, err
	}
	expires := time.Now().Add(30 * 24 * time.Hour)
	_, err = s.db.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
		VALUES ($1,$2,$3,now())
	`, userID, hashToken(raw), expires)
	if err != nil {
		return "", time.Time{}, err
	}
	return raw, expires, nil
}

func (s *Server) rotateRefreshToken(raw string) (User, string, time.Time, error) {
	var (
		user   User
		dbEmail     sql.NullString
		displayName sql.NullString
		createdAt   time.Time
		updatedAt   sql.NullTime
		tokenID string
	)
	err := s.db.QueryRow(`
		SELECT rt.id, u.id, u.email, u.display_name, u.is_admin, u.is_anonymous, u.created_at, u.updated_at
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
	`, hashToken(raw)).Scan(&tokenID, &user.ID, &dbEmail, &displayName, &user.IsAdmin, &user.IsAnonymous, &createdAt, &updatedAt)
	if err != nil {
		return User{}, "", time.Time{}, err
	}
	if dbEmail.Valid {
		user.Email = dbEmail.String
	}
	if displayName.Valid {
		user.DisplayName = displayName.String
	}
	user.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if updatedAt.Valid {
		user.UpdatedAt = updatedAt.Time.UTC().Format(time.RFC3339)
	}
	newToken, expiresAt, err := s.createRefreshToken(user.ID)
	if err != nil {
		return User{}, "", time.Time{}, err
	}
	if _, err := s.db.Exec(`
		UPDATE refresh_tokens
		SET revoked_at = now(), replaced_by = (SELECT id FROM refresh_tokens WHERE token_hash = $2)
		WHERE id = $1
	`, tokenID, hashToken(newToken)); err != nil {
		return User{}, "", time.Time{}, err
	}
	return user, newToken, expiresAt, nil
}

func (s *Server) revokeRefreshToken(raw string) error {
	_, err := s.db.Exec(`UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1`, hashToken(raw))
	return err
}

func newRandomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func isValidPhone(value string) bool {
	digits := make([]rune, 0, len(value))
	for _, r := range value {
		if r >= '0' && r <= '9' {
			digits = append(digits, r)
		}
	}
	return len(digits) >= 10 && len(digits) <= 15
}

func (s *Server) countOtherAdmins(excludeID string) (int, error) {
	var count int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM users WHERE is_admin = true AND id <> $1`, excludeID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *Server) allowStat(r *http.Request) bool {
	const (
		limit  = 60
		window = time.Minute
	)
	ip := clientIP(r)

	now := time.Now()
	s.statsMu.Lock()
	defer s.statsMu.Unlock()

	state := s.statsHits[ip]
	if state.reset.IsZero() || now.After(state.reset) {
		state.reset = now.Add(window)
		state.count = 0
	}
	if state.count >= limit {
		s.statsHits[ip] = state
		return false
	}
	state.count++
	s.statsHits[ip] = state
	return true
}

func (s *Server) allowStatEvent(r *http.Request, perfumeID, eventType string) bool {
	const window = 2 * time.Minute
	ip := clientIP(r)
	key := ip + "|" + perfumeID + "|" + eventType
	now := time.Now()

	s.statsEventMu.Lock()
	defer s.statsEventMu.Unlock()

	if last, ok := s.statsEventHits[key]; ok {
		if now.Sub(last) < window {
			return false
		}
	}
	s.statsEventHits[key] = now

	// opportunistic cleanup to prevent growth
	if len(s.statsEventHits) > 5000 {
		cutoff := now.Add(-10 * time.Minute)
		for k, v := range s.statsEventHits {
			if v.Before(cutoff) {
				delete(s.statsEventHits, k)
			}
		}
	}
	return true
}

func isAllowedStatType(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "view", "add_to_cart", "buy", "open", "share":
		return true
	default:
		return false
	}
}

func (s *Server) allowAuth(r *http.Request) bool {
	const (
		limit  = 20
		window = time.Minute
	)
	ip := clientIP(r)
	now := time.Now()
	s.authMu.Lock()
	defer s.authMu.Unlock()

	state := s.authHits[ip]
	if state.reset.IsZero() || now.After(state.reset) {
		state.reset = now.Add(window)
		state.count = 0
	}
	if state.count >= limit {
		s.authHits[ip] = state
		return false
	}
	state.count++
	s.authHits[ip] = state
	return true
}

func clientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	if idx := strings.Index(ip, ","); idx != -1 {
		ip = strings.TrimSpace(ip[:idx])
	}
	if host, _, err := net.SplitHostPort(ip); err == nil {
		ip = host
	}
	if ip == "" {
		ip = "unknown"
	}
	return ip
}
