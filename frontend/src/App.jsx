import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useEffect } from "react";
import { getInitialTheme } from "./theme";
import API, { clearStoredSession } from "./api";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";

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
  investigator: "/investigator",
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
  const location = useLocation();
  const initialUserRef = useRef(user);
  const [sessionUser, setSessionUser] = useState(user);
  const [checkingSession, setCheckingSession] = useState(Boolean(token));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const syncTheme = (e) => setTheme(e.detail?.theme || getInitialTheme());
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    API.get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        const freshUser = res.data?.user;
        if (!freshUser) return;

        const normalizedUser = {
          ...initialUserRef.current,
          ...freshUser,
          id: freshUser.id || freshUser._id || initialUserRef.current?.id,
        };

        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setSessionUser(normalizedUser);
      })
      .catch(() => {
        if (!cancelled) {
          setSessionUser(initialUserRef.current);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const activeUser = sessionUser || user;

  if (!activeUser?.role) {
    clearStoredSession();
    return <Navigate to="/login" replace />;
  }

  if (checkingSession) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--border-base)" }}>
          Checking account access...
        </div>
      </div>
    );
  }

  if (activeUser.isPasswordChangeRequired) {
    return (
      <Navigate
        to="/change-password"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (roles && !roles.includes(activeUser?.role)) {
    return (
      <Navigate
        to={homeByRole[activeUser?.role] || "/analysis"}
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
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="fixed left-4 top-4 z-40 rounded-xl border p-2.5 shadow-sm backdrop-blur lg:hidden"
        style={{
          borderColor: "var(--border-base)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
        }}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div
        className={`fixed inset-0 z-30 transition-opacity lg:hidden ${
          sidebarOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen lg:ml-[288px] lg:w-[calc(100%-288px)]">
        <TopBar />
        <main
          className="w-full overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6 lg:px-2 lg:py-6 transition-colors duration-300"
          style={{ backgroundColor: "var(--bg-base)" }}
        >
          {children}
        </main>
      </div>
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
            <Protected roles={["admin", "investigator", "user"]}>
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
        <Route
          path="/notifications/history"
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
