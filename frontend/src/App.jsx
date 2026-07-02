import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-72 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
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