import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  History,
  UserCircle,
  Settings,
  Bell,
  ListChecks,
  ShieldAlert,
  UserCheck,
  LogOut,
  X,
  BrainCircuit,
  FileBarChart2,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
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
      { name: "Notifications", path: "/notifications", icon: Bell, roles: ["admin", "investigator"] },
      { name: "Analysis", path: "/analysis", icon: BrainCircuit, roles: ["admin", "investigator", "user"] },
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
  const [theme, setTheme] = useState(getInitialTheme);

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

  const isLight = theme === "light";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const surfaceBg = isLight ? "#ffffff" : "var(--bg-surface)";
  const borderColor = isLight ? "#dde4e0" : "var(--border-base)";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[288px] flex-col border-r transition-all duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
      style={{
        backgroundColor: surfaceBg,
        borderColor,
        color: "var(--text-primary)",
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-5 py-5 border-b"
        style={{ borderColor }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
        >
          <Shield size={20} strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold tracking-tight truncate">BAREAI</p>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Intelligence Platform
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition lg:hidden"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {menu.map((section) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(role));
          if (!visibleItems.length) return null;

          return (
            <div key={section.title}>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.12em] px-3 mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {section.title}
              </p>

              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.path}
                        onClick={() => onClose?.()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                            isActive
                              ? "font-semibold sidebar-link-active"
                              : "font-medium sidebar-link"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
                            <span className="flex-1">{item.name}</span>
                          </>
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

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-red-500 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
