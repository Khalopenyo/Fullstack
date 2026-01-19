package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"parfum-backend/internal/app"
)

type Server struct {
	cfg       app.Config
	db        *sql.DB
	jwtSecret []byte
}

type ctxKey int

const (
	ctxUserKey ctxKey = iota
)

type authUser struct {
	ID          string
	Email       string
	DisplayName string
	IsAdmin     bool
	IsAnonymous bool
}

type authClaims struct {
	IsAdmin     bool `json:"adm"`
	IsAnonymous bool `json:"anon"`
	jwt.RegisteredClaims
}

func NewServer(cfg app.Config, db *sql.DB) *Server {
	return &Server{cfg: cfg, db: db, jwtSecret: []byte(cfg.JWTSecret)}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(s.cors)

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", s.handleRegister)
		r.Post("/login", s.handleLogin)
		r.Post("/guest", s.handleGuest)
		r.With(s.requireAuth).Get("/me", s.handleMe)
	})

	r.Route("/api/perfumes", func(r chi.Router) {
		r.Get("/", s.handleListPerfumes)
		r.Get("/{id}", s.handleGetPerfume)
		r.With(s.requireAdmin).Post("/", s.handleUpsertPerfume)
		r.With(s.requireAdmin).Put("/{id}", s.handleUpsertPerfume)
		r.With(s.requireAdmin).Delete("/{id}", s.handleDeletePerfume)
	})

	r.Route("/api/uploads", func(r chi.Router) {
		r.With(s.requireAdmin).Post("/perfumes/{id}", s.handleUploadPerfumeImage)
	})

	r.Route("/api/orders", func(r chi.Router) {
		r.With(s.requireAuth).Post("/", s.handleCreateOrder)
		r.With(s.requireAdmin).Get("/", s.handleListOrders)
		r.With(s.requireAdmin).Put("/{id}", s.handleUpdateOrder)
		r.With(s.requireAdmin).Delete("/{id}", s.handleDeleteOrder)
	})

	r.Route("/api/users", func(r chi.Router) {
		r.With(s.requireAdmin).Get("/", s.handleListUsers)
	})

	r.Route("/api/cart", func(r chi.Router) {
		r.With(s.requireAuth).Get("/", s.handleGetCart)
		r.With(s.requireAuth).Put("/", s.handleSaveCart)
	})

	r.Route("/api/favorites", func(r chi.Router) {
		r.With(s.requireAuth).Get("/", s.handleListFavorites)
		r.With(s.requireAuth).Post("/{perfumeId}", s.handleAddFavorite)
		r.With(s.requireAuth).Delete("/{perfumeId}", s.handleRemoveFavorite)
	})

	r.Route("/api/reviews", func(r chi.Router) {
		r.Get("/{perfumeId}", s.handleListReviews)
		r.Get("/{perfumeId}/summary", s.handleReviewSummary)
		r.With(s.requireAuth).Put("/{perfumeId}/{reviewId}", s.handleUpsertReview)
		r.With(s.requireAuth).Delete("/{perfumeId}/{reviewId}", s.handleDeleteReview)
	})

	r.Post("/api/stats", s.handleLogStat)

	uploadsPath := http.Dir(s.cfg.UploadDir)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(uploadsPath)))

	return r
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && s.isOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) isOriginAllowed(origin string) bool {
	for _, allowed := range s.cfg.CORSOrigins {
		if allowed == "*" || strings.EqualFold(strings.TrimSpace(allowed), origin) {
			return true
		}
	}
	return false
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := s.parseAuth(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		ctx := withAuthUser(r.Context(), user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, err := s.parseAuth(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		if !user.IsAdmin {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		ctx := withAuthUser(r.Context(), user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) parseAuth(r *http.Request) (authUser, error) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return authUser{}, errors.New("missing token")
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return authUser{}, errors.New("invalid token")
	}
	tokenStr := strings.TrimSpace(parts[1])
	claims := &authClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return authUser{}, errors.New("invalid token")
	}
	return authUser{
		ID:          claims.Subject,
		IsAdmin:     claims.IsAdmin,
		IsAnonymous: claims.IsAnonymous,
	}, nil
}

func (s *Server) issueToken(u authUser, ttl time.Duration) (string, error) {
	claims := authClaims{
		IsAdmin:     u.IsAdmin,
		IsAnonymous: u.IsAnonymous,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func readJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	dec := json.NewDecoder(io.LimitReader(r.Body, 5<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func (s *Server) handleUploadPerfumeImage(w http.ResponseWriter, r *http.Request) {
	perfumeID := chi.URLParam(r, "id")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}

	if err := r.ParseMultipartForm(12 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file")
		return
	}
	defer file.Close()

	safeName := sanitizeFilename(header.Filename)
	stamp := time.Now().UnixMilli()
	relPath := filepath.Join("perfumes", perfumeID, fmt.Sprintf("%d_%s", stamp, safeName))
	absPath := filepath.Join(s.cfg.UploadDir, relPath)

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create directory")
		return
	}

	out, err := os.Create(absPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save file")
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot save file")
		return
	}

	url := "/uploads/" + filepath.ToSlash(relPath)
	writeJSON(w, http.StatusOK, map[string]string{"url": url, "path": relPath})
}

func sanitizeFilename(name string) string {
	base := filepath.Base(name)
	base = strings.TrimSpace(base)
	if base == "" {
		return "image"
	}
	out := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, base)
	return out
}
