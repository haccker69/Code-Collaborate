/**
 * @file RegisterPage.jsx
 * @description Registration page — centered single-column form with OTP.
 * Flow: Fill form → Send OTP → Enter code → Create Account
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import * as authApi from "../api/authApi";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState(false); // true = show OTP input
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Send OTP
  const handleSendOTP = async () => {
    if (!form.email) { setError("Please enter your email first."); return; }
    setOtpSending(true);
    setOtpError("");
    setOtpSuccess("");
    try {
      await authApi.sendOTP(form.email);
      setOtpStep(true);
      setOtpSuccess("Verification code sent to your email!");
      setOtpCooldown(60);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...otpCode];
    for (let i = 0; i < 6; i++) newCode[i] = data[i] || "";
    setOtpCode(newCode);
    const focusIdx = Math.min(data.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const code = otpCode.join("");
    if (code.length !== 6) { setOtpError("Please enter the full 6-digit code."); return; }
    setOtpSending(true);
    setOtpError("");
    try {
      await authApi.verifyOTP(form.email, code);
      setOtpVerified(true);
      setOtpSuccess("Email verified successfully!");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid code.");
    } finally {
      setOtpSending(false);
    }
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpVerified) {
      setError("Please verify your email first.");
      return;
    }

    setLoading(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* ── Header ─────────────────────────────── */}
      <header className="login-header">
        <div className="login-header__brand">
          <div className="login-header__logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>terminal</span>
          </div>
          <span className="login-header__logo-text">CodeCollaborate</span>
        </div>
        <div className="login-header__right">
          <span className="login-header__hint">Already have an account?</span>
          <Link to="/login" className="register-login-btn">Login</Link>
        </div>
      </header>

      {/* ── Main ───────────────────────────────── */}
      <main className="register-main">
        <div className="register-container">
          {/* Title */}
          <div className="register-header">
            <h1 className="register-title">Create Account</h1>
            <p className="register-subtitle">Join the global developer community today</p>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <form className="register-form" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="login-field">
              <label className="login-field__label">Full Name</label>
              <div className="login-field__input-wrap">
                <span className="material-symbols-outlined login-field__icon">person</span>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={30}
                  placeholder="John Doe"
                  className="login-field__input"
                />
              </div>
            </div>

            {/* Email + OTP */}
            <div className="login-field">
              <label className="login-field__label">Email Address</label>
              <div className="register-email-row">
                <div className="login-field__input-wrap" style={{ flex: 1 }}>
                  <span className="material-symbols-outlined login-field__icon">mail</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => {
                      handleChange(e);
                      if (otpVerified) { setOtpVerified(false); setOtpStep(false); setOtpCode(["", "", "", "", "", ""]); }
                    }}
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="login-field__input"
                    disabled={otpVerified}
                  />
                </div>
                {!otpVerified ? (
                  <button
                    type="button"
                    className="register-otp-btn"
                    onClick={handleSendOTP}
                    disabled={otpSending || otpCooldown > 0 || !form.email}
                  >
                    {otpSending ? "Sending…" : otpCooldown > 0 ? `Resend (${otpCooldown}s)` : otpStep ? "Resend" : "Send OTP"}
                  </button>
                ) : (
                  <span className="register-verified-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    Verified
                  </span>
                )}
              </div>
            </div>

            {/* OTP Input */}
            {otpStep && !otpVerified && (
              <div className="register-otp-section">
                <label className="login-field__label">Enter Verification Code</label>
                <div className="register-otp-inputs">
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="register-otp-digit"
                    />
                  ))}
                </div>
                {otpError && <p className="auth-error" style={{ margin: 0 }}>{otpError}</p>}
                {otpSuccess && !otpError && <p className="auth-success" style={{ margin: 0 }}>{otpSuccess}</p>}
                <button
                  type="button"
                  className="register-verify-btn"
                  onClick={handleVerifyOTP}
                  disabled={otpSending || otpCode.join("").length !== 6}
                >
                  {otpSending ? "Verifying…" : "Verify Email"}
                </button>
              </div>
            )}
            {otpVerified && otpSuccess && (
              <p className="auth-success" style={{ margin: 0 }}>{otpSuccess}</p>
            )}

            {/* Password row */}
            <div className="register-pwd-row">
              <div className="login-field">
                <label className="login-field__label">Password</label>
                <div className="login-field__input-wrap">
                  <span className="material-symbols-outlined login-field__icon">lock</span>
                  <input
                    type={showPwd ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="login-field__input login-field__input--pwd"
                    autoComplete="new-password"
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

              <div className="login-field">
                <label className="login-field__label">Confirm Password</label>
                <div className="login-field__input-wrap">
                  <span className="material-symbols-outlined login-field__icon">lock</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="login-field__input"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>



            {/* Submit */}
            <button type="submit" className="login-submit" disabled={loading || !otpVerified}>
              <span>{loading ? "Creating account…" : "Create Account"}</span>
              {!loading && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>}
            </button>
          </form>
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
