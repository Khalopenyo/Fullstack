package httpapi

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
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
	statsMu   sync.Mutex
	statsHits map[string]statsWindow
	statsEventMu   sync.Mutex
	statsEventHits map[string]time.Time
	authMu    sync.Mutex
	authHits  map[string]statsWindow
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

type statsWindow struct {
	count int
	reset time.Time
}

func NewServer(cfg app.Config, db *sql.DB) *Server {
	return &Server{
		cfg:       cfg,
		db:        db,
		jwtSecret: []byte(cfg.JWTSecret),
		statsHits: make(map[string]statsWindow),
		statsEventHits: make(map[string]time.Time),
		authHits:  make(map[string]statsWindow),
	}
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
		r.Post("/refresh", s.handleRefresh)
		r.Post("/logout", s.handleLogout)
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
		r.With(s.requireAdmin).Put("/{id}/admin", s.handleSetUserAdmin)
		r.With(s.requireAdmin).Delete("/{id}", s.handleDeleteUser)
	})

	r.Route("/api/stock", func(r chi.Router) {
		r.With(s.requireAdmin).Get("/", s.handleStockReport)
		r.With(s.requireAdmin).Put("/{id}", s.handleUpdateStock)
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

	r.Route("/api/presets", func(r chi.Router) {
		r.Get("/", s.handleListPresets)
		r.With(s.requireAdmin).Post("/", s.handleUpsertPreset)
		r.With(s.requireAdmin).Put("/{id}", s.handleUpsertPreset)
		r.With(s.requireAdmin).Delete("/{id}", s.handleDeletePreset)
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
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("invalid token method")
		}
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
	const maxUploadSize = 10 << 20
	perfumeID := chi.URLParam(r, "id")
	if perfumeID == "" {
		writeError(w, http.StatusBadRequest, "missing perfume id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "invalid form")
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file")
		return
	}
	defer file.Close()
	if header.Size > maxUploadSize {
		writeError(w, http.StatusBadRequest, "file too large")
		return
	}

	head := make([]byte, 512)
	n, err := file.Read(head)
	if err != nil && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "invalid file")
		return
	}
	head = head[:n]
	fileType := http.DetectContentType(head)
	switch fileType {
	case "image/jpeg", "image/png", "image/webp", "image/gif":
	default:
		writeError(w, http.StatusBadRequest, "unsupported file type")
		return
	}

	reader := io.MultiReader(bytes.NewReader(head), file)

	safeName := sanitizeFilename(header.Filename)
	stamp := time.Now().UnixMilli()
	relPath := filepath.Join("perfumes", perfumeID, fmt.Sprintf("%d_%s", stamp, safeName))
	absPath := filepath.Join(s.cfg.UploadDir, relPath)

	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "cannot create directory")
		return
	}

	if fileType == "image/jpeg" || fileType == "image/png" {
		img, _, err := image.Decode(reader)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid image")
			return
		}
		img = resizeImage(img, 1600)
		out, err := os.Create(absPath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot save file")
			return
		}
		defer out.Close()
		if fileType == "image/png" {
			enc := png.Encoder{CompressionLevel: png.BestCompression}
			if err := enc.Encode(out, img); err != nil {
				writeError(w, http.StatusInternalServerError, "cannot save file")
				return
			}
		} else {
			if err := jpeg.Encode(out, img, &jpeg.Options{Quality: 82}); err != nil {
				writeError(w, http.StatusInternalServerError, "cannot save file")
				return
			}
		}
	} else {
		out, err := os.Create(absPath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "cannot save file")
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, reader); err != nil {
			writeError(w, http.StatusInternalServerError, "cannot save file")
			return
		}
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

func resizeImage(img image.Image, maxSize int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxSize && h <= maxSize {
		return img
	}
	if w == 0 || h == 0 {
		return img
	}
	var nw, nh int
	if w >= h {
		nw = maxSize
		nh = int(float64(h) * float64(maxSize) / float64(w))
	} else {
		nh = maxSize
		nw = int(float64(w) * float64(maxSize) / float64(h))
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	for y := 0; y < nh; y++ {
		sy := int(float64(y) * float64(h) / float64(nh))
		if sy >= h {
			sy = h - 1
		}
		for x := 0; x < nw; x++ {
			sx := int(float64(x) * float64(w) / float64(nw))
			if sx >= w {
				sx = w - 1
			}
			dst.Set(x, y, img.At(b.Min.X+sx, b.Min.Y+sy))
		}
	}
	return dst
}
