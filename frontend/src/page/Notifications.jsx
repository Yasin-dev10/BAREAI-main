import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Eye,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Link,
  User,
} from "lucide-react";
import API from "../api";

export default function Notifications() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/blacklist/alerts/history");

      const rawAlerts = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      // Kaliya crime alerts
      const crimeAlerts = rawAlerts.filter((alert) => {
        const history = alert.history || {};
        const isCrimeAlert =
          history.isCrime === true ||
          history.prediction === "CRIME-RELATED" ||
          alert.isCrime === true;

        return alert.status !== "sent_to_investigation" && isCrimeAlert;
      });

      const nextAlerts = dedupeAlerts(crimeAlerts);

      setAlerts(nextAlerts);

      setSelected((current) => {
        if (!nextAlerts.length) return null;

        if (current) {
          const updated = nextAlerts.find((alert) => alert._id === current._id);
          if (updated) return updated;
        }

        return nextAlerts[0];
      });
    } catch (err) {
      console.error("Notification loading error:", err);
      setError(err.response?.data?.message || "Failed to load alerts");
      setAlerts([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 10000);

    return () => clearInterval(interval);
  }, []);

  const investigateAlert = async (alert) => {
    const historyId = alert.history?._id || alert.history;

    if (!historyId) {
      navigate("/cases");
      return;
    }

    try {
      setError("");
      const res = await API.post("/investigation/cases", { historyId });
      await loadNotifications();
      navigate(`/cases?case=${res.data.case?._id || ""}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send alert to investigation");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-cyan-400 font-semibold">
                BAREAI Live Alerts
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Facebook Crime Notifications
              </h1>

              <p className="text-sm text-slate-400 mt-2">
                Halkan waxaad ka arkeysaa kaliya alerts-ka crime ah ee ka yimid
                Facebook Pages-ka ku jira blacklist.
              </p>
            </div>

            <button
              onClick={loadNotifications}
              className="bg-cyan-500 text-slate-950 px-4 py-2 rounded-xl font-bold text-sm hover:bg-cyan-400"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-slate-400">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                {alerts.map((alert) => (
                  <button
                    key={alert._id}
                    onClick={() => setSelected(alert)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      selected?._id === alert._id
                        ? "bg-cyan-500/10 border-cyan-500"
                        : "bg-slate-900 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldAlert
                          className="text-red-400 shrink-0"
                          size={18}
                        />

                        <h3 className="font-bold text-sm truncate">
                          {getPostSourceName(alert)}
                        </h3>
                      </div>

                      <span className={priorityClass(alert.priority)}>
                        {alert.priority || "high"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                      {alert.content ||
                        alert.history?.content ||
                        "No content available"}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                      <Clock size={13} />
                      {formatDate(alert.createdAt)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-2">
                {selected ? (
                  <AlertDetails
                    alert={selected}
                    onInvestigate={investigateAlert}
                    onGoToCases={() => navigate("/cases")}
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                    <Eye className="mx-auto text-slate-500 mb-3" size={36} />

                    <p className="text-slate-400">
                      Dooro alert si aad faahfaahinta u aragto.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

function AlertDetails({ alert, onInvestigate, onGoToCases }) {
  const history = alert.history || {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-red-400 font-semibold">
            Crime Alert Detected
          </p>

          <h2 className="text-2xl font-bold mt-1">
            {getPostSourceName(alert)}
          </h2>

          <p className="text-sm text-slate-400 mt-2">
            System-ku wuxuu helay post AI/model-ku crime u aqoonsaday.
          </p>
        </div>

        <span className={priorityClass(alert.priority)}>
          {alert.priority || "high"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Info icon={User} label="Post Source" value={getPostSourceName(alert)} />
        <Info icon={Link} label="Matched Page" value={getMatchedPage(alert)} />
        <Info label="Source Type" value={alert.sourceType || "facebook"} />
        <Info label="Status" value={alert.status || "new"} />
        <Info label="Prediction" value={history.prediction || "CRIME-RELATED"} />
        <Info
          label="Confidence"
          value={
            history.confidence || history.confidence === 0
              ? `${history.confidence}%`
              : "Not provided"
          }
        />
        <Info
          label="Matched Keyword"
          value={history.matchedKeyword || alert.matchedValue || "Not provided"}
        />
        <Info label="Detected Time" value={formatDate(alert.createdAt)} />
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-red-300 font-bold mb-3">
          <AlertTriangle size={18} />
          Detected Crime Post Content
        </div>

        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-7">
          {alert.content || history.content || "No content available"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onInvestigate(alert)}
          className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm hover:bg-cyan-400"
        >
          <ShieldAlert size={16} />
          Investigate
        </button>

        <button
          type="button"
          onClick={onGoToCases}
          className="inline-flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 font-bold px-4 py-2 rounded-xl text-sm hover:bg-slate-700"
        >
          <Eye size={16} />
          Go to Case Management
        </button>

        <span className="inline-flex items-center gap-2 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm">
          <CheckCircle2 size={16} />
          Crime Alert Recorded
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
      <Bell className="mx-auto text-slate-500 mb-4" size={42} />

      <h2 className="text-xl font-bold">Weli crime alert lama helin</h2>

      <p className="text-slate-400 mt-2">
        Marka Facebook Page blacklist ku jira uu soo dhigo post crime ah,
        notification halkan ayuu kasoo muuqan doonaa.
      </p>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 font-bold">
        {Icon && <Icon size={14} />}
        {label}
      </div>

      <div className="text-sm text-slate-200 mt-2 break-all">
        {value || "Not available"}
      </div>
    </div>
  );
}

function getPostSourceName(alert) {
  if (alert.authorName) return alert.authorName;
  if (alert.pageName) return alert.pageName;
  if (alert.history?.authorName) return alert.history.authorName;
  if (alert.blacklistItem?.pageName) return alert.blacklistItem.pageName;
  if (alert.blacklistItem?.name) return alert.blacklistItem.name;
  return "Facebook Crime Alert";
}

function getMatchedPage(alert) {
  if (alert.blacklistItem?.value) return alert.blacklistItem.value;
  if (alert.blacklistItem?.pageUrl) return alert.blacklistItem.pageUrl;
  if (alert.matchedValue) return alert.matchedValue;
  return "Not available";
}

function priorityClass(priority) {
  if (priority === "low") {
    return "text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30";
  }

  if (priority === "medium") {
    return "text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30";
  }

  return "text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30";
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dedupeAlerts(list = []) {
  const seen = new Set();

  return list.filter((alert) => {
    const content = alert.content || alert.history?.content || "";
    const contentKey = normalizeAlertContent(content);
    const dayKey =
      alert.dayKey || new Date(alert.createdAt || Date.now()).toDateString();

    const key = [
      alert.blacklistItem?._id || alert.blacklistItem || "",
      alert.matchedValue || "",
      alert.sourceType || "",
      dayKey,
      alert.postId || alert.contentFingerprint || contentKey,
    ].join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeAlertContent(value = "") {
  return String(value)
    .toLowerCase()
    .replace(
      /\b\d+\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\b/g,
      ""
    )
    .replace(/[·•]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
