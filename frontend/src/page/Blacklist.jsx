import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  PlayCircle,
  PauseCircle,
  ShieldAlert,
  List,
  ArrowLeft,
  Eye,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  Database,
  FileText,
  Link as LinkIcon,
  X,
} from "lucide-react";
import API from "../api";

export default function Blacklist() {
  const navigate = useNavigate();

  const [view, setView] = useState("facebook");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanningId, setScanningId] = useState("");
  const [error, setError] = useState("");
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState({
    type: "facebook_page",
    name: "",
    value: "",
    reason: "Crime / Terrorism Content",
    priority: "high",
  });

  const facebookPages = useMemo(
    () => dedupeItems(items).filter((item) => item.type === "facebook_page"),
    [items]
  );

  const loadBlacklist = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/blacklist");
      setItems(dedupeItems(res.data || []));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setError("");
      const res = await API.get("/blacklist/stats/overview");
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadBlacklist();
  }, []);

  useEffect(() => {
    if (view === "statistics") {
      loadStats();
    }
  }, [view]);

  const addFacebookPage = async (e) => {
    e.preventDefault();

    try {
      setError("");
      const res = await API.post("/blacklist", { ...form, type: "facebook_page" });
      setItems((prev) => dedupeItems([res.data.item, ...prev]));

      setForm({
        type: "facebook_page",
        name: "",
        value: "",
        reason: "Crime / Terrorism Content",
        priority: "high",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add Facebook page");
    }
  };

  const updateItem = async (id, updates) => {
    try {
      const res = await API.patch(`/blacklist/${id}`, updates);
      setItems((prev) => prev.map((item) => (item._id === id ? res.data.item : item)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update item");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Remove this item from the blacklist?")) return;

    try {
      await API.delete(`/blacklist/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete item");
    }
  };

  const scanAllPages = async () => {
    try {
      setScanningAll(true);
      setError("");
      await API.post("/blacklist/facebook/scan");
      await loadBlacklist();
    } catch (err) {
      setError(err.response?.data?.message || "Scan all failed");
    } finally {
      setScanningAll(false);
    }
  };

  const scanOnePage = async (id) => {
    try {
      setScanningId(id);
      setError("");
      await API.post(`/blacklist/facebook/scan/${id}`);
      await loadBlacklist();
    } catch (err) {
      setError(err.response?.data?.message || "Single page scan failed");
    } finally {
      setScanningId("");
    }
  };

  const viewPosts = (id) => {
    navigate(`/blacklist/facebook/${id}/posts`);
  };

  const openDetails = async (id) => {
    try {
      setDetailLoading(true);
      setError("");
      setDetailData(null);
      const res = await API.get(`/blacklist/${id}/details`);
      setDetailData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load blacklist details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailData(null);
    setDetailLoading(false);
  };

  return (
    <div className="min-h-screen w-full p-8 transition-colors duration-300" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-cyan-400 font-semibold">
                BAREAI Watchlist Intelligence
              </p>

              <h1 className="text-3xl font-bold mt-1">
                {view === "facebook"
                  ? "Facebook Pages Blacklist"
                  : view === "statistics"
                  ? "Blacklist Analytics & Insights"
                  : "All Blacklists"}
              </h1>

              <p className="text-sm text-slate-400 mt-2">
                {view === "facebook"
                  ? "Add a public Facebook Page, then the system will scan its posts."
                  : view === "statistics"
                  ? "View statistics about blacklist items and their classification."
                  : "Here you can see all the blacklist items in the system."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setView("statistics")}
                className={`inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm ${
                  view === "statistics"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 border border-slate-700 text-slate-200"
                }`}
              >
                <BarChart3 size={16} />
                Analytics
              </button>

              <button
                type="button"
                onClick={() =>
                  setView(view === "facebook" ? "all" : view === "all" ? "facebook" : "facebook")
                }
                className={`inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm ${
                  view === "all"
                    ? "bg-cyan-500 text-slate-950"
                    : view === "facebook"
                    ? "bg-slate-800 border border-slate-700 text-slate-200"
                    : "hidden"
                }`}
              >
                {view === "facebook" ? <List size={16} /> : <ArrowLeft size={16} />}
                {view === "facebook" ? "View Blacklists" : "Back to Facebook Pages"}
              </button>

              {view === "facebook" && (
                <button
                  type="button"
                  onClick={scanAllPages}
                  disabled={scanningAll}
                  className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  <RefreshCw size={16} className={scanningAll ? "animate-spin" : ""} />
                  {scanningAll ? "Scanning All..." : "Scan All Now"}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {view === "statistics" ? (
            <StatisticsView
              stats={stats}
              loading={statsLoading}
              onDeleteItem={deleteItem}
              onViewDetails={openDetails}
            />
          ) : view === "facebook" ? (
            <>
              <form
                onSubmit={addFacebookPage}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6"
              >
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <Globe size={20} className="text-cyan-400" />
                  Add Facebook Page
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Page Name"
                    placeholder="Example: Munasar"
                    value={form.name}
                    onChange={(value) => setForm({ ...form, name: value })}
                  />

                  <Field
                    label="Facebook Page URL"
                    placeholder="https://www.facebook.com/PageName"
                    value={form.value}
                    onChange={(value) => setForm({ ...form, value })}
                  />

                  <Field
                    label="Reason"
                    value={form.reason}
                    onChange={(value) => setForm({ ...form, reason: value })}
                  />

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <button className="mt-5 inline-flex items-center gap-2 bg-cyan-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm">
                  <Plus size={16} />
                  Add Page
                </button>
              </form>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-5">Saved Facebook Pages</h2>

                {loading ? (
                  <p className="text-slate-400">Loading pages...</p>
                ) : facebookPages.length === 0 ? (
                  <Empty text="Weli Facebook Page lama darin." />
                ) : (
                  <div className="space-y-4">
                    {facebookPages.map((item) => (
                      <FacebookPageCard
                        key={item._id}
                        item={item}
                        scanningId={scanningId}
                        onScan={scanOnePage}
                        onUpdate={updateItem}
                        onDelete={deleteItem}
                        onViewPosts={viewPosts}
                        onViewDetails={openDetails}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-5">All Saved Blacklists</h2>

              {loading ? (
                <p className="text-slate-400">Loading blacklists...</p>
              ) : items.length === 0 ? (
                <Empty text="Blacklist wali waxba kuma jiraan." />
              ) : (
                <div className="space-y-3">
                  {dedupeItems(items).map((item) => (
                    <div
                      key={item._id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{item.name}</h3>
                            <Badge color="cyan">{item.type}</Badge>
                            <Badge color="red">{item.priority}</Badge>
                            <Badge color={item.active ? "green" : "gray"}>
                              {item.active ? "Active" : "Paused"}
                            </Badge>
                          </div>

                          <p className="text-sm text-slate-300 mt-2 break-all">
                            {item.value}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(item._id)}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            <FileText size={15} />
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item._id, { active: !item.active })
                            }
                            className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            {item.active ? "Pause" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(item._id)}
                            className="inline-flex items-center gap-2 bg-red-500/10 text-red-300 px-3 py-2 rounded-lg text-xs font-bold"
                          >
                            <Trash2 size={15} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {(detailLoading || detailData) && (
          <BlacklistDetailsModal
            data={detailData}
            loading={detailLoading}
            onClose={closeDetails}
          />
        )}
    </div>
  );
}

function FacebookPageCard({
  item,
  scanningId,
  onScan,
  onUpdate,
  onDelete,
  onViewPosts,
  onViewDetails,
}) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-lg">{item.name}</h3>

            <Badge color="red">{item.priority}</Badge>
            <Badge color={item.active ? "green" : "gray"}>
              {item.active ? "Active" : "Paused"}
            </Badge>
            <Badge color={item.monitorEnabled ? "cyan" : "gray"}>
              {item.monitorEnabled ? "Live Monitor" : "Monitor Off"}
            </Badge>
          </div>

          <p className="text-sm text-cyan-300 mt-2 break-all">{item.value}</p>
          <p className="text-xs text-slate-500 mt-1">{item.reason}</p>

          <p className="text-xs text-slate-500 mt-2">
            Last scan:{" "}
            {item.lastScannedAt ? new Date(item.lastScannedAt).toLocaleString() : "Never"}{" "}
            - {item.lastScanStatus || "not_scanned"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(item._id)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
          >
            <FileText size={15} />
            Details
          </button>

          <button
            type="button"
            onClick={() => onScan(item._id)}
            disabled={scanningId === item._id}
            className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw size={15} className={scanningId === item._id ? "animate-spin" : ""} />
            {scanningId === item._id ? "Scanning..." : "Scan"}
          </button>

          <button
            type="button"
            onClick={() => onViewPosts(item._id)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
          >
            <Eye size={15} />
            View Posts
          </button>

          <button
            type="button"
            onClick={() => onUpdate(item._id, { monitorEnabled: !item.monitorEnabled })}
            className="inline-flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold"
          >
            {item.monitorEnabled ? (
              <>
                <PauseCircle size={15} />
                Stop
              </>
            ) : (
              <>
                <PlayCircle size={15} />
                Start
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onUpdate(item._id, { active: !item.active })}
            className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-xs font-bold"
          >
            {item.active ? "Pause" : "Activate"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(item._id)}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 text-red-300 px-3 py-2 text-xs font-bold"
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500"
        required
      />
    </div>
  );
}

function Badge({ children, color }) {
  const classes = {
    red: "bg-red-500/10 text-red-300 border-red-500/30",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    gray: "bg-slate-500/10 text-slate-400 border-slate-600",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${classes[color]}`}>
      {children}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="text-center py-12">
      <ShieldAlert className="mx-auto text-slate-500 mb-3" size={40} />
      <p className="text-slate-400">{text}</p>
    </div>
  );
}

function BlacklistDetailsModal({ data, loading, onClose }) {
  const item = data?.item;
  const report = data?.report || {};
  const histories = data?.histories || [];
  const alerts = data?.alerts || [];
  const relatedUrls = data?.relatedUrls || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-cyan-300">
              Blacklist Information
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {item?.name || "Loading details..."}
            </h2>
            {item?.value && (
              <p className="mt-2 break-all text-sm text-cyan-200">{item.value}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-slate-400">Loading blacklist information...</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailStat
                  title="Total Matches"
                  value={report.totalMatches || 0}
                  icon={Database}
                />
                <DetailStat
                  title="Crime Matches"
                  value={report.crimeCount || 0}
                  icon={ShieldAlert}
                />
                <DetailStat
                  title="Not-Crime"
                  value={report.notCrimeCount || 0}
                  icon={AlertCircle}
                />
                <DetailStat
                  title="Alerts"
                  value={report.totalAlerts || 0}
                  icon={TrendingUp}
                />
              </div>

              <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-bold">
                    <CalendarDays size={18} className="text-cyan-300" />
                    Date and Reason
                  </h3>

                  <div className="space-y-3">
                    <DetailRow label="Added date" value={formatDate(item?.createdAt)} />
                    <DetailRow label="Updated date" value={formatDate(item?.updatedAt)} />
                    <DetailRow label="Reason" value={item?.reason || "No reason saved"} />
                    <DetailRow label="Priority" value={item?.priority || "N/A"} />
                    <DetailRow label="Status" value={item?.active ? "Active" : "Paused"} />
                    <DetailRow
                      label="Added by"
                      value={item?.createdBy?.name || item?.createdBy?.email || "Unknown"}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="mb-4 flex items-center gap-2 font-bold">
                    <LinkIcon size={18} className="text-cyan-300" />
                    Related URLs
                  </h3>

                  {relatedUrls.length === 0 ? (
                    <p className="text-sm text-slate-500">No related URLs found.</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedUrls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-cyan-200 hover:border-cyan-500/40"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-4 flex items-center gap-2 font-bold">
                  <FileText size={18} className="text-cyan-300" />
                  General Report
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <DetailRow
                    label="Pending investigations"
                    value={report.pendingCount || 0}
                  />
                  <DetailRow
                    label="Sent to investigation"
                    value={report.sentToInvestigationCount || 0}
                  />
                  <DetailRow label="Crime cases" value={report.crimeCaseCount || 0} />
                  <DetailRow
                    label="Latest match"
                    value={formatDate(report.latestMatchAt)}
                  />
                  <DetailRow
                    label="Latest alert"
                    value={formatDate(report.latestAlertAt)}
                  />
                  <DetailRow label="Recent alerts" value={alerts.length} />
                </div>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-4 flex items-center gap-2 font-bold">
                  <Database size={18} className="text-cyan-300" />
                  All Saved Data
                </h3>
                <pre className="max-h-80 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-4 font-bold">Matched History Records</h3>

                {histories.length === 0 ? (
                  <p className="text-sm text-slate-500">No matched history records found.</p>
                ) : (
                  <div className="space-y-3">
                    {histories.slice(0, 25).map((history) => (
                      <HistoryMatchCard key={history._id} history={history} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailStat({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-cyan-300">{title}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <Icon size={22} className="text-cyan-300/70" />
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  const displayValue = value === 0 ? 0 : value || "N/A";

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-slate-200">{displayValue}</p>
    </div>
  );
}

function HistoryMatchCard({ history }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge color={history.isCrime ? "red" : "green"}>
          {history.isCrime ? "CRIME" : "NOT CRIME"}
        </Badge>
        <Badge color="cyan">{history.sourceType || history.type || "history"}</Badge>
        <span className="text-xs text-slate-500">{formatDate(history.createdAt)}</span>
      </div>

      <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {history.content}
      </p>

      {history.url && (
        <a
          href={history.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block break-all text-sm text-cyan-300 hover:underline"
        >
          {history.url}
        </a>
      )}
    </div>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

function StatisticsView({ stats, loading, onDeleteItem, onViewDetails }) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400">Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400">No statistics available</p>
      </div>
    );
  }

  const { summary = {}, topItems = [], removableItems = [] } = stats;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Blacklist Items"
          value={summary.totalBlacklistItems || 0}
          icon={ShieldAlert}
          color="cyan"
        />
        <SummaryCard
          title="Total Matches"
          value={summary.totalMatches || 0}
          icon={TrendingUp}
          color="blue"
        />
        <SummaryCard
          title="Crime Matches"
          value={summary.totalCrimeMatches || 0}
          icon={AlertCircle}
          color="red"
        />
        <SummaryCard
          title="Not-Crime Matches"
          value={summary.totalNotCrimeMatches || 0}
          icon={AlertCircle}
          color="green"
        />
      </div>

      {/* Most Common Items */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
          <TrendingUp size={20} className="text-cyan-400" />
          Most Common Blacklist Items
        </h2>

        {topItems.length === 0 ? (
          <Empty text="No matching items found" />
        ) : (
          <div className="space-y-3">
            {topItems.map((item) => (
              <ItemStatCard
                key={item._id}
                item={item}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Removable Items */}
      {removableItems.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-red-300">
            <AlertCircle size={20} />
            Items That Can Be Removed ({removableItems.length})
          </h2>

          <p className="text-sm text-slate-300 mb-4">
            These items have more "not-crime" classifications than "crime". Consider reviewing and removing them from the blacklist.
          </p>

          <div className="space-y-3">
            {removableItems.map((item) => (
              <RemovableItemCard
                key={item._id}
                item={item}
                onDelete={() => onDeleteItem(item._id)}
                onViewDetails={() => onViewDetails(item._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    cyan: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    red: "bg-red-500/10 border-red-500/30 text-red-300",
    green: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  };

  return (
    <div className={`border rounded-xl p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <Icon size={24} className="opacity-50" />
      </div>
    </div>
  );
}

function ItemStatCard({ item, onViewDetails }) {
  const totalMatches = item.totalMatches || 0;
  const crimePercentage = item.crimePercentage || 0;
  const notCrimePercentage = item.notCrimePercentage || 0;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{item.name}</h3>
            <Badge color="cyan">{item.type}</Badge>
            <Badge color="red">{item.priority}</Badge>
          </div>
          <p className="text-sm text-slate-300 mt-2 break-all">{item.value}</p>
          <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
        </div>

        <div className="flex flex-col gap-3 min-w-max">
          <button
            type="button"
            onClick={() => onViewDetails(item._id)}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
          >
            <FileText size={15} />
            Details
          </button>

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Total Matches</p>
            <p className="text-2xl font-bold text-cyan-400">{totalMatches}</p>
          </div>

          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-xs text-red-300 mb-1">Crime</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-red-400">
                  {item.crimeCount}
                </span>
                <span className="text-xs text-slate-500">({crimePercentage}%)</span>
              </div>
            </div>
            <div className="w-px bg-slate-700"></div>
            <div className="text-center">
              <p className="text-xs text-emerald-300 mb-1">Not-Crime</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-emerald-400">
                  {item.notCrimeCount}
                </span>
                <span className="text-xs text-slate-500">({notCrimePercentage}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden flex">
        <div
          className="bg-red-500"
          style={{ width: `${crimePercentage}%` }}
        ></div>
        <div
          className="bg-emerald-500"
          style={{ width: `${notCrimePercentage}%` }}
        ></div>
        {totalMatches > (item.crimeCount + item.notCrimeCount) && (
          <div
            className="bg-slate-600"
            style={{
              width: `${100 - crimePercentage - notCrimePercentage}%`,
            }}
          ></div>
        )}
      </div>
    </div>
  );
}

function RemovableItemCard({ item, onDelete, onViewDetails }) {
  return (
    <div className="bg-slate-950 border border-red-500/30 rounded-xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{item.name}</h3>
            <Badge color="cyan">{item.type}</Badge>
            <Badge color="red">{item.priority}</Badge>
          </div>
          <p className="text-sm text-slate-300 mt-2 break-all">{item.value}</p>

          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-xs text-slate-400">Crime Matches</p>
              <p className="font-bold text-red-400">{item.crimeCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Not-Crime Matches</p>
              <p className="font-bold text-emerald-400">{item.notCrimeCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            <FileText size={16} />
            Details
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm font-bold"
          >
            <Trash2 size={16} />
            Remove from Blacklist
          </button>
        </div>
      </div>
    </div>
  );
}

function dedupeItems(list) {
  const seen = new Set();

  return list.filter((item) => {
    const key = `${item.type}:${String(item.value || "")
      .trim()
      .replace(/\/+$/, "")
      .toLowerCase()}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
