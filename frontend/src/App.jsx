import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useEffect } from "react";
import { getInitialTheme } from "./theme";
import { clearStoredSession } from "./api";
import Sidebar from "./components/Sidebar";

import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";

import Dashboard from "./page/Dashboard";
import Analysis from "./page/Analysis";
import History from "./page/History";
import UserManagement from "./page/UserManagement";
import ProfilePage from "./page/ProfilePage";
import SettingsPage from "./page/Setting";
import Investigator from "./page/Investigator";
import Notifications from "./page/Notifications";
import Blacklist from "./page/Blacklist";
import BareAIApp from "./page/BareAIApp";
import CaseManagement from "./page/CaseManagement";
import FacebookPosts from "./page/FacebookPosts";
import VerifyEmailPage from "./page/VerifyEmailPage";
import ChangePasswordPage from "./page/ChangePasswordPage";
import Reports from "./page/Reports";

const homeByRole = {
  admin: "/dashboard",
  investigator: "/analysis",
  user: "/analysis",
};

function getStoredSession() {
  try {
    return {
      token: localStorage.getItem("token"),
      user: JSON.parse(localStorage.getItem("user") || "null"),
    };
  } catch {
    clearStoredSession();
    return { token: null, user: null };
  }
}

function Protected({ children, roles }) {
  const { token, user } = getStoredSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const isLight = theme === "light";

  useEffect(() => {
    const syncTheme = (e) => setTheme(e.detail?.theme || getInitialTheme());
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.role) {
    clearStoredSession();
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return (
      <Navigate
        to={homeByRole[user?.role] || "/analysis"}
        replace
      />
    );
  }

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className={`fixed left-4 top-4 z-40 rounded-xl border p-2.5 shadow-sm backdrop-blur lg:hidden ${
          isLight
            ? "border-slate-300 bg-white/90 text-slate-700"
            : "border-slate-700 bg-slate-900/90 text-slate-200"
        }`}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${
          isLight ? "bg-slate-400/30" : "bg-slate-950/50"
        } ${sidebarOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className="min-h-screen w-full overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:px-6 lg:py-6 transition-colors duration-300"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<BareAIApp />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* My Dashboard – all roles
        <Route
          path="/my-dashboard"
          element={
            <Protected roles={["admin", "investigator", "user"]}>
              <MyDashboard />
            </Protected>
          }
        /> */}

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Protected roles={["admin"]}>
              <Dashboard />
            </Protected>
          }
        />

        {/* Analysis */}
        <Route
          path="/analysis"
          element={
            <Protected roles={["admin", "investigator", "user"]}>
              <Analysis />
            </Protected>
          }
        />

        {/* History */}
        <Route
          path="/history"
          element={
            <Protected roles={["admin", "investigator"]}>
              <History />
            </Protected>
          }
        />

        {/* Users */}
        <Route
          path="/users"
          element={
            <Protected roles={["admin"]}>
              <UserManagement />
            </Protected>
          }
        />

        {/* Blacklist */}
        <Route
          path="/blacklist"
          element={
            <Protected roles={["admin", "investigator"]}>
              <Blacklist />
            </Protected>
          }
        />

        {/* Facebook Posts */}
        <Route
          path="/blacklist/facebook/:id/posts"
          element={
            <Protected roles={["admin", "investigator"]}>
              <FacebookPosts />
            </Protected>
          }
        />

        {/* Case Management */}
        <Route
          path="/cases"
          element={
            <Protected roles={["admin", "investigator"]}>
              <CaseManagement />
            </Protected>
          }
        />

        {/* Investigator */}
        <Route
          path="/investigator"
          element={
            <Protected roles={["admin", "investigator"]}>
              <Investigator />
            </Protected>
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            <Protected roles={["admin", "investigator"]}>
              <Notifications />
            </Protected>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <Protected roles={["admin", "investigator", "user"]}>
              <ProfilePage />
            </Protected>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <Protected roles={["admin", "investigator"]}>
              <SettingsPage />
            </Protected>
          }
        />

        {/* Email Verification */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Change Password */}
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <Protected roles={["admin", "investigator"]}>
              <Reports />
            </Protected>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}
