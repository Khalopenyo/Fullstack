FROM golang:1.21-alpine AS build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN go build -o /bin/api ./cmd/api

FROM alpine:3.19
WORKDIR /app
RUN adduser -D -H apiuser
COPY --from=build /bin/api /app/api
USER apiuser
ENV ADDR=:8080
CMD ["/app/api"]
