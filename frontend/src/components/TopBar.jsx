import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Moon, Sun } from "lucide-react";
import API from "../api";
import { applyTheme, getInitialTheme, getStoredUser } from "../theme";

export default function TopBar() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
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
      // Keep local preference even if profile update fails.
    }
  };

  const canSeeNotifications =
    userRole === "admin" || userRole === "investigator";

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-end gap-3 border-b pl-14 pr-3 sm:px-4 lg:pl-6 lg:pr-6"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-base)",
        color: "var(--text-primary)",
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {canSeeNotifications && (
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border transition hover:opacity-90"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-base)",
              color: "var(--text-secondary)",
            }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border transition hover:opacity-90"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-base)",
            color: "var(--text-secondary)",
          }}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
        >
          {isLight ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex max-w-[180px] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition hover:opacity-90 sm:max-w-[220px]"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-base)",
          }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black uppercase"
            style={{
              backgroundColor: "var(--brand-soft)",
              color: "var(--brand)",
            }}
          >
            {userName.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight">
              {userName}
            </span>
            <span
              className="block truncate text-[11px] capitalize leading-tight"
              style={{ color: "var(--text-muted)" }}
            >
              {userRole}
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
