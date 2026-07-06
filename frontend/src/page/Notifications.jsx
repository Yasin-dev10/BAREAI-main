import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  Link,
  ListChecks,
  ShieldAlert,
  User,
} from "lucide-react";
import API from "../api";
import { getStoredUser } from "../theme";

const READ_NOTIFICATION_STORAGE_KEY = "bareai.readNotificationRecords";

export default function Notifications() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isInvestigator = user?.role === "investigator";
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const markingReadKeys = useRef(new Set());

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const nextRecords = isInvestigator
        ? await loadAssignedCaseNotifications()
        : await loadCrimeAlertNotifications();

      setRecords(nextRecords);
      setSelected((current) => {
        if (current) {
          const updated = nextRecords.find((record) => record._id === current._id);
          if (updated) return updated;
          return current;
        }

        return null;
      });
    } catch (err) {
      console.error("Notification loading error:", err);
      setError(err.response?.data?.message || "Failed to load notifications");
      setRecords([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

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

  const markRecordRead = async (record) => {
    const recordKey = getNotificationRecordKey(record);
    if (recordKey && markingReadKeys.current.has(recordKey)) return;

    setSelected(record);
    if (recordKey) markingReadKeys.current.add(recordKey);

    if (!record.notificationId) {
      hideLocalNotificationRecord(record);
      const nextRecords = records.filter(
        (item) => getNotificationRecordKey(item) !== getNotificationRecordKey(record)
      );
      setRecords(nextRecords);
      setSelected({ ...record, read: true });
      if (recordKey) markingReadKeys.current.delete(recordKey);
      return;
    }

    if (record.read) {
      if (recordKey) markingReadKeys.current.delete(recordKey);
      return;
    }

    try {
      await API.patch(`/notifications/${record.notificationId}/read`);
      const nextRecords = records.filter(
        (item) => item.notificationId !== record.notificationId
      );

      setRecords(nextRecords);
      window.dispatchEvent(new Event("notifications:read"));
      setSelected({ ...record, read: true });
    } catch {
      setRecords((prev) =>
        prev.map((item) =>
          item.notificationId === record.notificationId
            ? { ...item, read: true }
            : item
        )
      );
      setSelected((current) =>
        current?._id === record._id ? { ...current, read: true } : current
      );
    } finally {
      if (recordKey) markingReadKeys.current.delete(recordKey);
    }
  };

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 10000);

    return () => clearInterval(interval);
  }, [isInvestigator]);

  const openAssignedCase = async (record) => {
    const caseId = record.case?._id;
    if (!caseId) {
      navigate("/cases");
      return;
    }

    try {
      if (record.notificationId && !record.read) {
        await API.patch(`/notifications/${record.notificationId}/read`);
        setRecords((prev) =>
          prev.map((item) =>
            item.notificationId === record.notificationId ? { ...item, read: true } : item
          )
        );
      }
    } catch {
      // Opening the case is still the important action if read-state fails.
    }

    navigate(`/cases?case=${caseId}`);
  };

  return (
    <div
      className="min-h-screen w-full p-8 transition-colors duration-300"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-cyan-400 font-semibold">
              {isInvestigator ? "BAREAI Assignment Center" : "BAREAI Live Alerts"}
            </p>

            <h1 className="text-3xl font-bold mt-1">
              {isInvestigator ? "Assigned Case Notifications" : "Facebook Crime Notifications"}
            </h1>

            <p className="text-sm text-slate-400 mt-2">
              {isInvestigator
                ? "Cases assigned to you appear here. Open one to continue in Case Management."
                : "Halkan waxaad ka arkeysaa kaliya alerts-ka crime ah ee ka yimid Facebook Pages-ka ku jira blacklist."}
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
          <p className="text-slate-400">Loading notifications...</p>
        ) : records.length === 0 ? (
          <EmptyState isInvestigator={isInvestigator} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              {records.map((record) => (
                <button
                  key={record._id}
                  onClick={() => markRecordRead(record)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selected?._id === record._id
                      ? "bg-cyan-500/10 border-cyan-500"
                      : "bg-slate-900 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {isInvestigator ? (
                    <AssignedCaseListItem record={record} />
                  ) : (
                    <CrimeAlertListItem alert={record} />
                  )}
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                isInvestigator ? (
                  <AssignedCaseDetails record={selected} onOpenCase={() => openAssignedCase(selected)} />
                ) : (
                  <AlertDetails
                    alert={selected}
                    onInvestigate={investigateAlert}
                    onGoToCases={() => navigate("/cases")}
                  />
                )
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
                  <Eye className="mx-auto text-slate-500 mb-3" size={36} />

                  <p className="text-slate-400">
                    Dooro notification si aad faahfaahinta u aragto.
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

async function loadAssignedCaseNotifications() {
  const [notificationsRes, casesRes] = await Promise.all([
    API.get("/notifications"),
    API.get("/investigation/cases?status=all"),
  ]);

  const notifications = Array.isArray(notificationsRes.data) ? notificationsRes.data : [];
  const cases = Array.isArray(casesRes.data) ? casesRes.data : [];
  const notificationCaseIds = new Set(
    notifications
      .map((notification) => notification.case?._id)
      .filter(Boolean)
  );

  const fromNotifications = notifications
    .filter((notification) => notification.case && !notification.read)
    .map((notification) => {
      return {
        _id: notification._id,
        notificationId: notification._id,
        title: notification.title,
        message: notification.message,
        read: notification.read,
        case: notification.case,
        createdAt: notification.createdAt,
        source: "notification",
      };
    });

  const fromCases = cases
    .filter((item) => !notificationCaseIds.has(item._id))
    .map((item) => ({
      _id: `case-${item._id}`,
      title: "Assigned investigation case",
      message: "This case is assigned to you.",
      read: true,
      case: item,
      createdAt: item.updatedAt || item.createdAt,
      source: "case",
    }));

  return [...fromNotifications, ...fromCases]
    .filter((record) => !isLocalNotificationRecordHidden(record))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function loadCrimeAlertNotifications() {
  const res = await API.get("/blacklist/alerts/history");

  const rawAlerts = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.data?.data)
    ? res.data.data
    : [];

  const crimeAlerts = rawAlerts.filter((alert) => {
    const history = alert.history || {};
    const isCrimeAlert =
      history.isCrime === true ||
      history.prediction === "CRIME-RELATED" ||
      alert.isCrime === true;

    return alert.status !== "sent_to_investigation" && isCrimeAlert;
  });

  return dedupeAlerts(crimeAlerts).filter(
    (alert) => !isLocalNotificationRecordHidden(alert)
  );
}

function getStoredReadNotificationKeys() {
  try {
    return JSON.parse(localStorage.getItem(READ_NOTIFICATION_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function hideLocalNotificationRecord(record) {
  const key = getNotificationRecordKey(record);
  if (!key) return;

  const keys = new Set(getStoredReadNotificationKeys());
  keys.add(key);
  localStorage.setItem(READ_NOTIFICATION_STORAGE_KEY, JSON.stringify([...keys]));
}

function isLocalNotificationRecordHidden(record) {
  const key = getNotificationRecordKey(record);
  if (!key) return false;

  return getStoredReadNotificationKeys().includes(key);
}

function getNotificationRecordKey(record = {}) {
  const history = record.history || {};
  const content = record.content || history.content || "";

  return [
    record.notificationId || "",
    record._id || "",
    record.postId || "",
    history._id || "",
    record.blacklistItem?._id || record.blacklistItem || "",
    record.matchedValue || "",
    record.contentFingerprint || normalizeAlertContent(content),
  ]
    .filter(Boolean)
    .join("|");
}

function AssignedCaseListItem({ record }) {
  const item = record.case || {};
  const history = item.history || {};

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ListChecks className="text-cyan-300 shrink-0" size={18} />

          <h3 className="font-bold text-sm truncate">
            {record.title || "Assigned investigation case"}
          </h3>
        </div>

        {!record.read && (
          <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/30">
            New
          </span>
        )}
      </div>

      <p className="text-sm text-slate-400 mt-3 line-clamp-2">
        {history.content || record.message || "No case content available"}
      </p>

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
        <Clock size={13} />
        {formatDate(record.createdAt || item.createdAt)}
      </div>
    </>
  );
}

function CrimeAlertListItem({ alert }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="text-red-400 shrink-0" size={18} />

          <h3 className="font-bold text-sm truncate">{getPostSourceName(alert)}</h3>
        </div>

        <span className={priorityClass(alert.priority)}>{alert.priority || "high"}</span>
      </div>

      <p className="text-sm text-slate-400 mt-3 line-clamp-2">
        {alert.content || alert.history?.content || "No content available"}
      </p>

      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
        <Clock size={13} />
        {formatDate(alert.createdAt)}
      </div>
    </>
  );
}

function AssignedCaseDetails({ record, onOpenCase }) {
  const item = record.case || {};
  const history = item.history || {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-cyan-400 font-semibold">
            Assigned Investigation Case
          </p>

          <h2 className="text-2xl font-bold mt-1">
            {(history.sourceType || history.type || "Record").toUpperCase()} Case
          </h2>

          <p className="text-sm text-slate-400 mt-2">
            {record.message || "This case has been assigned to you for review."}
          </p>
        </div>

        <span className={statusClass(item.status)}>{formatStatus(item.status)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Info icon={User} label="Assigned Officer" value={item.assignedOfficer?.name || "You"} />
        <Info label="Category" value={formatCategory(item.category)} />
        <Info label="Source Type" value={history.sourceType || history.type || "record"} />
        <Info label="Status" value={formatStatus(item.status)} />
        <Info label="Prediction" value={history.prediction || "Not provided"} />
        <Info
          label="Confidence"
          value={
            history.confidence || history.confidence === 0
              ? `${history.confidence}%`
              : "Not provided"
          }
        />
        <Info label="Assigned Time" value={formatDate(record.createdAt)} />
        <Info label="Case Time" value={formatDate(item.createdAt)} />
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-cyan-300 font-bold mb-3">
          <Inbox size={18} />
          Case Content
        </div>

        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-7">
          {history.content || "No content available"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onOpenCase}
          className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm hover:bg-cyan-400"
        >
          <ListChecks size={16} />
          Open in Case Management
        </button>

        {!record.read && (
          <span className="inline-flex items-center gap-2 text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl text-sm">
            <Bell size={16} />
            Unread Assignment
          </span>
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

          <h2 className="text-2xl font-bold mt-1">{getPostSourceName(alert)}</h2>

          <p className="text-sm text-slate-400 mt-2">
            System-ku wuxuu helay post AI/model-ku crime u aqoonsaday.
          </p>
        </div>

        <span className={priorityClass(alert.priority)}>{alert.priority || "high"}</span>
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

function EmptyState({ isInvestigator }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
      <Bell className="mx-auto text-slate-500 mb-4" size={42} />

      <h2 className="text-xl font-bold">
        {isInvestigator ? "No assigned cases yet" : "Weli crime alert lama helin"}
      </h2>

      <p className="text-slate-400 mt-2">
        {isInvestigator
          ? "Marka admin case kuu assign gareeyo, notification halkan ayuu kasoo muuqan doonaa."
          : "Marka Facebook Page blacklist ku jira uu soo dhigo post crime ah, notification halkan ayuu kasoo muuqan doonaa."}
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

function statusClass(status) {
  const classes = {
    pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    investigating: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    crime_case: "bg-red-500/10 text-red-300 border-red-500/30",
    not_crime: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    archived: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  };

  return `text-xs px-2 py-1 rounded-full border ${
    classes[status] || "bg-slate-500/10 text-slate-300 border-slate-500/30"
  }`;
}

function formatStatus(status = "") {
  return (
    {
      pending: "Pending",
      investigating: "Investigating",
      crime_case: "Crime Case",
      not_crime: "Not Crime",
      resolved: "Resolved",
      archived: "Archived",
    }[status] || status || "Pending"
  );
}

function formatCategory(category = "") {
  return (
    {
      murder: "Murder",
      robbery: "Robbery",
      terrorism: "Terrorism",
      sexual_assault: "Sexual Assault",
      financial_fraud: "Financial Fraud",
      drug_crimes: "Drug Crimes",
      cybercrime: "Cybercrime",
      general: "General",
    }[category] || category || "General"
  );
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
    .replace(/[Â·â€¢]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
