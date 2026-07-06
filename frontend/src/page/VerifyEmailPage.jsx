import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../api.js";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill email from URL ?email=... if present
  const [email, setEmail]     = useState(searchParams.get("email") || "");
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  // Skip directly to OTP step if email is pre-filled
  const [step, setStep]       = useState(searchParams.get("email") ? "otp" : "email");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState("");
  const [notice, setNotice]   = useState("");

  const inputRefs = useRef([]);

  // Auto-focus first OTP box when step becomes "otp"
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  /* ── OTP digit input handling ─────────────────────────────────── */
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    const lastIdx = Math.min(pasted.length, 5);
    inputRefs.current[lastIdx]?.focus();
  };

  /* ── Step 1: validate email and move to OTP entry ────────────── */
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Please enter your email address.");
    setStep("otp");
  };

  /* ── Step 2: submit OTP ───────────────────────────────────────── */
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return setError("Please enter all 6 digits.");

    setLoading(true);
    setError("");
    setNotice("");

    try {
      await API.post("/auth/verify-otp", { email: email.trim().toLowerCase(), otp: code });
      setStep("success");
      setTimeout(() => navigate("/login"), 5000);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  /* ── UI ───────────────────────────────────────────────────────── */
  const handleResendOtp = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first.");
      setStep("email");
      return;
    }

    setResending(true);
    setError("");
    setNotice("");

    try {
      const res = await API.post("/auth/resend-otp", {
        email: email.trim().toLowerCase(),
      });
      setOtp(["", "", "", "", "", ""]);
      setNotice(res.data?.message || "A new verification code has been sent.");
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-800/70 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-cyan-500 to-teal-500" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-black text-sm">BA</span>
                </div>
              </div>
              <span className="text-lg font-bold text-slate-200 tracking-wider">BAAREAI</span>
            </div>

            {/* ══════════════════════════════════════════════════
                SUCCESS
            ══════════════════════════════════════════════════ */}
            {step === "success" && (
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
                <p className="text-slate-400 text-sm mb-6">
                  Your email is verified. Use the temporary password from your email to log in.
                </p>
                <div className="bg-slate-700/50 rounded-xl p-4 text-left space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="text-lg">📧</span>
                    <span>Check your inbox — your password has been emailed to you.</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <span className="text-lg">🔐</span>
                    <span>You will choose your own password on first login.</span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs mb-4">Redirecting to login in 5 seconds...</p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:opacity-90 transition-all text-sm shadow-lg"
                >
                  Go to Login Now
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════
                STEP 1 — EMAIL
            ══════════════════════════════════════════════════ */}
            {step === "email" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-1">Email Verification</h2>
                  <p className="text-slate-400 text-sm">
                    Enter your email address. We'll look up your verification code.
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm transition-all"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                      ⚠ {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-lg shadow-cyan-500/10"
                  >
                    Continue →
                  </button>
                </form>
              </>
            )}

            {/* ══════════════════════════════════════════════════
                STEP 2 — OTP
            ══════════════════════════════════════════════════ */}
            {step === "otp" && (
              <>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); setNotice(""); setOtp(["","","","","",""]); }}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm mb-5 transition-colors"
                  >
                    ← Back
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <span className="text-xl">🔑</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white leading-tight">Enter Verification Code</h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Sent to <span className="text-cyan-400 font-semibold">{email}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  {/* ── 6 OTP digit boxes ── */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                      6-Digit Code
                    </label>
                    <div
                      className="flex gap-2 justify-center"
                      onPaste={handleOtpPaste}
                    >
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => (inputRefs.current[i] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className={`
                            w-12 h-14 text-center text-2xl font-black rounded-xl border-2 bg-slate-900
                            text-white focus:outline-none transition-all duration-150 select-none
                            ${digit
                              ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_16px_rgba(6,182,212,0.3)] text-cyan-300"
                              : "border-slate-600 hover:border-slate-500 focus:border-cyan-500 focus:bg-cyan-500/5"
                            }
                          `}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-center">
                      ⚠ {error}
                    </p>
                  )}

                  {notice && (
                    <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-center">
                      {notice}
                    </p>
                  )}

                  {/* Expiry notice */}
                  <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
                    <span className="text-amber-400 text-sm mt-0.5">⏱</span>
                    <p className="text-slate-400 text-xs">
                      Code expires in <strong className="text-amber-300">15 minutes</strong>. Check your spam folder if you don't see it.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="w-full py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:border-cyan-500 hover:text-cyan-300 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? "Sending new code..." : "Resend code"}
                  </button>

                  {/* Verify button */}
                  <button
                    type="submit"
                    disabled={loading || otp.join("").length < 6}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-sm shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Verify Code ✓"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          © 2026 BAAREAI System. All rights secured.
        </p>
      </div>
    </div>
  );
}
