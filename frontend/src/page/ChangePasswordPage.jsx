import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api.js";

export default function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState("form"); // form, loading, success, error
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Password change token is missing");
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = "Password is required";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await API.post("/auth/change-password-verified", {
        token,
        newPassword: formData.newPassword,
      });

      if (response.status === 200) {
        setStatus("success");
        setMessage("Password changed successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.message || "An error occurred: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Change Password
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Enter your new password to complete the verification
        </p>

        {status === "success" && (
          <div className="bg-green-900 border border-green-700 rounded p-4 mb-6 text-center">
            <div className="text-green-500 text-5xl mb-3">✓</div>
            <p className="text-green-300 font-semibold">{message}</p>
          </div>
        )}

        {status === "error" && message && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-6">
            <p className="text-red-300 font-semibold text-center">{message}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 font-bold mb-2">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                className={`w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.newPassword
                    ? "focus:ring-red-500 border border-red-500"
                    : "focus:ring-green-500"
                }`}
              />
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                className={`w-full px-4 py-2 rounded bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  errors.confirmPassword
                    ? "focus:ring-red-500 border border-red-500"
                    : "focus:ring-green-500"
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-200 mt-6"
            >
              {status === "loading" ? "Changing Password..." : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
