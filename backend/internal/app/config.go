package app

import (
	"os"
	"strings"
)

type Config struct {
	Addr        string
	DatabaseURL string
	JWTSecret   string
	UploadDir   string
	CORSOrigins []string
}

func LoadConfig() Config {
	addr := getEnv("ADDR", ":8080")
	dbURL := getEnv("DATABASE_URL", "")
	jwtSecret := getEnv("JWT_SECRET", "")
	uploadDir := getEnv("UPLOAD_DIR", "./uploads")
	corsRaw := getEnv("CORS_ORIGINS", "http://localhost:3000")
	cors := splitCSV(corsRaw)

	return Config{
		Addr:        addr,
		DatabaseURL: dbURL,
		JWTSecret:   jwtSecret,
		UploadDir:   uploadDir,
		CORSOrigins: cors,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitCSV(raw string) []string {
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
