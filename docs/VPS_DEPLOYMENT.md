# GitHub → VPS dağıtım planı

## 1. GitHub hazırlığı

Repository public veya private olarak oluşturulur ve mevcut proje `main` dalına gönderilir. `.env`, veritabanı dump'ları ve SSH anahtarları repository'ye eklenmez. GitHub Actions her push ve pull request'te `pnpm run check` ile `pnpm run build` çalıştırır.

Otomatik CD workflow'u için repository Settings → Secrets and variables → Actions altında şu secret'lar tanımlanır: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT` (opsiyonel, varsayılan 22) ve `VPS_APP_PATH`. `VPS_APP_PATH`, VPS'te clone edilmiş repository'nin mutlak yoludur. CI başarılı olmadan CD çalışmaz.

## 2. VPS hazırlığı

VPS üzerinde Docker ve Compose Plugin kurulmalıdır. Repository VPS'e clone edilir. Proje kökünde yalnızca sunucu üzerinde oluşturulan `.env.production` dosyası bulunur:

```env
POSTGRES_DB=gag
POSTGRES_USER=gag
POSTGRES_PASSWORD=<uzun-rastgele-parola>
DATABASE_URL=postgres://gag:<uzun-rastgele-parola>@db:5432/gag
BETTER_AUTH_SECRET=<en-az-32-karakter-rastgele-secret>
BETTER_AUTH_URL=https://alan-adiniz.example
```

## 3. İlk yayın

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d db
docker compose --profile tools --env-file .env.production -f docker-compose.production.yml run --rm migrator
docker compose --env-file .env.production -f docker-compose.production.yml up -d app
docker compose --profile tools --env-file .env.production -f docker-compose.production.yml run --rm migrator pnpm verify:staging
```

`BETTER_AUTH_URL` alan adı ve HTTPS reverse proxy ile aynı olmalıdır. Uygulama yalnızca `127.0.0.1:3000` üzerinde yayınlanır; dış trafik için Nginx/Caddy ve TLS kullanılmalıdır.

## 4. Güncelleme ve geri dönüş

```bash
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.production.yml build app
docker compose --profile tools --env-file .env.production -f docker-compose.production.yml run --rm migrator
docker compose --env-file .env.production -f docker-compose.production.yml up -d app
```

Her migration öncesi PostgreSQL yedeği alınır. Uygulama sürümü geri alınabilir; veri migration'ı yalnızca yedek veya incelenmiş ters migration ile geri döndürülür.
