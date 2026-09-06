---
name: graphify-intelligence
description: GAG Protokolünün 1. kademesi olan Graphify kod bilgi grafiğini (Code Knowledge Graph) sorgulama ve senkronize etme becerisi.
---

# Graphify İntelligence Protokolü

Bu beceri, projenin deterministik ilişkisel grafiğini (`graphify-out/graph.json` ve `graphify-out/GRAPH_REPORT.md`) okumak ve güncellemek için kullanılır.

## 1. Grafiği Başlatma veya Güncelleme
Eğer projede `graphify-out/graph.json` yoksa veya yapısal (sınıf/fonksiyon/arayüz) değişiklik yapıldıysa:
```powershell
pnpm run graph
```
Bu komut sıfır LLM token maliyetiyle yerel Tree-sitter AST motorunu çalıştırır ve `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md` ve görsel `graphify-out/graph.html` dosyalarını üretir. Ayrıca `graphify tree` komutu ile katlanabilir hiyerarşik ağaç (`graphify-out/GRAPH_TREE.html`) üretilebilir.

## 2. Grafikten Bilgi Çekme Yöntemi
- **Etki Alanı (Blast Radius):** Değiştirilecek fonksiyonu hangi dosyaların import ettiğini ve kimlerin çağırdığını `graphify-out/graph.json` içindeki bağımlılık düğümlerinden bul.
- **Merkezi Düğümler (God Nodes):** `graphify-out/GRAPH_REPORT.md` içindeki aşırı bağlantılı sınıfları incele. Bu sınıflara dokunurken yan etkileri önceden planla.
- **Kör Arama Yasağı:** Dosya aramak için asla `grep_search` ile tahmin yürütme; önce graftaki rotayı takip et.

## 3. Mimari Bekleyen İşler ve Ertelenmiş Kontratlar (Deferred Domain Contracts)
Grafta `src/contracts/deferred-domain-contracts.ts` altında tanımlı `DEFERRED_ARCHITECTURAL_REGISTRY` ve ilgili kontrat arayüzleri (`IdempotencyExecutionContract`, `AuditTrailRecord`, `RbacPolicyContract`, `EmailTransportContract`, `DistributedRateLimiterContract`, `RequestContextContract`, `DatabaseIntegrationTestLifecycle`) yer alır.
- Yeni bir domain dilimi eklerken graftan bu kontratların etki alanını ve gereksinimlerini kontrol et.
- İlgili domain devreye girdiğinde, bu kontratları karşılayan somut servisleri (`src/features/<slice>/`) bağla.

