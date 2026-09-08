# Staging doğrulama runbook'u

Bu proje production verisiyle ilk kez çalıştırılmadan önce staging ortamında aşağıdaki kapı geçilmelidir.

## Sıra

1. Staging PostgreSQL yedeğini alın.
2. `DATABASE_URL`, `BETTER_AUTH_SECRET` ve `BETTER_AUTH_URL` değişkenlerini staging değerleriyle tanımlayın.
3. `pnpm db:migrate` çalıştırın.
4. `pnpm verify:staging` çalıştırın.
5. `pnpm test:integration` çalıştırın.
6. `pnpm run check` ve `pnpm run build` çalıştırın.
7. Kritik akışları elle doğrulayın: giriş, satış, stok yetersizliği, saha onayı, tahsilat, taslak fatura ve offline eşitleme.

## Başarısızlık politikası

`verify:staging` veya entegrasyon testleri başarısızsa deployment durdurulur. Migration uygulanmadan uygulama başlatılmaz. Production secret development default'u olamaz ve production URL HTTPS olmalıdır.

## Geri dönüş

Migration öncesi alınan PostgreSQL yedeği saklanmadan production migration uygulanmaz. Uygulama rollback'i kod sürümünü geri alır; veri migration rollback'i yalnızca yedekten restore veya ayrıca incelenmiş ters migration ile yapılır.
