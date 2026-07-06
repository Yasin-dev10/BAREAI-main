import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import API from "../api.js";
import { applyTheme } from "../theme.js";

const homeByRole = {
  admin: "/dashboard",
  investigator: "/investigator",
  user: "/analysis",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get("token");
  const storedToken = localStorage.getItem("token");
  const storedUser = getStoredUser();
  const isFirstLoginMode = !token && Boolean(storedToken && storedUser?.isPasswordChangeRequired);
  const canChangePassword = Boolean(token || isFirstLoginMode);

  const [formData, setFormData] = useState({
    currentPassword: location.state?.currentPassword || "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState("form");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const pageCopy = isFirstLoginMode
    ? {
        title: "Create Your Password",
        subtitle: "Use your temporary password once, then choose a private password.",
        button: "Save Password & Continue",
      }
    : {
        title: "Change Password",
        subtitle: "Enter your new password to complete the verification.",
        button: "Change Password",
      };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (isFirstLoginMode && !formData.currentPassword) {
      nextErrors.currentPassword = "Temporary password is required";
    }

    if (!formData.newPassword) {
      nextErrors.newPassword = "Password is required";
    } else if (formData.newPassword.length < 6) {
      nextErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFirstLoginPasswordChange = async () => {
    const response = await API.patch("/auth/change-password", {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    const updatedUser = {
      ...storedUser,
      ...(response.data?.user || {}),
      isPasswordChangeRequired: false,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    applyTheme(updatedUser.theme, { updateUser: true, emit: false });

    setStatus("success");
    setMessage("Password changed successfully. Opening your workspace...");

    setTimeout(() => {
      navigate(homeByRole[updatedUser.role] || "/analysis", { replace: true });
    }, 1200);
  };

  const handleTokenPasswordChange = async () => {
    await API.post("/auth/change-password-verified", {
      token,
      newPassword: formData.newPassword,
    });

    setStatus("success");
    setMessage("Password changed successfully. Redirecting to login...");

    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1800);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canChangePassword) {
      setStatus("error");
      setMessage("Password change session is missing. Please log in again.");
      return;
    }

    if (!validateForm()) return;

    setStatus("loading");
    setMessage("");

    try {
      if (isFirstLoginMode) {
        await handleFirstLoginPasswordChange();
      } else {
        await handleTokenPasswordChange();
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.message || `An error occurred: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
            <span className="text-xl font-black">BA</span>
          </div>
          <h1 className="text-3xl font-black text-white">{pageCopy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{pageCopy.subtitle}</p>
        </div>

        {!canChangePassword && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-red-200">
              Password change session is missing. Please log in again.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-4 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <div className="mb-3 text-4xl font-black text-emerald-300">OK</div>
            <p className="text-sm font-semibold text-emerald-200">{message}</p>
          </div>
        )}

        {status === "error" && message && canChangePassword && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-center text-sm font-semibold text-red-200">{message}</p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="mt-4 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400"
            >
              Back to Login
            </button>
          </div>
        )}

        {(status === "form" || status === "loading") && canChangePassword && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isFirstLoginMode && (
              <PasswordField
                label="Temporary Password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter the password from your email"
                error={errors.currentPassword}
              />
            )}

            <PasswordField
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              error={errors.newPassword}
            />

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              error={errors.confirmPassword}
            />

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Saving Password..." : pageCopy.button}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({ label, name, value, onChange, placeholder, error }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
        {label}
      </label>
      <input
        type="password"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-500/30"
            : "border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
        }`}
      />
      {error && <p className="mt-1.5 text-sm text-red-300">{error}</p>}
    </div>
  );
}
