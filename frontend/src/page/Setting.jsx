import { useEffect, useState } from "react";
import { Bell, Check, Key, Moon, Palette, Save, Shield, Sun, User } from "lucide-react";
import API from "../api";
import { applyTheme, getInitialTheme } from "../theme";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const isLight = theme === "light";

  // Listen for theme changes from sidebar
  useEffect(() => {
    const syncTheme = (e) => setTheme(e.detail?.theme || getInitialTheme());
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    badgeNumber: "",
    station: "",
    theme: getInitialTheme(),
    emailAlerts: true,
    pushNotifications: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        const res = await API.get("/auth/me");
        const user = res.data.user;
        const theme = user.theme || localStorage.getItem("theme") || "dark";

        setForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          badgeNumber: user.badgeNumber || "",
          station: user.station || "",
          theme,
          emailAlerts: user.emailAlerts ?? true,
          pushNotifications: user.pushNotifications ?? false,
        });

        applyTheme(theme);
      } catch (err) {
        setError(err.response?.data?.message || "Settings data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved("");
    setError("");

    try {
      const res = await API.patch("/auth/me", form);

      localStorage.setItem("user", JSON.stringify(res.data.user));
      applyTheme(res.data.user.theme || form.theme);

      setSaved("Settings saved successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Settings save failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(""), 3000);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved("");
    setError("");

    try {
      await API.patch("/auth/change-password", passwordForm);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
      });

      setSaved("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(""), 3000);
    }
  };

  return (
    <div
      className={`min-h-screen w-full font-sans p-4 md:p-10 selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300 ${
        isLight ? "bg-[#f0f4f8] text-slate-900" : "bg-slate-900 text-slate-100"
      }`}
    >
        <div className="max-w-6xl mx-auto">
          <div className={`mb-8 border-b pb-5 ${ isLight ? "border-slate-300" : "border-slate-800/60" }`}>
            <h1 className={`text-3xl font-extrabold tracking-tight ${ isLight ? "text-slate-900" : "text-slate-100" }`}>
              System Settings
            </h1>

            <p className="text-sm text-slate-400 mt-1">
              Manage your profile, notifications, password, and application appearance.
            </p>

            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

            {saved && (
              <p className="text-sm text-teal-400 mt-3 flex items-center gap-1">
                <Check size={15} /> {saved}
              </p>
            )}
          </div>

          {loading ? (
            <div className="text-slate-400 text-sm">Loading settings...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? isLight
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-slate-800 text-cyan-400 border border-slate-700/50"
                          : isLight
                          ? "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className={`md:col-span-3 border rounded-2xl p-6 min-h-[450px] transition-colors duration-300 ${ isLight ? "bg-white border-slate-200" : "bg-slate-900/40 border-slate-800" }`}>

                {activeTab === "profile" && (
                  <form onSubmit={saveSettings} className="space-y-6">
                    <PanelTitle
                      title="Profile Information"
                      text="Update your personal account information."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label="Full Name"
                        value={form.name}
                        onChange={(value) => updateField("name", value)}
                      />

                      <Field
                        label="Email Address"
                        type="email"
                        value={form.email}
                        onChange={(value) => updateField("email", value)}
                      />

                      <Field
                        label="Phone Number"
                        value={form.phone}
                        onChange={(value) => updateField("phone", value)}
                      />

                      <Field
                        label="Badge Number"
                        value={form.badgeNumber}
                        onChange={(value) => updateField("badgeNumber", value)}
                      />

                      <Field
                        label="Investigator Station"
                        value={form.station}
                        onChange={(value) => updateField("station", value)}
                        className="sm:col-span-2"
                      />
                    </div>

                    <SaveButton saving={saving} />
                  </form>
                )}

                {activeTab === "notifications" && (
                  <form onSubmit={saveSettings} className="space-y-6">
                    <PanelTitle
                      title="Notification Preferences"
                      text="Choose how you want to receive system notifications."
                    />

                    <ToggleRow
                      title="Email Notifications"
                      text="Receive important crime alerts by email."
                      checked={form.emailAlerts}
                      onChange={(checked) => updateField("emailAlerts", checked)}
                    />

                    <ToggleRow
                      title="Browser Notifications"
                      text="Show notifications directly in your browser."
                      checked={form.pushNotifications}
                      onChange={(checked) => updateField("pushNotifications", checked)}
                    />

                    <SaveButton saving={saving} />
                  </form>
                )}

                {activeTab === "security" && (
                  <form onSubmit={changePassword} className="space-y-6 max-w-md">
                    <PanelTitle
                      title="Change Password"
                      text="Update your account password."
                    />

                    <Field
                      label="Current Password"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(value) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: value,
                        }))
                      }
                    />

                    <Field
                      label="New Password"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(value) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: value,
                        }))
                      }
                    />

                    <SaveButton
                      saving={saving}
                      label="Change Password"
                      icon={Key}
                    />
                  </form>
                )}

                {activeTab === "appearance" && (
                  <form onSubmit={saveSettings} className="space-y-6">
                    <PanelTitle
                      title="Application Theme"
                      text="Choose between Dark Mode and Light Mode."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ThemeCard
                        active={form.theme === "dark"}
                        icon={Moon}
                        title="Dark Mode"
                        text="Recommended for low-light environments."
                        onClick={() => {
                          updateField("theme", "dark");
                          applyTheme("dark");
                        }}
                      />

                      <ThemeCard
                        active={form.theme === "light"}
                        icon={Sun}
                        title="Light Mode"
                        text="Bright interface for daytime use."
                        onClick={() => {
                          updateField("theme", "light");
                          applyTheme("light");
                        }}
                      />
                    </div>

                    <SaveButton saving={saving} />
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

function PanelTitle({ title, text }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-200">{title}</h2>
      <p className="text-xs text-slate-400 mt-0.5">{text}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 transition-all text-sm"
      />
    </div>
  );
}

function ToggleRow({ title, text, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl">
      <div>
        <div className="text-sm font-medium text-slate-200">{title}</div>
        <div className="text-xs text-slate-500">{text}</div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-9 h-5 bg-slate-800 checked:bg-cyan-500 rounded-full appearance-none cursor-pointer relative before:content-[''] before:absolute before:h-4 before:w-4 before:bg-slate-400 checked:before:bg-slate-950 before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-all"
      />
    </div>
  );
}

function ThemeCard({ active, icon: Icon, title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left border rounded-xl p-5 transition-all ${
        active
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
      }`}
    >
      <Icon
        className={active ? "text-cyan-400" : "text-slate-400"}
        size={24}
      />

      <div className="font-bold text-slate-100 mt-4">{title}</div>
      <div className="text-xs text-slate-400 mt-1">{text}</div>
    </button>
  );
}

function SaveButton({ saving, label = "Save Changes", icon: Icon = Save }) {
  return (
    <div className="flex justify-end pt-5 border-t border-slate-800/60">
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm"
      >
        <Icon size={16} />
        <span>{saving ? "Saving..." : label}</span>
      </button>
    </div>
  );
}
