import React, { useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import API from "../api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      Swal.fire({
        title: "Password mismatch",
        text: "Password-ka iyo confirm password-ka isma laha.",
        icon: "error",
        background: "#111827",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
      return;
    }

    try {
      setLoading(true);
      const res = await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("theme", res.data.user.theme || "dark");
      document.documentElement.dataset.theme = res.data.user.theme || "dark";

      await Swal.fire({
        title: "Account created",
        text: "Si guul leh ayaad isku diiwaan gelisay.",
        icon: "success",
        background: "#0f172a",
        color: "#fff",
        confirmButtonColor: "#06b6d4",
      });

      window.location.href = "/analysis";
    } catch (err) {
      Swal.fire({
        title: "Registration failed",
        text: err.response?.data?.message || "Fadlan mar kale isku day.",
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 font-sans">
      <div className="w-full max-w-md bg-[#111420]/80 border border-slate-800 rounded-2xl shadow-2xl p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-[#090b11] rounded-xl flex items-center justify-center">
                <span className="text-cyan-300 font-black text-sm">BA</span>
              </div>
            </div>
            <span className="text-lg font-bold text-slate-200 tracking-wider">
              BAREAI
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">
            Iska diiwaan geli si aad u isticmaasho analysis-ka.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              type="text"
              className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
              placeholder="name@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              minLength={6}
              className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
              placeholder="Password"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type="password"
              minLength={6}
              className="w-full px-4 py-3 bg-[#0a0c14] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
              placeholder="Confirm password"
              required
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-lg transition-all duration-200"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
