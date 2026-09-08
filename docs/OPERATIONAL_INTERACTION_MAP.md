# ⚡ VOLTFLOW ERP: BÜYÜK OPERASYONEL ETKİLEŞİM VE SÜREÇ HARİTASI
> Bu belge, Voltflow ERP sisteminin tüm kullanıcı rolleri, istasyonları, UI tetikleyicileri (Activators), kullanıcı adımları (UX Steps), çekirdek fonksiyonları, parametre override'ları ve çatallanmalarını (Forks) tanımlayan ana operasyonel şartnamedir. Kullanıcı Kılavuzu (User Guide) bu belgeden türetilecektir.

> Kullanıcı → ekran → happy path → çekirdek rota; geri alma ve çıkış durumlarının özet matrisi için [USER_SCREEN_HAPPYPATH_MAP.md](USER_SCREEN_HAPPYPATH_MAP.md) belgesine bakın.

> Arayüz kuralı: Geniş ekranda sol çalışma alanı navigasyonu, ana görev yüzeyi ve bağlamsal inspector birlikte çalışır. Mobilde `Bugün`, `Satış`, `Mal Kabul` ve `Operasyon` alttaki sabit navigasyondan seçilir. POS sepeti, istasyon navigasyonundan ayrı bir sağ paneldir ve yalnızca kullanıcının görünür `Sepet` eylemiyle açılır.

---

## 👥 ROLLER & ÇALIŞMA PRENSİBİ
1. **OFİS:** Bugünkü tek operasyon kullanıcısıdır. Tezgâh, mal kabul, şantiye, iş emri, cari ve kasa dahil tüm istasyonları yürütür.
2. **Gelecek saha rolleri (bekleyen):** USTA, İŞÇİ ve ÇIRAK kullanıcıları saha bildirimleri için açılacak; ayrı kullanıcı türleri ve en az yetki politikaları o fazda uygulanacaktır.
*(Bugün tek operasyon kullanıcısı OFİS’tir. Denetim kayıtlarında actor, istemciden gelen rol metninden değil Better Auth oturumundaki kullanıcı kimliğinden türetilir. Gelecekte saha rolleri için RBAC ayrıca açılacaktır.)*

---

## 🖥️ 3 BÜYÜK OPERASYONEL İSTASYON
1. **İstasyon 1: [ 🛒 Tezgâh Satış (POS Terminal) ]** - Müşteriyi bekletmeden 10 saniyede fiş kesme, nakit/kart/veresiye ve iade.
2. **İstasyon 2: [ 📥 Mal Kabul & Stok Giriş ]** - Masadaki kağıt faturanın dip toplamını kuruşu kuruşuna denetleyen izole sıfır hata istasyonu.
3. **İstasyon 3: [ ⚡ Operasyon & Şantiye Masası ]** - Şantiyeler (puantaj & hakediş), arıza iş emirleri, cari tahsilatlar ve kasa.

---

# 🗺️ 31 OPERASYONEL HAPPY PATH LİSTESİ

## BÖLÜM 1: TEZGÂH & HIZLI SATIŞ İSTASYONU (POS)

### [HP-1.1] Standart Perakende Peşin Satış (Nakit)
* **UI Tetikleyici (Activator):** Tezgâh Ekranı -> Barkod Okutma / Arama -> `[F8 Nakit]` Butonu veya `F8` Tuşu.
* **UX Akışı:** Sepete ürünler eklenir -> Toplam tutar hesaplanır -> `F8` basılır -> Fiş animasyonu oynar.
* **Çekirdek Fonksiyon:** `saleService.completeCounterSale(input)`
* **Parametreler & Override:**
  ```ts
  {
    customerId: "CUST-WALKIN", // Sentinel müşteri (Zero-Null)
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    discountTotal: 0,
    items: [{ materialId, quantity, unitPrice, vatRate: 20 }]
  }
  ```
* **Çatallanma (Forks):** Stok kontrolü (Yetersiz ise işlem engellenir).
* **Nihai Sonuç (Finality):** Stoktan -Q düşer, `cashbox_transactions` tablosuna `INFLOW / CASH` yazılır, 80mm termal fiş fırlar.

---

### [HP-1.2] Kredi Kartı ile Perakende Satış
* **UI Tetikleyici (Activator):** Tezgâh Ekranı -> `[F9 Kredi Kartı]` Butonu.
* **UX Akışı:** Ürünler sepete atılır -> `F9` basılır -> POS slip referansı girilir (opsiyonel) -> Tamamla.
* **Çekirdek Fonksiyon:** `saleService.completeCounterSale(input)`
* **Parametreler & Override:**
  ```ts
  { customerId: "CUST-WALKIN", paymentMethod: "CREDIT_CARD", paymentStatus: "PAID" }
  ```
* **Çatallanma (Forks):** Kasa yönlendirmesi `cashbox_transactions` içinde `CREDIT_CARD` olarak ayrışır.
* **Nihai Sonuç (Finality):** Stok düşer, banka/kart bakiyesi artar, fiş basılır.

---

### [HP-1.3] Müteahhit / Ustaya Açık Hesap (Veresiye) Çıkışı
* **UI Tetikleyici (Activator):** Müşteri Seçici (`@Demirİnşaat`) -> `[F10 Açık Hesap]` Butonu.
* **UX Akışı:** Sepet doldurulur -> Müşteri aranıp seçilir -> Sağ panelde müşterinin güncel borcu kırmızı görünür -> `Açık Hesap` seçilir -> Onayla.
* **Çekirdek Fonksiyon:** `saleService.completeCounterSale(input)`
* **Parametreler & Override:**
  ```ts
  {
    customerId: "cust_demir_insaat",
    paymentMethod: "OPEN_ACCOUNT",
    paymentStatus: "UNPAID"
  }
  ```
* **Çatallanma (Forks):** Kasa etkilenmez! `customer_transactions` tablosuna `DEBIT_SALE` (Borç) yazılır, `customers.currentBalance` artırılır.
* **Nihai Sonuç (Finality):** Stok düşer, müşterinin cari borcu artar, çift nüsha teslim fişi çıkar (biri imzalatılır).

---

### [HP-1.4] Tezgâhta Anlık İskonto / Tutar Yuvarlama ("Patron İndirimi")
* **UI Tetikleyici (Activator):** Sepet Özeti -> `[✂️ Düz Hesap Yap / İskonto]` Butonu.
* **UX Akışı:** Tutar 1.240 ₺'dir -> Butona basılır -> "1.200 TL düz yap" yazılır -> `Enter`.
* **Çekirdek Fonksiyon:** `saleService.completeCounterSale(input)`
* **Parametreler & Override:**
  ```ts
  { discountTotal: 40.0, grandTotal: 1200.0 }
  ```
* **Çatallanma (Forks):** `sales_invoices.discount_total` alanına 40 ₺ işlenir; KDV matrahı kalan 1200 ₺ üzerinden oranlanır.
* **Nihai Sonuç (Finality):** Fişte *"Uygulanan İndirim: 40,00 ₺"* satırı görünür.

---

### [HP-1.5] Kayıtsız Malzemeyi Satış Esnasında Anında Açma (Inline Quick-Add)
* **UI Tetikleyici (Activator):** Arama Çubuğu -> Bulunamadı -> `[+ Hızlı Ürün Ekle]` Butonu.
* **UX Akışı:** Arama çubuğunun hemen altına mini form iner (`Ad`, `Birim Fiyat`, `Stok`) -> Kaydet.
* **Çekirdek Fonksiyon:** `inventoryService.createMaterial(input)` -> ardından `cart.add(createdItem)`.
* **Parametreler & Override:**
  ```ts
  { name: "Wago 3'lü Klemens", salePriceWithVat: 15.0, quantity: 100, category: "SARF" }
  ```
* **Çatallanma (Forks):** Sepet sıfırlanmaz; yeni ürün DB'ye kaydedilir ve açık olan sepete 1 adet eklenir.
* **Nihai Sonuç (Finality):** Satış kesintiye uğramadan devam eder.

---

### [HP-1.6] Müşteriden İade Alma (Peşin İade)
* **UI Tetikleyici (Activator):** Tezgâh Menüsü -> `[↩️ İade Al]` Butonu -> Fiş No Gir.
* **UX Akışı:** Müşterinin getirdiği 1 top açılmamış kablo seçilir -> "Nakit İade Et" denir.
* **Çekirdek Fonksiyon:** `saleService.refundSale(input)`
* **Parametreler & Override:**
  ```ts
  { invoiceId: "FS-0014", returnItems: [{ materialId, quantity: 1 }], refundType: "CASH" }
  ```
* **Çatallanma (Forks):** Depo stoğu artırılır (`RETURN_IN`), `cashbox_transactions` tablosuna `OUTFLOW / REFUND` yazılır.
* **Nihai Sonuç (Finality):** Stok +1 artar, kasa bakiyesi düşer, iade gider pusulası basılır.

---

### [HP-1.7] Müşteriden İade Alıp Cari Borcundan Düşme (Açık Hesap İadesi)
* **UI Tetikleyici (Activator):** Müşteri Ekstresi -> Satır Aksiyonu -> `[↩️ Cariye İade İşle]`.
* **UX Akışı:** Müteahhidin artan malzemeleri seçilir -> "Cariden Düş" denir.
* **Çekirdek Fonksiyon:** `saleService.refundSale(input)`
* **Parametreler & Override:**
  ```ts
  { refundType: "CREDIT_ACCOUNT", customerId: "cust_demir_insaat" }
  ```
* **Çatallanma (Forks):** Kasadan para çıkmaz! Müşterinin cari hesabına alacak (`CREDIT_ADJUSTMENT`) işlenir, borcu azalır.
* **Nihai Sonuç (Finality):** Stok artar, müşterinin kalan borcu düşer.

---

### [HP-1.8] Geçmiş Fişi Yeniden Yazdırma
* **UI Tetikleyici (Activator):** Tezgâh Sağ Üst -> `[📜 Son Fişler]` -> Yazdır İkonu.
* **UX Akışı:** Bugün kesilen son 10 fiş listelenir -> İlgili fişe tıklanır -> Termal önizleme açılır -> `Yazdır`.
* **Çekirdek Fonksiyon:** Read-only (`salesInvoices` select).
* **Nihai Sonuç (Finality):** Stok veya para hareketi olmadan termal çıktı alınır.

---

### [HP-1.9] Hatalı Fişin Tam İptali
* **UI Tetikleyici (Activator):** Son Fişler -> `[⚠️ Fişi İptal Et]` (Patron Onayıyla).
* **UX Akışı:** Yanlış kesilen fiş seçilir -> İptal nedeni yazılır -> Onayla.
* **Çekirdek Fonksiyon:** `saleService.refundSale({ invoiceId, fullCancel: true })`.
### [HP-1.10] İnternet Kesintisinde Çevrimdışı Satış (IndexedDB Outbox Mührü)
* **UI Tetikleyici (Activator):** Tezgâh Ekranı -> Ağ Kesik / Çevrimdışı -> `[F8 Peşin / F9 Kart / F10 Açık Hesap]`.
* **UX Akışı:** İnternet kopsa dahi tezgâh durmaz -> Sepet onaylanır -> Fiş ekranında sarı *"⚡ ÇEVRİMDİŞİ MÜHÜRLENDİ"* mührü belirir -> Üst HUD barındaki rozet *"⚡ Çevrimdışı (1 Bekleyen)"* durumuna geçer.
* **Çekirdek Fonksiyon:** `apiCallWithOfflineFallback("/api/sales", payload)` -> `addOutboxRecord(record)` (IndexedDB `outbox` tablosuna ikili kayıt).
* **Çatallanma (Forks):** Ağ geldiğinde `window.online` veya HUD'daki `[⚡ Şimdi Eşitle]` butonu tetiklenir; kuyruk otomatik işlenir.
* **Nihai Sonuç (Finality):** Satış kesintisiz tamamlanır, internet geldiğinde PostgreSQL'e aktarılır ve çift taraflı defter güncellenir.

---

## BÖLÜM 2: MAL KABUL & STOK GİRİŞ İSTASYONU

### [HP-2.1] Kağıt Faturadan Standart Mal Kabul & Dip Toplam Sağlaması
* **UI Tetikleyici (Activator):** Mal Kabul Ekranı -> `[📄 Kağıt Fatura Genel Toplamı: 3.132,00 ₺]` doldurma -> `[✅ Faturayı Onayla & Stoğa Al]`.
* **UX Akışı:** Toptancı seçilir -> Masadaki kağıttan kalemler girilir -> Sistem `3.132,00 ₺` hesaplar -> Kalkan yeşil yanar (`🛡️ Fark: 0,00 ₺`) -> Onayla.
* **Çekirdek Fonksiyon:** `procurementService.acceptSupplierInvoice(input)`
* **Parametreler & Override:**
  ```ts
  {
    supplierId: "sup_oznur",
    expectedGrandTotal: 3132.0,
    isDraft: false,
    items: [{ materialId, quantity: 50, unitCostWithoutVat: 32.5, vatRate: 20 }]
  }
  ```
* **Çatallanma (Forks):** Fark > 0.05 ₺ ise fonksiyon hata fırlatır ve işlemi DB seviyesinde kilitler!
* **Nihai Sonuç (Finality):** Depo stokları artar (`PURCHASE_IN`), toptancı carisine borç kaydedilir.

---

### [HP-2.2] Fiyat Zammı Gelen Malzemenin Satış Fiyatını Güncelleme (Zararına Satış Kalkanı)
* **UI Tetikleyici (Activator):** Kalem Satırı -> `Yeni Satış Fiyatı` sütunu.
* **UX Akışı:** Alış fiyatı 60 TL olan ürünün satış fiyatına 50 TL yazılırsa -> UI kırmızı alarm verir.
* **Çekirdek Fonksiyon:** `procurementService.acceptSupplierInvoice(input)` (Maliyet kalkanı).
* **Çatallanma (Forks):** `newRetailSalePriceWithVat < unitCostWithoutVat * 1.20` ise işlem kilitlenir.
* **Nihai Sonuç (Finality):** Zararına satış engellenir, kâr marjı korunur.

---

### [HP-2.3] Dükkana İlk Defa Giren Yeni Ürünün Katalog Açılışı & Raf Tanımı
* **UI Tetikleyici (Activator):** Mal Kabul Kalem Tablosu -> `[+ Listede Olmayan Ürün]`.
* **UX Akışı:** Yeni ürünün adı, birimi, rafı (`Raf C-2`) girilir -> Fatura satırına eklenir.
* **Çekirdek Fonksiyon:** `inventoryService.createMaterial` + `purchaseInvoiceItems.insert`.
* **Nihai Sonuç (Finality):** Ürün hem stok kartı olarak açılır hem de faturayla ilk stok adedi girer.

---

### [HP-2.4] Çok Kalemli Faturanın Yarım Kalması & Taslak (Draft) Kaydı
* **UI Tetikleyici (Activator):** Mal Kabul Ekranı -> `[💾 Taslak Olarak Kaydet]` Butonu.
* **UX Akışı:** 20 koli mal indi, acil durum çıktı -> Taslak kaydet denir -> Çıkılır.
* **Çekirdek Fonksiyon:** `procurementService.acceptSupplierInvoice(input)`.
* **Parametreler & Override:**
  ```ts
  { isDraft: true, paymentStatus: "DRAFT" }
  ```
* **Çatallanma (Forks):** `isDraft: true` olduğu için `materials` stoğu artmaz, toptancıya borç yazılmaz.
* **Nihai Sonuç (Finality):** Taslak sunucuya `DRAFT` durumuyla yazılır; stok ve cari değişmez. Tamamlama akışı ayrıca doğrulanmalıdır.

---

### [HP-2.5] Taslaktaki Faturayı Tamamlama & Resmileştirme
* **UI Tetikleyici (Activator):** Mal Kabul -> Taslak Fatura Seçimi -> `[Stoğa Al]`.
* **UX Akışı:** Kalan koliler girilir -> Dip toplam eşitlenir -> `Onayla`.
* **Çekirdek Fonksiyon:** `procurementService.acceptSupplierInvoice({ isDraft: false })`.
* **Nihai Sonuç (Finality):** Durum `PENDING` olur, stoklar depoya yansır.

---

### [HP-2.6] Toptancıya Malzeme İadesi (Kusurlu/Kırık Malzeme Çıkışı)
* **UI Tetikleyici (Activator):** Mal Kabul Menüsü -> `[Tedarikçiye İade]`.
* **UX Akışı:** Kırık çıkan 2 adet armatür seçilir -> Toptancı faturasından düşülür.
* **Çekirdek Fonksiyon:** `inventoryService.adjustStock({ movementType: "PURCHASE_RETURN_OUT" })`.
* **Nihai Sonuç (Finality):** Stok -2 düşer, toptancıya borcumuz azalır.

---

### [HP-2.7] Depo Sayım Farkı / Fire / Hurda Düşümü
* **UI Tetikleyici (Activator):** Stok Yönetimi -> Malzeme Kartı -> `[Sayım Farkı / Fire Gir]`.
* **UX Akışı:** Rafta 80 metre kablo bulundu (sistemde 100 metre) -> -20 metre "Kablo firesi" yazılır.
* **Çekirdek Fonksiyon:** `inventoryService.adjustStock(input)`.
* **Parametreler & Override:**
  ```ts
  { movementType: "ADJUSTMENT", quantityChange: -20, notes: "Kablo firesi" }
  ```
* **Nihai Sonuç (Finality):** Stok 80'e eşitlenir, finansal cari etkilenmez.

---

## BÖLÜM 3: OPERASYON & ŞANTİYE MASASI - Şantiyeler & İhaleler

### [HP-3.1] Şablonlu Yeni Şantiye Taahhüt Sözleşmesi Açma
* **UI Tetikleyici (Activator):** Operasyon Masası -> Şantiyeler -> `[+ Yeni Şantiye Aç]`.
* **UX Akışı:** Şablon seçilir (`Apartman Şablonu`) -> Müşteri (`Demir İnşaat`), Bütçe (`450.000 TL`) girilir.
* **Çekirdek Fonksiyon:** `projectService.createProject(input)`.
* **Nihai Sonuç (Finality):** Şantiye kartı açılır, aşamalar %0 olarak başlar.

---

### [HP-3.2] Sahadan Telefonla Bildirilen Puantaj & Sarfiyatı Sisteme İşleme
* **UI Tetikleyici (Activator):** Operasyon Masası -> `[📞 Sahadan Bildirilen Puantajı İşle]` Butonu.
* **UX Akışı:** Ofis kullanıcısı arama bilgisini alır -> Şantiye seçilir -> çalışan sayısı, saat ve sarf girilir -> Kaydet.
* **Çekirdek Fonksiyon:** `fieldLogService.submitDailyLog` + anında `reviewAndApproveDailyLog`.
* **Çatallanma (Forks):** Kayıt önce `PENDING_REVIEW` kuyruğuna girer; onay sırasında stok yeterliliği kontrol edilir ve hareket atomik olarak yazılır.
* **Nihai Sonuç (Finality):** Ana depodan kablo düşer, şantiyenin sarfiyat maliyeti artar.

---

### [HP-3.3] Şantiyeye Hakediş Kesme & A4 İcmal Cetveli Basma
* **UI Tetikleyici (Activator):** Şantiye Kartı -> `[📑 Hakediş Kes & İcmal Bas]` Butonu.
* **UX Akışı:** Tamamlanan aşama işaretlenir -> Hakediş tutarı hesaplanır (`75.000 ₺`) -> Onayla.
* **Çekirdek Fonksiyon:** `projectService.createProgressBilling(input)`.
* **Çatallanma (Forks):** `customer_transactions` tablosuna `DEBIT_PROGRESS_BILLING` yazılır. Müteahhidin cari borcu artar.
* **Nihai Sonuç (Finality):** A4 formatında kaşeli/imzalı Hakediş İcmal Cetveli yazıcıdan çıkar.

---

### [HP-3.4] Şantiyeye Depodan Toplu Malzeme Sevkiyatı
* **UI Tetikleyici (Activator):** Şantiye Detayı -> `[📦 Şantiyeye Malzeme Sevk Et]`.
* **UX Akışı:** Şantiye kamyonetine yüklenen kablo ve borular seçilir -> Sevk et.
* **Çekirdek Fonksiyon:** `inventoryService.adjustStock({ movementType: "FIELD_CONSUMPTION_OUT" })`.
* **Nihai Sonuç (Finality):** Ana depodan stok düşer, şantiye irsaliyesi basılır.

---

## BÖLÜM 4: OPERASYON MASASI - Arıza & İş Emirleri

### [HP-4.1] Telefonla Gelen Arıza Talebini Kaydetme & A5 Pusula Basma
* **UI Tetikleyici (Activator):** Operasyon Masası -> `[+ Yeni Arıza / Servis Aç]`.
* **UX Akışı:** Müşteri arar -> Adres, telefon, arıza detayı girilir -> `A5 Pusula Bas` denir.
* **Çekirdek Fonksiyon:** `workOrderService.createWorkOrder(input)`.
* **Nihai Sonuç (Finality):** A5 İş Emri Pusulası yazıcıdan çıkar, ustanın panosuna asılır.

---

### [HP-4.2] Sahada Biten İşi Kapatma & Müşteri İmzası
* **UI Tetikleyici (Activator):** İş Emri Kartı -> `[✍️ Teslim Tutanağı & Kapat]`.
* **UX Akışı:** Usta işi bitirir, takılan parça girilir (`1x Röle`) -> Ekranda imza alanı açılır -> Kapat.
* **Çekirdek Fonksiyon:** `workOrderService.completeWorkOrder(input)`.
* **Çatallanma (Forks):** İş emrine eklenen malzeme miktarı stok yeterliliğiyle birlikte atomik sarf hareketi olarak düşer.
* **Nihai Sonuç (Finality):** İmzalı Hizmet ve Malzeme Teslim Tutanağı arşive girer.

---

### [HP-4.3] Arıza İş Emrini Tezgâh Satışına Dönüştürüp Peşin Tahsil Etme
* **UI Tetikleyici (Activator):** İş Emri Kartı -> `[💰 Kasadan Tahsil Et & Fiş Kes]`.
* **UX Akışı:** Parça ve işçilik bedeli (`1.190 ₺`) tezgâh sepetine aktarılır -> Fiş kesilir.
* **Çekirdek Fonksiyon:** `saleService.completeCounterSale({ saleType: "SERVICE_CALL" })`.
* **Nihai Sonuç (Finality):** Kasa artar, iş emri kapatılır, satış fişi basılır.

---

## BÖLÜM 5: OPERASYON MASASI - Finans, Cariler & Kasa

### [HP-5.1] Müşteriden Açık Hesap Borç Tahsilatı (Nakit)
* **UI Tetikleyici (Activator):** Cariler Tablosu -> İlgili Müşteri -> `[💰 Tahsilat Al]` Butonu.
* **UX Akışı:** Müşteri seçilir -> 10.000 ₺ girilir -> `Nakit` seçilir -> Onayla.
* **Çekirdek Fonksiyon:** `financeService.collectCustomerDebt(input)`.
* **Çatallanma (Forks - Double-Entry):**
  - `customers.currentBalance` -10.000 ₺ düşer.
  - `customer_transactions` tablosuna `CREDIT_CASH_PAYMENT` işlenir.
  - `cashbox_transactions` tablosuna `INFLOW / COLLECTION / CASH` (+10.000 ₺) işlenir.
* **Nihai Sonuç (Finality):** Kasadaki fiziki para artar, müşterinin borcu düşer, Tahsilat Makbuzu basılır.

---

### [HP-5.2] Müşteriden Banka / Havale Tahsilatı
* **UI Tetikleyici (Activator):** Tahsilat Modalı -> Ödeme Yöntemi: `[🏦 Banka / Havale]`.
* **UX Akışı:** Müşteri IBAN'a havale atar -> Dekont notu girilir -> Onayla.
* **Çekirdek Fonksiyon:** `financeService.collectCustomerDebt({ paymentMethod: "BANK_TRANSFER" })`.
* **Çatallanma (Forks):** Fiziki nakit kasa değişmez; `cashbox_transactions` içinde `BANK_TRANSFER` bakiyesi artar.
* **Nihai Sonuç (Finality):** Müşteri borcu düşer, banka hesabı artar.

---

### [HP-5.3] Müşteriye WhatsApp Bakiye Ekstresi Gönderme
* **UI Tetikleyici (Activator):** Cariler Tablosu -> `[📲 Ekstre]` Butonu.
* **UX Akışı:** Butona tıklanır -> Otomatik WhatsApp Web API bağlantısı açılır:
  * *"Sayın Demir İnşaat, güncel açık hesap borcunuz 75.000 TL'dir. Son ödemeniz: 10.000 TL."*
* **Çekirdek Fonksiyon:** Client-side URL generator (`https://wa.me/...`).
* **Nihai Sonuç (Finality):** Müşterinin cebine saniyeler içinde ekstre düşer.

---

### [HP-5.4] Toptancıya Cari Borç Ödemesi (Tediye / Havale)
* **UI Tetikleyici (Activator):** Kasa & Masraflar -> `[Toptancıya Ödeme Yap]`.
* **UX Akışı:** Toptancı seçilir -> 50.000 ₺ havale çıkışı girilir -> Onayla.
* **Çekirdek Fonksiyon:** `financeService.recordExpenseOrSupplierPayment(input)`.
* **Çatallanma (Forks):** Toptancının `suppliers.currentBalance` borcu düşer, banka kasasından çıkış yapılır.
* **Nihai Sonuç (Finality):** Toptancı borcumuz azalır.

---

### [HP-5.5] Dükkan Genel Masraf Kaydı (Akaryakıt / Yemek / Harçlık)
* **UI Tetikleyici (Activator):** Kasa Ekranı -> `[⛽ Akaryakıt (750 ₺)]` veya `[🍽️ Yemek (450 ₺)]` Bento Butonu.
* **UX Akışı:** Tek tıkla basılır -> Onaylanır.
* **Çekirdek Fonksiyon:** `financeService.recordExpenseOrSupplierPayment(input)`.
* **Nihai Sonuç (Finality):** Çekmecedeki nakitten 750 ₺ düşer, gün sonu kasa raporuna masraf olarak yazılır.

---

### [HP-5.6] Akşam Gün Sonu Kasa Sayımı & Mutabakat
* **UI Tetikleyici (Activator):** Kasa Masası -> `[🔒 Günü Kapat & Kasa Sayımı]`.
* **UX Akışı:** Çekmece açılır, nakit sayılır -> Sisteme yazılır -> Sistem farkı kontrol eder -> Günü Kapat.
* **Çekirdek Fonksiyon:** `financeService.getDerivedCashboxSummary()`.
* **Nihai Sonuç (Finality):** Günün cirosu kilitlenir, Z-raporu benzeri gün sonu dökümü basılır.

---

### [HP-5.7] Çift Taraflı Defter (Immutable Ledger) Bakiye Tutarlılık Denetimi
* **UI Tetikleyici (Activator):** Sistem Otomatik Denetimi (Veya Patron Masası "Denetle" Butonu).
* **UX Akışı:** Müşterinin ekrandaki borcu ile geçmiş tüm fatura/tahsilat kayıtlarının toplamı karşılaştırılır.
* **Çekirdek Fonksiyon:** `financeService.getDerivedCustomerBalance(customerId)`.
* **Nihai Sonuç (Finality):** %100 finansal denklik garantisi; sistemde kayıp/kaçak kuruş kalmaz.
