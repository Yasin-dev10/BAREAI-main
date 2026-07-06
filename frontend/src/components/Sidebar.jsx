import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  History,
  UserCircle,
  Settings,
  Bell,
  ListChecks,
  Moon,
  Sun,
  ShieldAlert,
  UserCheck,
  LogOut,
  X,
  BrainCircuit,
  FileBarChart2,
} from "lucide-react";
import { useEffect, useState } from "react";
import API from "../api";
import { applyTheme, getInitialTheme, getStoredUser } from "../theme";

const menu = [
  {
    title: "Menu",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
      { name: "User Management", path: "/users", icon: Users, roles: ["admin"] },
      { name: "Blacklist Management", path: "/blacklist", icon: ShieldAlert, roles: ["admin", "investigator"] },
      { name: "Case Management", path: "/cases", icon: ListChecks, roles: ["admin", "investigator"] },
      { name: "Investigator", path: "/investigator", icon: UserCheck, roles: ["admin", "investigator"] },
      { name: "Anlysis", path: "/analysis", icon: BrainCircuit, roles: ["admin", "investigator", "user"] },
      { name: "History", path: "/history", icon: History, roles: ["admin", "investigator", "user"] },
      { name: "Report", path: "/reports", icon: FileBarChart2, roles: ["admin", "investigator"] },
      { name: "Profile", path: "/profile", icon: UserCircle, roles: ["admin", "investigator", "user"] },
      { name: "Settings", path: "/settings", icon: Settings, roles: ["admin", "investigator"] },
    ],
  },
];

export default function Sidebar({ isOpen = true, onClose }) {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const role = storedUser?.role || "user";
  const userName = storedUser?.name || "User";
  const userRole = storedUser?.role || "user";

  const [theme, setTheme] = useState(getInitialTheme);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    applyTheme(theme, { emit: false });
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event) => {
      setTheme(event.detail?.theme || getInitialTheme());
    };

    window.addEventListener("themechange", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("themechange", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await API.get("/notifications/unread-count");
        setUnreadCount(res.data.count || 0);
      } catch {
        setUnreadCount(0);
      }
    };

    if (localStorage.getItem("token")) loadUnreadCount();

    window.addEventListener("notifications:read", loadUnreadCount);

    return () => {
      window.removeEventListener("notifications:read", loadUnreadCount);
    };
  }, []);

  const isLight = theme === "light";

  const toggleTheme = async () => {
    const nextTheme = isLight ? "dark" : "light";
    const appliedTheme = applyTheme(nextTheme, { updateUser: true });
    setTheme(appliedTheme);

    try {
      await API.patch("/auth/me", { theme: appliedTheme });
    } catch {
      // Keep the local preference even if the profile update is unavailable.
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[288px] flex-col border-r transition-all duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } ${
        isLight
          ? "border-slate-200 bg-white text-slate-950"
          : "border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 text-white"
      }`}
    >
      {/* HEADER SECTION */}
      <div className={`flex items-start gap-3 px-4 py-4 border-b sm:px-6 sm:py-6 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
        <div className="min-w-0 flex-1">
          <h1 className={`text-lg font-bold tracking-wide truncate ${isLight ? "text-slate-950" : "text-white"}`}>
            {userName}
          </h1>


          {/* 👤 USER INFO */}
          <p className={`text-sm capitalize truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {userRole}
          </p>
        </div>

        {/* UTILITY BUTTONS (Notification & Theme) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition lg:hidden ${isLight ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          {/* 🔔 NOTIFICATION BUTTON */}
          <button
            type="button"
            onClick={() => navigate("/notifications")} // Waxaad u beddeli kartaa route-ka saxda ah
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition relative ${isLight ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ${isLight ? "ring-white" : "ring-slate-900"
                  }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* 🌗 THEME TOGGLE BUTTON */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${isLight ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
          >
            {isLight ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {menu.map((section) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(role));
          if (!visibleItems.length) return null;

          return (
            <div key={section.title}>
              <p className={`text-xs uppercase px-3 mb-2 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                {section.title}
              </p>

              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.path}
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive
                            ? isLight
                              ? "bg-slate-100 text-slate-950"
                              : "bg-slate-800 text-white"
                            : isLight
                              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`
                        }
                      >
                        <Icon size={18} />
                        <span className="flex-1">{item.name}</span>

                        {item.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isLight ? "bg-slate-900 text-white" : "bg-white text-black"}`}>
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* LOGOUT BUTTON */}
      <div className={`p-4 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`}>
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${isLight
              ? "text-red-600 hover:bg-red-50"
              : "text-red-300 hover:bg-red-500/10"
            }`}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
