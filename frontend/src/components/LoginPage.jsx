import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import API from "../api";
import { applyTheme } from "../theme";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const getHomePath = (role) => {
    if (role === "admin") return "/dashboard";
    if (role === "investigator") return "/investigator";
    return "/analysis";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      applyTheme(res.data.user.theme, { updateUser: true, emit: false });

      if (res.data.user.isPasswordChangeRequired) {
        navigate("/change-password", {
          replace: true,
          state: {
            firstLogin: true,
            currentPassword: password,
          },
        });
        return;
      }

      window.location.href = getHomePath(res.data.user.role);
    } catch (err) {
      Swal.fire({
        title: "ACCESS DENIED",
        text: err.response?.data?.message || "Invalid email or password",
        icon: "error",
        background: "#111827",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #060b18;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 1rem;
        }

        /* Animated background blobs */
        .bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          animation: floatBlob 12s ease-in-out infinite;
          pointer-events: none;
        }
        .bg-blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #6366f1, #4f46e5);
          top: -100px; left: -100px;
          animation-delay: 0s;
        }
        .bg-blob-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #0ea5e9, #06b6d4);
          bottom: -80px; right: -80px;
          animation-delay: 4s;
        }
        .bg-blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #8b5cf6, #7c3aed);
          bottom: 100px; left: 40%;
          animation-delay: 8s;
        }
        @keyframes floatBlob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.06); }
          66% { transform: translate(-20px, 30px) scale(0.96); }
        }

        /* Grid overlay */
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 460px;
          background: rgba(13, 17, 32, 0.82);
          border: 1px solid rgba(99, 102, 241, 0.18);
          border-radius: 28px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 32px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(99,102,241,0.08);
          padding: 2.5rem 2.5rem 2rem;
          transition: opacity 0.6s ease, transform 0.6s ease;
          opacity: 0;
          transform: translateY(24px);
        }
        .login-card.mounted {
          opacity: 1;
          transform: translateY(0);
        }

        /* Logo section */
        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 16px;
          color: white;
          letter-spacing: -0.5px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
        }
        .logo-text {
          display: flex;
          flex-direction: column;
        }
        .logo-title {
          font-size: 18px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: 0.03em;
          line-height: 1;
        }
        .logo-subtitle {
          font-size: 10px;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .status-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 10px;
          color: #10b981;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .status-dot {
          width: 6px; height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse-green 2s ease-in-out infinite;
        }
        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        /* Header */
        .login-header {
          margin-bottom: 2rem;
        }
        .login-header h1 {
          font-size: 26px;
          font-weight: 800;
          color: #f8fafc;
          margin: 0 0 6px;
          line-height: 1.2;
        }
        .login-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        /* Form fields */
        .field-group {
          margin-bottom: 1.1rem;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 8px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .field-wrapper {
          position: relative;
        }
        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #475569;
          pointer-events: none;
          transition: color 0.2s;
        }
        .field-wrapper.focused .field-icon {
          color: #818cf8;
        }
        .field-input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: #f1f5f9;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }
        .field-input::placeholder {
          color: #334155;
        }
        .field-input:focus {
          border-color: rgba(99,102,241,0.6);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .toggle-password {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
          max-width: fit-content;
        }
        .toggle-password:hover {
          color: #818cf8;
        }

        /* Submit button */
        .submit-btn {
          width: 100%;
          padding: 14px;
          margin-top: 0.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
          color: white;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 24px rgba(99,102,241,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.01em;
        }
        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .submit-btn:hover:not(:disabled)::before {
          opacity: 1;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.5);
        }
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.4rem 0 0.2rem;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .divider-text {
          font-size: 11px;
          color: #334155;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* Footer links */
        .footer-row {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1.4rem;
          gap: 6px;
          font-size: 13.5px;
        }
        .footer-row span {
          color: #475569;
        }
        .footer-link {
          color: #818cf8;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .footer-link:hover {
          color: #a5b4fc;
          text-decoration: underline;
        }

        /* Trust badges */
        .trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 1.6rem;
          padding-top: 1.4rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .trust-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 10.5px;
          color: #334155;
          font-weight: 500;
        }
        .trust-item svg {
          color: #475569;
        }

        /* Responsive */
        @media (max-width: 500px) {
          .login-card {
            padding: 1.8rem 1.4rem 1.5rem;
            border-radius: 20px;
          }
          .login-header h1 { font-size: 22px; }
          .trust-row { flex-wrap: wrap; gap: 10px; }
        }
      `}</style>

      <div className="login-root">
        {/* Background elements */}
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        <div className="bg-grid" />

        {/* Card */}
        <div className={`login-card ${mounted ? "mounted" : ""}`}>

          {/* Logo */}
          <div className="logo-area">
            <div className="logo-icon">BA</div>
            <div className="logo-text">
              <span className="logo-title">BAREAI</span>
              <span className="logo-subtitle">Security Platform</span>
            </div>
            {/* <div className="status-badge">
              <span className="status-dot" />
              SECURE
            </div> */}
          </div>

          {/* Header */}
          <div className="login-header">
            <h1>Welcome back</h1>
            <p>Sign in to your account to access the intelligence platform.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="field-group">
              <label className="field-label">Email address</label>
              <div className={`field-wrapper ${focusedField === "email" ? "focused" : ""}`}>
                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@bareai.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label">Password</label>
              <div className={`field-wrapper ${focusedField === "password" ? "focused" : ""}`}>
                <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" />
                  login...
                </>
              ) : (
                <>
                  Login
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">New to BAREAI?</span>
            <div className="divider-line" />
          </div>

          {/* Footer */}
          <div className="footer-row">
            <span>Don't have an account?</span>
            <Link to="/register" className="footer-link">Create account →</Link>
          </div>

          {/* Trust badges
          <div className="trust-row">
            <div className="trust-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              SSL Encrypted
            </div>
            <div className="trust-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              2FA Ready
            </div>
            <div className="trust-item">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Powered
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
}
