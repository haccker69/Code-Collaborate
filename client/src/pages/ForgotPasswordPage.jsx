/**
 * @file ForgotPasswordPage.jsx
 * @description Forgot password flow — 3 steps:
 *   1. Enter email → send OTP
 *   2. Enter 6-digit OTP code
 *   3. Enter new password → reset
 */

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";

export default function ForgotPasswordPage() {
    const navigate = useNavigate();

    // Steps: 1 = email, 2 = otp, 3 = new password, 4 = success
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cooldown, setCooldown] = useState(0);

    const otpRefs = useRef([]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // Step 1: Send OTP
    const handleSendOTP = async () => {
        if (!email) { setError("Please enter your email."); return; }
        setLoading(true);
        setError("");
        try {
            await authApi.sendOTP(email);
            setStep(2);
            setSuccess("Verification code sent to your email!");
            setCooldown(60);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send code.");
        } finally {
            setLoading(false);
        }
    };

    // OTP digit handlers
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newCode = [...otpCode];
        newCode[index] = value.slice(-1);
        setOtpCode(newCode);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
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
        otpRefs.current[Math.min(data.length, 5)]?.focus();
    };

    // Step 2: Verify OTP (just move to step 3)
    const handleVerifyOTP = () => {
        const code = otpCode.join("");
        if (code.length !== 6) { setError("Please enter the full 6-digit code."); return; }
        setError("");
        setSuccess("");
        setStep(3);
    };

    // Step 3: Reset password
    const handleReset = async () => {
        if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        setLoading(true);
        setError("");
        try {
            await authApi.resetPassword(email, otpCode.join(""), newPassword);
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            {/* Header */}
            <header className="login-header">
                <div className="login-header__brand">
                    <div className="login-header__logo-icon">
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>terminal</span>
                    </div>
                    <span className="login-header__logo-text">CodeCollaborate</span>
                </div>
                <div className="login-header__right">
                    <span className="login-header__hint">Remember your password?</span>
                    <Link to="/login" className="register-login-btn">Login</Link>
                </div>
            </header>

            {/* Main */}
            <main className="register-main">
                <div className="register-container">
                    {/* Step indicator */}
                    <div className="forgot-steps">
                        <div className={`forgot-step ${step >= 1 ? "forgot-step--active" : ""}`}>
                            <div className="forgot-step__dot">1</div>
                            <span>Email</span>
                        </div>
                        <div className="forgot-step__line" />
                        <div className={`forgot-step ${step >= 2 ? "forgot-step--active" : ""}`}>
                            <div className="forgot-step__dot">2</div>
                            <span>Verify</span>
                        </div>
                        <div className="forgot-step__line" />
                        <div className={`forgot-step ${step >= 3 ? "forgot-step--active" : ""}`}>
                            <div className="forgot-step__dot">3</div>
                            <span>Reset</span>
                        </div>
                    </div>

                    {/* Step 1: Email */}
                    {step === 1 && (
                        <div className="forgot-card">
                            <div className="forgot-card__icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>lock_reset</span>
                            </div>
                            <h2 className="forgot-card__title">Forgot Password?</h2>
                            <p className="forgot-card__subtitle">Enter your email and we'll send you a verification code to reset your password.</p>

                            {error && <p className="auth-error">{error}</p>}

                            <div className="login-field">
                                <label className="login-field__label">Email Address</label>
                                <div className="login-field__input-wrap">
                                    <span className="material-symbols-outlined login-field__icon">mail</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="login-field__input"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <button
                                className="login-submit"
                                onClick={handleSendOTP}
                                disabled={loading || !email}
                            >
                                <span>{loading ? "Sending…" : "Send Verification Code"}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>
                        </div>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <div className="forgot-card">
                            <div className="forgot-card__icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>verified</span>
                            </div>
                            <h2 className="forgot-card__title">Check Your Email</h2>
                            <p className="forgot-card__subtitle">We sent a 6-digit code to <strong>{email}</strong></p>

                            {error && <p className="auth-error">{error}</p>}
                            {success && <p className="auth-success">{success}</p>}

                            <div className="register-otp-section">
                                <label className="login-field__label">Verification Code</label>
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
                            </div>

                            <button
                                className="login-submit"
                                onClick={handleVerifyOTP}
                                disabled={otpCode.join("").length !== 6}
                            >
                                <span>Verify Code</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>

                            <button
                                className="forgot-resend"
                                onClick={handleSendOTP}
                                disabled={loading || cooldown > 0}
                            >
                                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                            </button>
                        </div>
                    )}

                    {/* Step 3: New password */}
                    {step === 3 && (
                        <div className="forgot-card">
                            <div className="forgot-card__icon">
                                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>password</span>
                            </div>
                            <h2 className="forgot-card__title">Set New Password</h2>
                            <p className="forgot-card__subtitle">Choose a strong password with at least 6 characters.</p>

                            {error && <p className="auth-error">{error}</p>}

                            <div className="login-field">
                                <label className="login-field__label">New Password</label>
                                <div className="login-field__input-wrap">
                                    <span className="material-symbols-outlined login-field__icon">lock</span>
                                    <input
                                        type={showPwd ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="login-field__input login-field__input--pwd"
                                        minLength={6}
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
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="login-field__input"
                                    />
                                </div>
                            </div>

                            <button
                                className="login-submit"
                                onClick={handleReset}
                                disabled={loading || !newPassword || !confirmPassword}
                            >
                                <span>{loading ? "Resetting…" : "Reset Password"}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                            </button>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="forgot-card" style={{ textAlign: "center" }}>
                            <div className="forgot-card__icon forgot-card__icon--success">
                                <span className="material-symbols-outlined" style={{ fontSize: 48 }}>check_circle</span>
                            </div>
                            <h2 className="forgot-card__title">Password Reset!</h2>
                            <p className="forgot-card__subtitle">Your password has been successfully reset. You can now log in with your new password.</p>

                            <button className="login-submit" onClick={() => navigate("/login")}>
                                <span>Go to Login</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
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
