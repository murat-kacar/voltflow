import { AuthCard } from "@/components/auth-card";

export default function HomePage() {
  return (
    <main className="container">
      <div className="hero-card">
        <div className="badge">
          <span>●</span> GAG Protokolü Aktif (Graphify &gt; Antigravity &gt;
          Gemini)
        </div>
        <h1 className="title">Fullstack Platform Hazır</h1>
        <p className="subtitle">
          Deterministik, tip güvenli ve kanonik standartlara (DDD, AAA, Zod,
          Drizzle) tam uyumlu geliştirme ortamı başarıyla yapılandırıldı.
        </p>

        <div className="grid">
          <div className="stat-item">
            <div className="stat-label">Framework</div>
            <div className="stat-value">Next.js 16.3.4</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Dil</div>
            <div className="stat-value">TypeScript 7.0.2</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Paket Yöneticisi</div>
            <div className="stat-value">pnpm 12.3.4</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">ORM &amp; Veritabanı</div>
            <div className="stat-value">Drizzle + PostgreSQL 18</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Kimlik Yönetimi</div>
            <div className="stat-value">Better-Auth 1.7</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Linter &amp; Format</div>
            <div className="stat-value">Biome 2.5</div>
          </div>
        </div>

        <section className="auth-section">
          <AuthCard />
        </section>
      </div>
    </main>
  );
}
