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
  BarChart2,
} from "lucide-react";
import { useEffect, useState } from "react";
import API from "../api";

const menu = [
  {
    title: "General",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
      { name: "Users", path: "/users", icon: Users, roles: ["admin"], badge: 2 },
      { name: "History", path: "/history", icon: History, roles: ["admin", "investigator"] },
      { name: "Blacklist", path: "/blacklist", icon: ShieldAlert, roles: ["admin","investigator"] },
    ],
  },
  {
    title: "Investigation",
    items: [
      { name: "Case Management", path: "/cases", icon: ListChecks, roles: ["admin"] },
      { name: "Investigator Management", path: "/investigator", icon: UserCheck, roles: ["admin", "investigator"] },
    ],
  },
  {
    title: "Tools",
    items: [
      { name: "Profile", path: "/profile", icon: UserCircle, roles: ["admin", "investigator", "user"] },
      { name: "Settings", path: "/settings", icon: Settings, roles: ["admin", "investigator"] },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const role = storedUser?.role || "user";

  const [theme, setTheme] = useState(localStorage.getItem("theme") || storedUser?.theme || "dark");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
  }, []);

  const isLight = theme === "light";

  const toggleTheme = async () => {
    const nextTheme = isLight ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("user", JSON.stringify({ ...storedUser, theme: nextTheme }));

    try {
      await API.patch("/auth/me", { theme: nextTheme });
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside
      className={`h-screen fixed w-72 border-r flex flex-col transition-colors ${
        isLight
          ? "bg-white text-slate-950 border-slate-200"
          : "bg-gradient-to-b from-slate-900 to-slate-950 text-white border-slate-800"
      }`}
    >
      {/* HEADER SECTION */}
      <div className={`flex items-start gap-3 px-6 py-6 border-b ${isLight ? "border-slate-200" : "border-slate-800"}`}>
       

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-wide">BAAREAI</h1>
         

          {/* 👤 USER INFO */}
          {storedUser && (
            <div className="">
              <p className={`text-sm  truncate ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                {storedUser.name}
              </p>
              <p className={`text-xs capitalize ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {storedUser.role}
              </p>
            </div>
          )}
        </div>

        {/* UTILITY BUTTONS (Notification & Theme) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 🔔 NOTIFICATION BUTTON */}
          <button
            type="button"
            onClick={() => navigate("/notifications")} // Waxaad u beddeli kartaa route-ka saxda ah
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition relative ${
              isLight ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 🌗 THEME TOGGLE BUTTON */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${
              isLight ? "bg-slate-100 text-slate-900 hover:bg-slate-200" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
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
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                            isActive
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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
            isLight
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