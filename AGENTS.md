# GAG Protokolü: Deterministik Öncelikli Geliştirme Mimarisi
# (Graphify > Antigravity > Gemini)

Bu proje **GAG Mimarisi (Graphify > Antigravity > Gemini)** ile yönetilmektedir.
Temel Prensip: **"Deterministik Araçlar Önce, Yapay Zeka En Son"**. 
Tahmin yürütmek, körlemesine dosya aramak ve tüm dosyayı baştan yazmak KESİNLİKLE YASAKTIR.

---

## 1. Görev Dağılım Hiyerarşisi (Ters Piramit)

1. **Kademe 1: GRAPHIFY (Öncelik: En Yüksek / Yük: %50)**
   - Ne nerede, kim kimi çağırıyor, projenin mimari düğümleri (God nodes) neler?
   - Değiştirilecek sembolün etki alanı (Blast Radius) neresidir?
   - *Kural:* Dosya ve sembol arama işini Gemini tahmin etmeyecek; doğrudan `graph.json` veya `GRAPH_REPORT.md` üzerinden çıkaracaktır.

2. **Kademe 2: ANTIGRAVITY IDE/CLI (Öncelik: Orta / Yük: %35)**
   - Tarihçe Kontrolü: Kodun neden orada olduğunu anlamak için `git blame` / `git log` incelemesi.
   - Kapsam Koruma: Dosya baştan yazılmayacak; `replace_file_content` ile sadece ilgili satırlar cerrahi olarak yamalanacak.
   - Kapalı Döngü Denetim: Değişiklik sonrası yerel LSP, linter ve derleyici hatalarını (`TargetLintErrorIds`, `tsc`, `pyright`, `eslint`) anında yakalayıp düzeltme.

3. **Kademe 3: GEMINI 3.8 (Öncelik: En Son / Yük: %15)**
   - Yalnızca Graphify ve Antigravity'nin daralttığı 10-20 satırlık dilime yeni iş mantığını (logic) yazmak.
   - Tüm projeyi veya gereksiz dosyaları bağlama alarak token israf etmemek.

---

## 2. Her Promptta İstisnasız Uygulanacak 6 Fazlı İş Akışı

* **Faz 1 - Graf Tabanlı Keşif:** `graphify-out/graph.json` veya `graphify-out/GRAPH_REPORT.md` dosyasını oku *(eğer dosya henüz yoksa önce terminalde `pnpm run graph` çalıştırarak haritayı üret)*. Değiştirilecek sembolün bağımlılıklarını ve etki alanını (blast radius) belirle; gereksiz dosya okumaktan kaçın.
* **Faz 2 - Tarihçe ve Konfigürasyon:** Kritik satırlar için `git blame` ile niyet kontrolü yap; gerekirse `.env` / config uyumunu denetle.
* **Faz 3 - Kontrat / Tip Önceliği (Spec-First):** Gövde kodunu değiştirmeden önce tip veya arayüz kontratını doğrula.
* **Faz 4 - Cerrahi Müdahale:** Sadece `replace_file_content` veya `multi_replace_file_content` ile nokta atışı yama yap. Üretilen gövde kodu **Bölüm 3'teki Kanonik Standartlara (Validation, Idempotency, AAA, Loglama)** eksiksiz uymak zorundadır.
* **Faz 5 - Kapalı Döngü Doğrulama:** Değişiklik sonrası `pnpm run check` (Biome + tsc) çalıştır, testleri yürüt. Hata varsa kullanıcıya bildirmeden önce kendi içinde düzelt.
* **Faz 6 - Graf Senkronizasyonu:** Yapısal bir değişiklik yapıldıysa terminalde `pnpm run graph` çalıştırarak haritayı güncelle.


---

## 3. Kanonik Mimari ve Güvenlik Standartları (DDD, AAA & Observability)

Yapay zekanın üreteceği veya refactor edeceği kodlarda aşağıdaki endüstri standartları istisnasız uygulanacaktır:

### A. DDD ve Sınırlı Bağlamlar (Bounded Contexts)
- **Modüler Ayrım:** Kod tabanı dikey dilimlere (Domain / Feature Slices) bölünmelidir.
- **God Node Yasağı:** Çok amaçlı devasa `utils` veya `helpers` dosyaları oluşturulamaz. Yardımcı fonksiyonlar ilgili domain sınırları içinde tutulmalıdır.
- **Amaç:** Graphify üzerindeki graf kümelerini temiz tutmak ve etki alanını (blast radius) domain sınırında izole etmek.

### B. Kanonik İsimlendirme ve Ortak Dil (Ubiquitous Language)
- Kısaltma ve muğlak isimlendirmeler (`usr_chk`, `fn1`, `tempData`) yasaktır.
- Fonksiyon ve değişken isimleri iş mantığını açıkça belirten, niyet odaklı ve kendini açıklayan (intention-revealing) biçimde seçilmelidir (`authenticateUserWithPassword`, `revokeRefreshToken`).

### C. Kimlik, Yetki ve Oturum Standartları (AAA & Modern Security)
- **Token Saklama:** Hassas JWT ve oturum anahtarları **asla `localStorage`'da saklanamaz**. Daima `HttpOnly`, `Secure`, `SameSite=Strict/Lax` çerezler (cookies) kullanılmalıdır.
- **Authentication (AuthN):** Modern OAuth 2.1 / OIDC akışları, Refresh Token Rotation ve güvenli oturum sonlandırma uygulanmalıdır.
- **Authorization (AuthZ):** Kod içerisine dağılmış spagetti kontroller yerine merkezi, bildirimsel (declarative) RBAC (Role-Based) veya ABAC guard/middleware yapıları kullanılmalıdır.
- **Accounting (Audit Trail):** Kritik veri değişikliklerinde (bakiye, yetki, profil silme vb.) *"Kim, ne zaman, hangi kaydı değiştirdi?"* denetim logu tutulmalıdır.

### D. Yapılandırılmış Loglama ve İzlenebilirlik (Structured Logging)
- `console.log` veya düz metin print yasaktır.
- Loglar JSON formatında, standart log seviyeleriyle (`INFO`, `WARN`, `ERROR`), zaman damgası ve istek takibi için **Correlation ID / Trace ID** ile üretilmelidir.

### E. Sınırda Veri Doğrulama (Boundary Input Validation)
- Dış dünyadan gelen hiçbir veriye (HTTP gövdesi, query parametreleri, webhook yükleri) körü körüne güvenilemez.
- Tüm girdiler servis katmanına ulaşmadan önce katı bir şema motoru (Zod, Pydantic vb.) ile çalışma zamanında doğrulanmalıdır (runtime validation).

### F. Veritabanı ve İşlem Bütünlüğü (Database Transactions & Atomicity)
- İki veya daha fazla tabloyu/dokümanı değiştiren ilişkili yazma işlemlerinde yarım kalma (partial failure) riskine izin verilemez.
- Çok adımlı operasyonlar daima atomik bir veritabanı işlemi (Transaction / Unit of Work) bloğunda yürütülmeli; hata anında tam rollback yapılmalıdır.

### G. Standart Hata Yönetimi (Uniform Error Envelope)
- Her uç noktadan farklı JSON hata formatları dönmek yasaktır.
- Tüm sistem RFC 7807 (Problem Details) veya standart bir hata zarfı (`{ success: false, error: { code, message, details } }`) dönmelidir. Ham sistem/stack trace hataları istemciye asla sızdırılamaz.

### H. Tip Güvenli Merkezi Konfigürasyon (Type-Safe Env)
- Kod içerisine serpiştirilmiş `process.env.VAR` veya `os.environ.get()` kullanımı yasaktır.
- Tüm çevre değişkenleri tek bir merkezi konfigürasyon modülü üzerinden şema ile doğrulanıp tip güvenli olarak dışa aktarılmalıdır.

### I. İdempotens, Hız Sınırlama ve Yürütme Korumaları (Idempotency & Execution Guards)
- **İdempotens (Çift Tetikleme Koruması):** Ödeme, sipariş oluşturma ve harici webhook gibi kritik operasyonlarda aynı parametrelerle mükerrer çalıştırma engellenmelidir. `Idempotency-Key` mekanizması işletilerek mükerrer isteklerde eski sonuç dönülmeli, işlem yeniden yürütülmemelidir.
- **Hız Sınırlama ve Kotalar (Rate Limiting & Quotas):** OTP SMS isteme, şifre sıfırlama veya arama uç noktaları gibi kaynak tüketen işlemlerde IP veya Kullanıcı bazlı zaman pencereleri (Sliding Window vb.) tanımlanmalı; aşımda RFC 6585 (`429 Too Many Requests`) dönülmelidir.
- **Yarış Durumu ve Tekil Çalıştırma (Concurrency Lock / Mutex):** Aynı anda yalnızca tek bir kullanıcının tüketebileceği hassas kaynaklarda (tek kullanımlık kupon, bilet rezervasyonu) dağıtık kilit (Distributed Lock / DB Row Lock) kullanılmalıdır.
- **Sınırda Uygulama (Guards / Middleware):** Bu denetimler iş mantığı fonksiyonlarının içine spagetti `if` olarak gömülemez; Middleware, Guard veya Dekoratör katmanında bildirimsel (declarative) olarak uygulanmalıdır.

---

## 4. Kanonik AI-Dostu Teknoloji Yığını (Fullstack Stack)

Projelerde geliştirilecek sistemler deterministik tip güvenliği, anlık LSP geribildirimi ve Graphify uyumu için şu yığınla sınırlandırılmıştır:

- **Çekirdek Dil:** TypeScript (Strict Mode) - Uçtan uca tek dil, paylaşılan tipler ve sıfır tahmin.
- **Fullstack Web Çerçevesi:** Next.js (App Router) - Server Components, Server Actions ve Route Handlers ile tek çatı altında vitrin ve API.
- **Veritabanı & ORM:** PostgreSQL + Drizzle ORM - Saf TypeScript şemaları, SQL tabanlı hafiflik ve Tree-sitter ile %100 uyumlu modelleme.
- **Kimlik ve Yetki Yönetimi (Auth):** Better-Auth - Kendi veritabanımızda (Self-hosted), Drizzle entegreli, `HttpOnly` çerezli ve çok satıcılı pazar yerleri için yerleşik Organizasyon (Multi-Tenant / RBAC) motoru.
- **Sınır Doğrulama (Validation):** Zod (`drizzle-zod`) - Çalışma zamanı tip kontrolü ve şema üretimi.
- **Önbellek & Kuyruk (Ölçeklenme Gerektiğinde):** Başlangıçta PostgreSQL ve Next.js Data Cache; yüksek trafik ve ağır arka plan işleri için sunucusuz Upstash Redis / BullMQ.
- **Linter & Geri Bildirim:** Biome veya TypeScript LSP - Milisaniyelik anında hata denetimi.

---

## 5. Bağlam Konsolidasyonu ve Entropi Kontrolü (In-Place Integration & Garbage Collection)

Yapay zekanın zamanla dokümanları ve kodları çöplüğe çevirmesini (Append-Only Syndrome / Context Rot) engellemek için şu kurallar bağlayıcıdır:

### A. Sona Ekleme Yasağı (In-Place Integration)
- Yeni bir kural, talimat veya kod güncellemesi geldiğinde, bunu **dosyanın sonuna körlemesine yeni bir başlık/blok olarak eklemek KESİNLİKLE YASAKTIR**.
- Model, önce mevcut içeriği taramalı; yeni bilginin hangi mevcut başlığın/fonksiyonun bir uzantısı veya revizyonu olduğunu belirlemeli ve değişikliği doğrudan ilgili yerin içine **merge (entegre)** etmelidir.

### B. Tekrar ve Çelişki Budama (Deduplication & Conflict Pruning)
- Aynı amaca hizmet eden mükerrer ifadeler elenmeli, en yalın ve net hali korunmalıdır.
- Yeni bir talep eski bir kuralla çatışıyorsa, iki kural alt alta bırakılamaz. Çelişki çözülmeli; eğer mimari bir belirsizlik varsa pilota net bir soru yöneltilerek onay alınmalıdır.

### C. Hiyerarşi Koruma ve Periyodik Temizlik (Refactoring)
- Kural ve kod dosyaları daima mantıksal bir hiyerarşide (Genel İlkeler -> Modüller -> Detaylar) tutulmalıdır. Dağılan yapılar periyodik olarak derlenip toparlanmalıdır.





<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
