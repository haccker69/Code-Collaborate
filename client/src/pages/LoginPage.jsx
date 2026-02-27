/**
 * @file LoginPage.jsx
 * @description Login page — two-column layout with branding on left, form on right.
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Header ─────────────────────────────── */}
      <header className="login-header">
        <div className="login-header__brand">
          <div className="login-header__logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>terminal</span>
          </div>
          <span className="login-header__logo-text">CodeCollaborate</span>
        </div>
        <div className="login-header__right">
          <span className="login-header__hint">Don't have an account?</span>
          <Link to="/register" className="login-header__signup">Sign Up</Link>
        </div>
      </header>

      {/* ── Main content ───────────────────────── */}
      <main className="login-main">
        <div className="login-grid">

          {/* Left: Branding + Illustration */}
          <div className="login-branding">
            <h1 className="login-branding__title">
              Build the future<br />
              <span className="login-branding__accent">together.</span>
            </h1>

            {/* Code editor illustration */}
            <div className="login-illustration">
              <div className="login-illustration__glow" />
              <div className="login-illustration__editor">
                <div className="login-illustration__dots">
                  <span className="login-illustration__dot login-illustration__dot--red" />
                  <span className="login-illustration__dot login-illustration__dot--yellow" />
                  <span className="login-illustration__dot login-illustration__dot--green" />
                </div>
                <div className="login-illustration__lines">
                  <div className="login-illustration__line" style={{ width: "75%" }} />
                  <div className="login-illustration__line" style={{ width: "50%" }} />
                  <div className="login-illustration__line login-illustration__line--accent" style={{ width: "85%" }} />
                  <div className="login-illustration__line" style={{ width: "65%" }} />
                </div>
                <div className="login-illustration__footer">
                  <div className="login-illustration__avatars">
                    <div className="login-illustration__avatar" style={{ background: "#475569" }} />
                    <div className="login-illustration__avatar" style={{ background: "#5048e5" }} />
                    <div className="login-illustration__avatar" style={{ background: "#64748b" }} />
                  </div>
                  <span className="login-illustration__badge">Active Pairing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="login-form-wrapper">
            <div className="login-card">
              <div className="login-card__header">
                <h2 className="login-card__title">Welcome Back</h2>
                <p className="login-card__subtitle">Log in to your developer account</p>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <form className="login-form" onSubmit={handleSubmit}>
                {/* Email */}
                <div className="login-field">
                  <label className="login-field__label">Email Address</label>
                  <div className="login-field__input-wrap">
                    <span className="material-symbols-outlined login-field__icon">mail</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="login-field__input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="login-field">
                  <div className="login-field__label-row">
                    <label className="login-field__label">Password</label>
                    <Link to="/forgot-password" className="login-field__forgot">Forgot password?</Link>
                  </div>
                  <div className="login-field__input-wrap">
                    <span className="material-symbols-outlined login-field__icon">lock</span>
                    <input
                      type={showPwd ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="login-field__input login-field__input--pwd"
                    />
                    <button
                      type="button"
                      className="login-field__toggle-pwd"
                      onClick={() => setShowPwd((v) => !v)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {showPwd ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" className="login-submit" disabled={loading}>
                  <span>{loading ? "Signing in…" : "Sign In"}</span>
                  {!loading && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>}
                </button>
              </form>
            </div>

            {/* Mobile-only sign-up link */}
            <p className="login-mobile-signup">
              Don't have an account? <Link to="/register">Sign Up</Link>
            </p>
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────── */}
      <footer className="login-footer">
        <p className="login-footer__copy">© 2025 CollabDev Inc. All rights reserved.</p>
        <div className="login-footer__links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
