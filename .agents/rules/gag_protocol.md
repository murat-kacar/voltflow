# GAG Protokolü Kuralı (Graphify > Antigravity > Gemini)

## Amaç
Bu proje, geliştirme sürecinde tahmin ve halüsinasyonları engellemek, minimum token harcamak ve cerrahi doğruluk sağlamak için GAG mimarisini zorunlu kılar.

## Temel Kısıtlamalar
1. **Dosyayı Baştan Yazma Yasağı:** `write_to_file` ile var olan kod dosyalarını ezmek yasaktır. Daima `replace_file_content` veya `multi_replace_file_content` kullanılmalıdır.
2. **Kör Arama Yasağı:** Graf kontrol edilmeden rastgele dosya açılmamalıdır.
3. **Doğrulanmamış Yanıt Yasağı:** Yapılan değişiklik linter/derleyici veya testler ile doğrulanmadan kullanıcıya "tamamlandı" denilemez.
4. **DDD & God Node Yasağı:** Tekil `utils/helpers` çöplükleri oluşturulamaz; kod domain sınırlarına ayrılmalıdır.
5. **Kanonik İsimlendirme:** Kısaltma ve muğlak değişken/fonksiyon adları kullanılamaz.
6. **Modern AAA & Güvenlik:** JWT/token asla `localStorage`'a yazılamaz; `HttpOnly` cookie ve RBAC guard zorunludur.
7. **Yapısal Log:** `console.log` yasaktır; JSON ve TraceId formatlı loglama zorunludur.
8. **Sınırda Validasyon:** Dış veri Zod/Pydantic şeması olmadan servis katmanına giremez.
9. **İşlem Bütünlüğü (Transactions):** Çoklu tablo yazmalarında atomik Transaction zorunludur.
10. **Standart Hata Formatı:** Uç noktalar rastgele değil, standart hata zarfı dönmek zorundadır.
11. **Merkezi Konfigürasyon:** Dağınık `process.env` yasaktır; merkezi tip-güvenli config kullanılmalıdır.
12. **İdempotens & Hız Sınırlama:** Çift tetikleme ve istismar koruması (`Idempotency-Key`, Rate Limit) Guard/Middleware katmanında zorunludur.
13. **Sona Ekleme Yasağı & Yerinde Entegrasyon:** Yeni kurallar veya kodlar dosya sonuna körlemesine yapıştırılamaz; mevcut hiyerarşideki ilgili yerle merge edilmeli, mükerrer/çelişkili kısımlar temizlenmelidir.

## Kanonik Teknoloji Standartları
Projelerde çekirdek yığın olarak **TypeScript (Strict), Next.js (App Router), PostgreSQL, Drizzle ORM, Better-Auth ve Zod** zorunludur. Farklı diller veya yetkisiz ağır framework'ler projeye dahil edilemez.





