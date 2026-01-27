# Deploy & Update Guide (Manual)

## 0) One-time info
- Server IP: 178.209.127.79
- Domain: https://39donutsgame.ru
- Project path on server: /opt/parfum/Fullstack

## 1) Make changes on your PC
In the project folder:

```bash
git add .
git commit -m "change"
git push
```

## 2) Connect to server
```bash
ssh root@178.209.127.79
```

## 3) Pull latest code on server
```bash
cd /opt/parfum/Fullstack
git pull
```

## 4) Run DB migrations (only if DB schema changed)
```bash
docker exec -i fullstack_db_1 psql -U parfum -d parfum -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for f in backend/migrations/*.sql; do
  name="$(basename "$f")"
  applied="$(docker exec -i fullstack_db_1 psql -U parfum -d parfum -tAc "SELECT 1 FROM schema_migrations WHERE filename='$name';" | tr -d '[:space:]')"
  if [ "$applied" != "1" ]; then
    echo "Applying $name"
    docker exec -i fullstack_db_1 psql -U parfum -d parfum -v ON_ERROR_STOP=1 < "$f"
    docker exec -i fullstack_db_1 psql -U parfum -d parfum -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
  else
    echo "Skipping $name"
  fi
done
```

## 5) Rebuild and restart containers
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 6) Check server is working
```bash
curl -I https://39donutsgame.ru
curl -i https://39donutsgame.ru/api/health
```

## 7) View logs (if something is wrong)
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 web
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 backend
docker-compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 db
```

## 8) Restart all services (manual)
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod down
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 9) Backup database (daily recommended)
```bash
/opt/parfum/backup_db.sh
ls -la /opt/parfum/backups | tail
```

## 10) After reboot (auto)
Docker is set to auto-start and containers have restart policy `unless-stopped`.
If needed:
```bash
systemctl start docker
cd /opt/parfum/Fullstack
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```


## 11) Autostart after reboot (check)
Docker should start automatically and containers have `restart: unless-stopped`.

Check Docker service:
```bash
systemctl status docker
systemctl is-enabled docker
```

If needed, enable and start Docker:
```bash
systemctl enable docker
systemctl start docker
```

Start containers manually (if they were stopped):
```bash
cd /opt/parfum/Fullstack
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```
