# VOLTFLOW ERP — Kullanıcı, Ekran ve Çekirdek Akış Haritası

Bu belge, kullanıcıların hangi ekrana eriştiğini, hangi happy path'leri tetiklediğini ve her akışın çekirdek servis/veri katmanına nasıl ulaştığını gösterir. Ayrıntılı iş kuralları için [OPERATIONAL_INTERACTION_MAP.md](OPERATIONAL_INTERACTION_MAP.md) kaynak şartnamedir.

## 1. Rol modeli ve erişim yüzeyi

| Rol | Durum | Ekranlar | Yetki sınırı |
| --- | --- | --- | --- |
| OFİS | Aktif tek kullanıcı türü | Tüm istasyonlar ve tüm akışlar | Bugün tüm operasyonları yürütür |
| USTA | Gelecek faz | Mobil Saha Günlüğü | Kendi günlük/mesai/sarfiyat bildirimleri |
| İŞÇİ | Gelecek faz | Mobil Saha Günlüğü | Kendine atanmış saha bildirimleri |
| ÇIRAK | Gelecek faz | Mobil Saha Günlüğü | Kısıtlı saha bildirimi |

> Not: Canlı yetki denetimi henüz servis/route seviyesinde rol kontrolü olarak bağlanmış değildir. Bugün bu, tek OFİS kullanıcısı için bilinçli bir sadeleştirmedir; saha kullanıcıları açıldığında RBAC zorunlu olacaktır.

## 2. Ekran ağacı

```text
Ana uygulama (/)
├─ Bugün — PatronDashboard
│  └─ günlük kasa, alacak, kritik stok ve bekleyen saha günlükleri
├─ Tezgâh Satış — PosTerminal
│  ├─ satış / iade / fiş / çevrimdışı kuyruk
│  └─ hızlı malzeme açma
├─ Mal Kabul — ProcurementStation
│  ├─ fatura kabulü / taslak / malzeme açma
│  └─ tedarikçi iadesi / stok düzeltmesi
├─ Operasyon & Şantiye — OperationsHub
│  ├─ şantiye / hakediş / sevkiyat
│  ├─ iş emri / tamamla / tahsilat
│  └─ cariler / kasa / gün sonu
├─ Patron Masası — PatronDashboard
│  └─ saha günlüğü onayı ve özet metrikler
└─ Mobil Saha Günlüğü — FieldLogMobile
   └─ mesai, iş özeti ve sarfiyat bildirimi
```

### Responsive çalışma alanı kuralı

- **Geniş ekran:** POS, katalog/ana iş alanı ile sabit sağ sepet-inspector panelini yan yana gösterir.
- **Tablet:** Sol navigasyon ikon rayına daralır; ana iş alanı korunur ve inspector gerektiğinde açılır.
- **Mobil:** `Bugün`, `Satış`, `Mal Kabul` ve `Operasyon` alttaki sabit navigasyondan seçilir. POS sepeti birincil navigasyon değildir; görünür `Sepet` eylemi veya yüzen tutar kapsülü ile sağdan açılır.
- **Odak:** Inspector yalnızca açıkça çağrıldığında mobilde ekrana gelir; kullanıcıyı beklenmedik şekilde başka bir bağlama taşımaz.
- **Ortak yüzey:** Mal Kabul, Operasyon, saha günlüğü ve günlük özet aynı kontur, durum rengi ve modal odak katmanını paylaşır.

## 3. Ortak çekirdek ve çıkış kuralları

```text
Kullanıcı → React ekranı → /api/* route → feature service → db.transaction → PostgreSQL
                               ├─ başarı: createSuccessResponse
                               ├─ iş kuralı/doğrulama hatası: createErrorResponse
                               ├─ satış tekrar isteği: withExecutionGuard
                               └─ POS ağ kesintisi: IndexedDB outbox → tekrar eşitleme
```

- Yazma işlemlerinin çoğu `db.transaction` içindedir; hata atılırsa işlem rollback olur ve kalıcı yarım kayıt bırakmamalıdır.
- Satış, `x-idempotency-key`/fatura numarasıyla tekrar çalıştırmaya karşı `withExecutionGuard` kullanır. Önceki başarılı sonuç yeniden döner; askıdaki işlem açıkça bloklanır.
- İşlemsel geri alma, ayrı bir mutasyonla yapılır: satış iadesi/iptali stok, kasa veya cari etkisini ters kayıtla düzeltir. Taslak ise henüz stok/cari etkisi üretmeden çıkış sağlar.
- Okuma/çıktı akışları (listeleme, yazdırma, denetim, WhatsApp) veri mutasyonu yapmadan biter.

## 4. Happy path matrisi

Durum anahtarı: **T** = transaction rollback, **D** = domain ters kaydı/işlemsel geri alma, **O** = offline outbox, **R** = salt-okuma/çıktı.

### 4.1 Tezgâh satış

| HP | Tetikleyen rol/ekran | Çatallanma | Çekirdek rota | Exit / rollback |
| --- | --- | --- | --- | --- |
| 1.1 Nakit satış | PATRON, OFİS/SEKRETER · POS F8 | Stok yeterli / yetersiz | `POST /api/sales` → `completeCounterSale` | Fiş + kasa girişi; yetersiz stok **T** |
| 1.2 Kart satış | PATRON, OFİS/SEKRETER · POS F9 | Kart tahsilatı | Aynı rota | Fiş + kart kasası; hata **T** |
| 1.3 Açık hesap | PATRON, OFİS/SEKRETER · POS F10 | `OPEN_ACCOUNT` | Aynı rota | Cari borç artar, nakit kasa değişmez; hata **T** |
| 1.4 İskonto | PATRON · POS indirim modali | İndirim toplamı | Aynı rota | İndirimli fatura; satış doğrulama hatası **T** |
| 1.5 Hızlı malzeme açma | PATRON, OFİS/SEKRETER · POS hızlı ekle | Yeni kart / mevcut kart | `POST /api/materials` → `createMaterial` | Kart açılır veya hata zarfı |
| 1.6 Peşin iade | PATRON · POS iade | İade türü `CASH` | `DELETE /api/sales` → `refundSale` | Stok +, kasa çıkışı **D/T** |
| 1.7 Açık hesap iadesi | PATRON · POS iade | İade türü `CREDIT_ACCOUNT` | Aynı rota | Stok +, cari borç azalır **D/T** |
| 1.8 Fiş yeniden yazdırma | PATRON, OFİS/SEKRETER · Son Fişler | Fiş seçimi | `GET /api/sales` → `listSalesInvoices` | Yazdırma; **R** |
| 1.9 Tam iptal | PATRON · Son Fişler | İptal nedeni / zaten iptal-iade edilmiş | `DELETE /api/sales` → `refundSale` | İade ile eşdeğer ters kayıt **D/T** |
| 1.10 Çevrimdışı satış | PATRON, OFİS/SEKRETER · POS | Ağ var / ağ yok | `apiCallWithOfflineFallback` → `/api/sales` | Sunucu başarısı veya IndexedDB outbox **O** |

### 4.2 Mal kabul ve stok

| HP | Tetikleyen rol/ekran | Çatallanma | Çekirdek rota | Exit / rollback |
| --- | --- | --- | --- | --- |
| 2.1 Fatura kabul | PATRON, OFİS/SEKRETER · Mal Kabul | Dip toplam farkı ≤ 0,05 / değil | `POST /api/procurement` → `acceptSupplierInvoice` | Stok +, tedarikçi borcu; kural ihlali **T** |
| 2.2 Maliyet kalkanı | PATRON, OFİS/SEKRETER · Mal Kabul kalemi | Satış fiyatı maliyet eşiğinin üstü / altı | Aynı rota | Kabul veya zararına satış blokajı **T** |
| 2.3 Yeni katalog kartı | PATRON, OFİS/SEKRETER · Mal Kabul hızlı ekle | Yeni malzeme | `POST /api/materials` → `createMaterial` | Kart açılır; hata zarfı |
| 2.4 Taslak fatura | PATRON, OFİS/SEKRETER · Taslak kaydet | `isDraft: true` | `/api/procurement` → `acceptSupplierInvoice` | Taslak; stok/cari etkisi yok |
| 2.5 Taslağı resmileştirme | PATRON, OFİS/SEKRETER · Taslaklar | Tamamlanmış dip toplam | Aynı rota | Kabul etkileri veya **T** |
| 2.6 Tedarikçiye iade | PATRON, OFİS/SEKRETER · İade modali | Stok yeterli / yetersiz | `PATCH /api/materials` → `adjustStock` | Stok -, tedarikçi düzeltmesi hedefi; stok hatası **T** |
| 2.7 Fire/sayım farkı | PATRON, OFİS/SEKRETER · Sayım modali | Geçerli miktar / negatif stok | Aynı rota | Stok hareketi veya **T** |

### 4.3 Şantiye ve saha

| HP | Tetikleyen rol/ekran | Çatallanma | Çekirdek rota | Exit / rollback |
| --- | --- | --- | --- | --- |
| 3.1 Şantiye açma | PATRON, OFİS/SEKRETER · Operasyon/Şantiyeler | Şablon ve müşteri | `POST /api/projects` → `createProject` | Proje + aşamalar; **T** |
| 3.2 Puantaj/sarfiyat | USTA, ÇIRAK · Mobil; PATRON/OFİS · telefon kaydı | Bekleyen / patron onaylı | `/api/field-logs` → `submitDailyLog`; sonra `POST .../[id]/approve` → `reviewAndApproveDailyLog` | Bekleyen günlük veya onayla stok düşümü; **T** |
| 3.3 Hakediş | PATRON, OFİS/SEKRETER · Şantiye | Aşama güncelleme / faturalama | `POST /api/projects` → `createProgressBilling` | Cari borç artışı; doğrulama hatası |
| 3.4 Şantiyeye sevkiyat | PATRON, OFİS/SEKRETER · Sevkiyat modali | Yeterli stok / blokaj | `PATCH /api/materials` → `adjustStock` | Stok -, sevkiyat kaydı; **T** |

### 4.4 İş emri

| HP | Tetikleyen rol/ekran | Çatallanma | Çekirdek rota | Exit / rollback |
| --- | --- | --- | --- | --- |
| 4.1 Arıza kaydı | PATRON, OFİS/SEKRETER · İş Emirleri | Yeni iş emri | `POST /api/work-orders` → `createWorkOrder` | İş emri + A5 çıktı |
| 4.2 İş emri kapatma | PATRON, OFİS/SEKRETER · İş emri detayı | İmza/malzeme / eksik veri | Aynı rota `COMPLETE` → `completeWorkOrder` | Tamamlanır, malzeme düşer; **T** |
| 4.3 İş emrini tahsil etme | PATRON, OFİS/SEKRETER · İş emri tahsilat modali | Nakit / kart | `/api/sales` → `completeCounterSale` | Satış fişi + tahsilat; **T**, satışta idempotency |

### 4.5 Cari ve kasa

| HP | Tetikleyen rol/ekran | Çatallanma | Çekirdek rota | Exit / rollback |
| --- | --- | --- | --- | --- |
| 5.1 Nakit tahsilat | PATRON, OFİS/SEKRETER · Cari | Nakit | `POST /api/finance` `COLLECT` → `collectCustomerDebt` | Cari -, kasa +; **T** |
| 5.2 Havale tahsilat | PATRON, OFİS/SEKRETER · Cari | Banka/havale | Aynı rota | Cari -, banka kasası +; **T** |
| 5.3 WhatsApp ekstre | PATRON, OFİS/SEKRETER · Cari | Telefon mevcut / eksik | İstemci `wa.me` URL üretimi | Harici WhatsApp çıkışı; **R** |
| 5.4 Tedarikçi tediye | PATRON, OFİS/SEKRETER · Kasa | Banka / nakit | `POST /api/finance` `EXPENSE` → `recordExpenseOrSupplierPayment` | Tedarikçi borcu -, kasa -; **T** |
| 5.5 Genel masraf | PATRON, OFİS/SEKRETER · Kasa | Masraf kategorisi | Aynı rota | Kasa -; **T** |
| 5.6 Gün sonu | PATRON · Kasa | Sayım uyumlu / fark | `GET /api/finance` → `getDerivedCashboxSummary` | Mutabakat/çıktı; **R** (kapanış kilidi ayrı domain gerektirir) |
| 5.7 Defter denetimi | PATRON · Kasa/Denetle | Hesaplanan bakiye / fark | `getDerivedCustomerBalance` | Denetim sonucu; **R** |

## 5. Haritanın bilinçli sınırları

- Tablodaki önceki PATRON/SEKRETER etiketleri, mevcut sürümde tek OFİS kullanıcısını ifade eder. Saha fazında her akış yeniden rol bazlı ayrıştırılacaktır.
- Route'larda henüz oturumdan rol çözümü ve RBAC guard uygulanmadığı için kullanıcı kimliği bazı istemci çağrılarında sabit örnek değerlerle taşınır.
- Gün sonu, WhatsApp ve basılı evrak akışları kullanıcı deneyiminde var; bunların dış sistem teslimi/kalıcı kapanış kaydı ayrı uygulama sözleşmesi olarak netleştirilmelidir.
