import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { Menu } from "lucide-react";
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

const homeByRole = {
  admin: "/dashboard",
  investigator: "/analysis",
  user: "/analysis",
};

function Protected({ children, roles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!token) {
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
    <div className="min-h-screen bg-slate-950 text-white">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 shadow-sm backdrop-blur lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div
        className={`fixed inset-0 z-30 bg-slate-950/50 transition-opacity lg:hidden ${sidebarOpen ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="min-h-screen w-full overflow-x-hidden bg-slate-950 px-3 py-4 sm:px-4 sm:py-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:px-6 lg:py-6">
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

        {/* 404 */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}
