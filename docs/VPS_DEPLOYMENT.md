# GitHub → VPS dağıtım planı

## 1. GitHub hazırlığı

Repository public veya private olarak oluşturulur. `staging` dalı staging VPS'e, `main` dalı production VPS'e karşılık gelir. `.env`, veritabanı dump'ları ve SSH anahtarları repository'ye eklenmez. GitHub Actions her iki dalda ve pull request'te `pnpm run check` ile `pnpm run build` çalıştırır.

GitHub Settings → Environments altında `staging` ve `production` environment'ları oluşturulur. Her environment'ın kendi secret seti bulunur: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT` (opsiyonel, varsayılan 22) ve `VPS_APP_PATH`. `VPS_APP_PATH`, ilgili VPS'te clone edilmiş repository'nin mutlak yoludur. `production` environment'ına en az bir Required reviewer eklenir; böylece `main` başarılı olsa bile production deploy'u manuel onay olmadan başlayamaz. CI başarılı olmadan CD çalışmaz.

İş akışı: geliştirme → `staging` dalı → staging otomatik deploy → manuel kabul testi → pull request → `main` → GitHub Actions'tan manuel `workflow_dispatch` → production onayı → production deploy. `main` push'u production deploy'u tetiklemez. Staging ve production için farklı VPS, veritabanı, alan adı ve `BETTER_AUTH_SECRET` kullanılmalıdır.

## 2. VPS hazırlığı

VPS üzerinde Docker ve Compose Plugin kurulmalıdır. Repository VPS'e clone edilir. Proje kökünde yalnızca sunucu üzerinde oluşturulan `.env.production` dosyası bulunur:

| GitHub environment | Branch | VPS yolu | Alan adı | Veritabanı |
| --- | --- | --- | --- | --- |
| `staging` | `staging` | `/opt/voltflow-staging` | `staging.example.com` | ayrı staging PostgreSQL |
| `production` | `main` | `/opt/voltflow-production` | `app.example.com` | ayrı production PostgreSQL |

Her VPS'te `VPS_APP_PATH`, tabloda belirtilen mutlak yol olmalıdır. İki ortam aynı VPS üzerinde çalıştırılmamalı; staging verisi production veritabanına veya secret'ına bağlanmamalıdır.

```env
POSTGRES_DB=voltflow
POSTGRES_USER=voltflow
POSTGRES_PASSWORD=<uzun-rastgele-parola>
DATABASE_URL=postgres://voltflow:<uzun-rastgele-parola>@db:5432/voltflow
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

İlk clone işlemleri:

```bash
# staging VPS
sudo mkdir -p /opt/voltflow-staging
sudo chown -R deploy:deploy /opt/voltflow-staging
git clone --branch staging https://github.com/murat-kacar/voltflow.git /opt/voltflow-staging

# production VPS
sudo mkdir -p /opt/voltflow-production
sudo chown -R deploy:deploy /opt/voltflow-production
git clone --branch main https://github.com/murat-kacar/voltflow.git /opt/voltflow-production
```

Her iki sunucuda `.env.production` dosyası ilgili path altında ayrı oluşturulur; dosya Git'e eklenmez.

## 4. Güncelleme ve geri dönüş

```bash
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.production.yml build app
docker compose --profile tools --env-file .env.production -f docker-compose.production.yml run --rm migrator
docker compose --env-file .env.production -f docker-compose.production.yml up -d app
```

Her migration öncesi PostgreSQL yedeği alınır. Uygulama sürümü geri alınabilir; veri migration'ı yalnızca yedek veya incelenmiş ters migration ile geri döndürülür.
