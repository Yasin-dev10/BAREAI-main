import { useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import API from "../api";
import { applyTheme } from "../theme";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@bareai.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Check if password change is required
      if (res.data.user.isPasswordChangeRequired) {
        // Trigger auto-generate password
        try {
          const autoRes = await API.post("/auth/auto-generate-password");
          
          await Swal.fire({
            title: "NEW PASSWORD GENERATED",
            html: `
              <div style="text-align:center">
                <div style="font-size:60px">📧</div>
                <p>Welcome <b>${res.data.user.name}</b></p>
                <p style="margin-top: 15px;">A new password has been automatically generated and sent to your email.</p>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                  Please check your email for:</p>
                <ul style="text-align: left; display: inline-block; margin-top: 10px; font-size: 13px;">
                  <li>✓ Verification email</li>
                  <li>✓ New password</li>
                </ul>
                <p style="margin-top: 15px; font-size: 12px; color: #999;">
                  You will be redirected to login again.
                </p>
              </div>
            `,
            icon: "info",
            background: "#0f172a",
            color: "#ffffff",
            confirmButtonColor: "#06b6d4",
            confirmButtonText: "Check Email",
            timer: 4000,
          });

          // Clear localStorage and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        } catch (autoGenErr) {
          console.error("Auto-generate password failed:", autoGenErr);
          
          await Swal.fire({
            title: "PARTIAL SUCCESS",
            html: `
              <div style="text-align:center">
                <p>Login successful, but automatic password generation had an issue.</p>
                <p style="margin-top: 10px; font-size: 13px;">Please request a password change from your profile.</p>
              </div>
            `,
            icon: "warning",
            background: "#0f172a",
            color: "#ffffff",
            confirmButtonColor: "#06b6d4",
          });

          const role = res.data.user.role;
          if (role === "admin") window.location.href = "/dashboard";
          else window.location.href = "/analysis";
        }
      } else {
        // Regular login
        await Swal.fire({
          title: "ACCESS GRANTED",
          html: `
            <div style="text-align:center">
              <div style="font-size:60px">🛡️</div>
              <p>Welcome back <b>${res.data.user.name}</b></p>
              <p>Role: <b>${res.data.user.role.toUpperCase()}</b></p>
            </div>
          `,
          icon: "success",
          background: "#0f172a",
          color: "#ffffff",
          confirmButtonColor: "#06b6d4",
          confirmButtonText: "Enter System",
          timer: 2500,
        });

        const role = res.data.user.role;
        if (role === "admin") window.location.href = "/dashboard";
        else window.location.href = "/analysis";
      }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,#22d3ee,transparent_30%),radial-gradient(circle_at_bottom_right,#4f46e5,transparent_30%)]"></div>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-[#111420]/60 backdrop-blur-2xl border border-slate-800/80 rounded-[32px] overflow-hidden shadow-2xl shadow-black/80 m-4 relative z-10">
        <div className="p-8 md:p-12 bg-gradient-to-br from-[#121626] to-[#0c0e17] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/60 relative">
          <div className="absolute top-5 right-5">
            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs border border-red-500/30">
              AI THREAT MONITOR
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-[#090b11] rounded-xl flex items-center justify-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-black text-sm">
                  BA
                </span>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-200 tracking-wider">
              BAREAI
            </span>
          </div>

          <div className="my-auto py-12 flex flex-col items-center text-center space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-24 h-24 bg-slate-900/80 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.25)] text-5xl">
                🛡️
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <h1 className="text-3xl font-extrabold text-white">
                BAREAI Security Gateway
              </h1>
              <p className="text-cyan-400 text-sm">
                Crime Detection • Intelligence Analysis • Threat Monitoring
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Secure access portal for admins, investigator users and users.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-600">
            © 2026 BAREAI System. All rights secured.
          </p>
        </div>

        <div className="p-8 md:p-12 flex flex-col justify-center bg-[#131725]/40">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">System Access</h2>
              <p className="text-slate-400 text-xs mt-1">
                Verify your identity to enter the protected node.
              </p>
            </div>

           

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800/80"></div>
              <span className="mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Or credentials
              </span>
              <div className="flex-grow border-t border-slate-800/80"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm font-mono"
                  placeholder="name@bareai.com"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-sm font-mono"
                  required
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-950/50 transition-all duration-200"
              >
                {loading ? "Authenticating..." : "Login"}
              </button>
            </form>
            <p className="text-center text-sm text-slate-400">
              New user?{" "}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
