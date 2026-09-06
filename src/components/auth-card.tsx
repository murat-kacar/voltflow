"use client";

import { useState } from "react";
import { signIn, signOut, signUp, useSession } from "@/lib/auth-client";

export function AuthCard() {
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || "Kullanıcı",
        });
        if (res.error) {
          setErrorMessage(res.error.message || "Kayıt olurken bir hata oluştu");
        } else {
          setSuccessMessage("Kayıt başarılı! Oturum açılıyor...");
        }
      } else {
        const res = await signIn.email({
          email,
          password,
        });
        if (res.error) {
          setErrorMessage(
            res.error.message || "Giriş başarısız. Bilgilerinizi kontrol edin.",
          );
        } else {
          setSuccessMessage("Başarıyla giriş yapıldı!");
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="auth-card auth-loading">
        <div className="spinner" />
        <span>Oturum durumu kontrol ediliyor...</span>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="auth-card logged-in">
        <div className="auth-header">
          <div className="user-avatar">
            {session.user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="user-name">{session.user.name}</h3>
            <p className="user-email">{session.user.email}</p>
          </div>
        </div>

        <div className="session-details">
          <div className="session-item">
            <span className="session-label">Oturum ID</span>
            <span className="session-value">
              {session.session?.id?.slice(0, 16)}...
            </span>
          </div>
          <div className="session-item">
            <span className="session-label">Yetki / Rol</span>
            <span className="session-badge">Aktif Kullanıcı</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          className="btn btn-danger"
        >
          {loading ? "Çıkış yapılıyor..." : "Güvenli Çıkış Yap"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          type="button"
          className={`tab-btn ${mode === "signin" ? "active" : ""}`}
          onClick={() => {
            setMode("signin");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        >
          Giriş Yap
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "signup" ? "active" : ""}`}
          onClick={() => {
            setMode("signup");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        >
          Kayıt Ol
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signup" && (
          <div className="form-group">
            <label htmlFor="auth-name" className="form-label">
              Ad Soyad
            </label>
            <input
              id="auth-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="form-input"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="auth-email" className="form-label">
            E-Posta
          </label>
          <input
            id="auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@alanadi.com"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="auth-password" className="form-label">
            Şifre
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 8 karakter"
            className="form-input"
          />
        </div>

        {errorMessage && (
          <div className="alert alert-error">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading
            ? "İşlem yapılıyor..."
            : mode === "signin"
              ? "Giriş Yap"
              : "Hesap Oluştur"}
        </button>
      </form>
    </div>
  );
}
