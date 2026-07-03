import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserCheck,
  X,
  Hash,
  User,
  Activity,
  TrendingUp,
  FileText,
} from "lucide-react";
import API from "../api";
import { getStoredUser } from "../theme";

// ── Specialization config ─────────────────────────────────────────────────
const SPECIALIZATION_OPTIONS = [
  { value: 'murder',           label: 'Dilalka' },
  { value: 'robbery',          label: 'Xasaarad & Dhac' },
  { value: 'terrorism',        label: 'Argagixiso' },
  { value: 'sexual_assault',   label: 'Kufsiga' },
  { value: 'financial_fraud',  label: 'Khiyaano Maaliyadeed' },
  { value: 'drug_crimes',      label: 'Daroogada' },
  { value: 'cybercrime',       label: 'Xadgudubka Kumbiyuutarka' },
  { value: 'general',          label: 'General' },
];

const getSpecLabel = (value) => SPECIALIZATION_OPTIONS.find((s) => s.value === value);

const getCaseCategory = (item) => item?.category || "general";

const officerMatchesCategory = (officer, category) => {
  const specs = officer.specializations || [];
  return specs.includes(category) || specs.includes("general");
};

const getSortedOfficers = (officers, category) =>
  [...officers].sort((a, b) => {
    const aMatch = officerMatchesCategory(a, category) ? 1 : 0;
    const bMatch = officerMatchesCategory(b, category) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

const statusStyles = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  investigating: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  crime_case: "bg-red-500/10 text-red-300 border-red-500/30",
  not_crime: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  archived: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

export default function CaseManagement() {
  const location = useLocation();
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const specCounts = useMemo(() => {
    const counts = {};
    officers.forEach((o) => {
      const specs = o.specializations || [];
      specs.forEach((s) => {
        if (s) {
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [officers]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const requests = isAdmin
        ? [
            API.get("/investigation/alerts"),
            API.get(`/investigation/cases?status=${statusFilter}`),
            API.get("/investigation/officers"),
          ]
        : [Promise.resolve({ data: [] }), API.get(`/investigation/cases?status=${statusFilter}`), Promise.resolve({ data: [] })];

      const [alertsRes, casesRes, officersRes] = await Promise.all(requests);

      setAlerts(alertsRes.data || []);
      setCases(casesRes.data || []);
      setOfficers(officersRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load case management data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, isAdmin]);

  useEffect(() => {
    const caseId = new URLSearchParams(location.search).get("case");
    if (!caseId) return;

    const match = cases.find((item) => item._id === caseId);
    if (match) setSelectedCase(match);
  }, [location.search, cases]);

  const totals = useMemo(
    () => ({
      records: alerts.length,
      pending: cases.filter((item) => item.status === "pending").length,
      investigating: cases.filter((item) => item.status === "investigating").length,
      crimeCase: cases.filter((item) => item.status === "crime_case").length,
      notCrime: cases.filter((item) => item.status === "not_crime").length,
    }),
    [alerts, cases]
  );

  const createCase = async (historyId) => {
    try {
      const res = await API.post("/investigation/cases", { historyId });
      setCases((prev) =>
        statusFilter === "all" || res.data.case.status === statusFilter
          ? [res.data.case, ...prev.filter((item) => item._id !== res.data.case._id)]
          : prev.filter((item) => item._id !== res.data.case._id)
      );
      setAlerts((prev) => prev.filter((item) => item._id !== historyId));
      setSelectedCase(res.data.case);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create case");
    }
  };

  const updateCase = async (id, updates) => {
    try {
      const res = await API.patch(`/investigation/cases/${id}`, updates);
      setCases((prev) => {
        const shouldKeep =
          statusFilter === "all" || res.data.case.status === statusFilter;
        const withoutOld = prev.filter((item) => item._id !== id);
        return shouldKeep ? [res.data.case, ...withoutOld] : withoutOld;
      });
      setSelectedCase(res.data.case);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to update case"
      );
    }
  };

  const deleteCase = async (id) => {
    try {
      await API.delete(`/investigation/cases/${id}`);
      setCases((prev) => prev.filter((item) => item._id !== id));
      if (selectedCase?._id === id) setSelectedCase(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete case");
    }
  };

  return (
    <div className="min-h-screen w-full p-8 transition-colors duration-300" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-cyan-400 font-semibold">
                {isAdmin ? "BAREAI Admin Desk" : "BAREAI Investigator Desk"}
              </p>
              <h1 className="text-3xl font-bold mt-1">Case Management</h1>
              {/* <p className="text-sm text-slate-400 mt-2">
                Admin wuxuu alerts u beddelaa cases, wuxuu assign-gareeyaa officers,
                wuxuuna maamulaa status-ka cases-ka.
              </p> */}
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm"
            >
              <option value="all">All cases</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="crime_case">Crime Case</option>
              <option value="not_crime">Not Crime</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {isAdmin && <Metric title="Available Records" value={totals.records} icon={ShieldAlert} />}
            <Metric title="Pending" value={totals.pending} icon={ClipboardList} />
            <Metric title="Investigating" value={totals.investigating} icon={Eye} />
            <Metric title="Crime Cases" value={totals.crimeCase} icon={ShieldAlert} />
            <Metric title="Not Crime" value={totals.notCrime} icon={ShieldCheck} />
          </div>

          {loading ? (
            <p className="text-slate-400">Loading case management...</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {isAdmin && <section className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-red-300" size={20} />
                  Records Ready for Review
                </h2>

                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No records waiting for investigation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert._id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-red-300 uppercase">
                            {alert.sourceType || alert.type} record
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              alert.isCrime
                                ? "bg-red-500/10 text-red-300 border-red-500/30"
                                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {alert.isCrime ? "Crime" : "Not Crime"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-slate-300 mt-3 line-clamp-3">
                          {alert.content}
                        </p>

                        <div className="text-xs text-slate-400 mt-3">
                          Prediction: <b>{alert.prediction}</b> - Confidence:{" "}
                          <b>{alert.confidence}%</b>
                        </div>

                        <button
                          onClick={() => createCase(alert._id)}
                          className="mt-4 w-full bg-cyan-500 text-slate-950 font-bold rounded-lg py-2 text-sm"
                        >
                          Send to Investigator
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>}

              <section className={`${isAdmin ? "xl:col-span-2" : "xl:col-span-3"} bg-slate-900 border border-slate-800 rounded-2xl p-5`}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ClipboardList className="text-cyan-300" size={20} />
                  All Cases
                </h2>

                {cases.length === 0 ? (
                  <p className="text-sm text-slate-400">No cases found.</p>
                ) : (
                  <div className="space-y-4">
                    {cases.map((item) => (
                      <CaseRow
                        key={item._id}
                        item={item}
                        officers={officers}
                        isAdmin={isAdmin}
                        specCounts={specCounts}
                        onSelect={() => setSelectedCase(item)}
                        onStatus={(status) => updateCase(item._id, { status })}
                        onClassify={(isCrime) =>
                          updateCase(item._id, { isCrime })
                        }
                        onAssign={(assignedOfficer) =>
                          updateCase(item._id, { assignedOfficer })
                        }
                        onCategory={(category) =>
                          updateCase(item._id, { category })
                        }
                        onDelete={() => deleteCase(item._id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {selectedCase && (
            <CaseDetails
              item={selectedCase}
              officers={officers}
              isAdmin={isAdmin}
              specCounts={specCounts}
              onClose={() => setSelectedCase(null)}
              onStatus={(status) => updateCase(selectedCase._id, { status })}
              onAssign={(assignedOfficer) =>
                updateCase(selectedCase._id, { assignedOfficer })
              }
              onCategory={(category) =>
                updateCase(selectedCase._id, { category })
              }
              onClassify={(isCrime) =>
                updateCase(selectedCase._id, { isCrime })
              }
            />
          )}
        </div>
    </div>
  );
}

function Metric({ title, value, icon: Icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <h2 className="text-3xl font-bold mt-2">{value}</h2>
        </div>
        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function CaseRow({
  item,
  officers,
  isAdmin,
  specCounts,
  onSelect,
  onStatus,
  onClassify,
  onAssign,
  onCategory,
  onDelete,
}) {
  const history = item.history || {};
  const category = getCaseCategory(item);
  const categoryLabel = getSpecLabel(category)?.label || "General";
  const sortedOfficers = getSortedOfficers(officers, category);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full border text-xs font-bold ${
                statusStyles[item.status]
              }`}
            >
              {formatStatus(item.status)}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(history.createdAt)}
            </span>
          </div>

          <h3 className="font-bold mt-3">
            {(history.sourceType || history.type || "record").toUpperCase()} Investigation Case
          </h3>

          <p className="text-sm text-slate-400 mt-2 line-clamp-2">
            {history.content}
          </p>

          <div className="text-xs text-slate-500 mt-2">
            Officer: {item.assignedOfficer?.name || "Not assigned"}
            {item.assignedOfficer?.specializations?.length > 0 && (
              <span className="ml-1 text-cyan-400">
                ({item.assignedOfficer.specializations.map((s) => getSpecLabel(s)?.label || s).join(', ')})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Category: <span className="text-amber-300 font-semibold">{categoryLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {isAdmin && (
          <div className="flex flex-col gap-1">
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value)}
              className="bg-slate-900 border border-amber-500/30 text-amber-200 rounded-lg px-3 py-2 text-xs"
            >
              {SPECIALIZATION_OPTIONS.map((spec) => {
                const count = specCounts[spec.value] || 0;
                return (
                  <option key={spec.value} value={spec.value}>
                    {spec.label} ({count})
                  </option>
                );
              })}
            </select>
            <select
              value={item.assignedOfficer?._id || ""}
              onChange={(e) => onAssign(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs"
            >
              <option value="">Assign officer</option>
              {sortedOfficers.map((officer) => {
                const specs = officer.specializations?.length
                  ? ` — ${officer.specializations.map((s) => getSpecLabel(s)?.label || s).join(', ')}`
                  : '';
                return (
                  <option key={officer._id} value={officer._id}>
                    {officer.name}{officerMatchesCategory(officer, category) ? " (Recommended)" : ""}{specs}
                  </option>
                );
              })}
            </select>
            {item.assignedOfficer?.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.assignedOfficer.specializations.map((s) => {
                  const spec = getSpecLabel(s);
                  return spec ? (
                    <span key={s} className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                      {spec.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          )}

          <Button icon={Eye} label="View" onClick={onSelect} />
          <Button
            icon={UserCheck}
            label="Investigating"
            onClick={() => onStatus("investigating")}
          />
          <Button
            icon={CheckCircle2}
            label="Resolved"
            onClick={() => onStatus("resolved")}
          />
          <Button
            icon={ShieldAlert}
            label="Crime Case"
            onClick={() => onClassify(true)}
          />
          <Button
            icon={ShieldCheck}
            label="Not Crime"
            onClick={() => onClassify(false)}
          />
          <Button icon={Archive} label="Archive" onClick={() => onStatus("archived")} />
          {isAdmin && <Button icon={Trash2} label="Delete" danger onClick={onDelete} />}
        </div>
      </div>
    </div>
  );
}

function CaseDetails({
  item,
  officers,
  isAdmin,
  specCounts,
  onClose,
  onStatus,
  onAssign,
  onCategory,
  onClassify,
}) {
  const history = item.history || {};
  const confidence = history.confidence || 0;
  const isCrime = history.isCrime;
  const category = getCaseCategory(item);
  const categoryLabel = getSpecLabel(category)?.label || "General";
  const sortedOfficers = getSortedOfficers(officers, category);

  const decisionStatus = {
    pending: { label: "Pending Review", badge: "Pending", badgeColor: "bg-amber-500 text-slate-950" },
    investigating: { label: "Under Investigation", badge: "Active", badgeColor: "bg-cyan-500 text-slate-950" },
    crime_case: { label: "Confirmed Crime Case", badge: "Crime", badgeColor: "bg-red-500 text-white" },
    not_crime: { label: "Dismissed — Not Crime", badge: "Closed", badgeColor: "bg-slate-500 text-white" },
    resolved: { label: "Resolved", badge: "Resolved", badgeColor: "bg-emerald-500 text-slate-950" },
    archived: { label: "Archived", badge: "Archived", badgeColor: "bg-slate-600 text-white" },
  }[item.status] || { label: "Pending Review", badge: "Pending", badgeColor: "bg-amber-500 text-slate-950" };

  const caseStatusBadge = {
    pending: { label: "Pending", color: "bg-amber-500 text-slate-950" },
    investigating: { label: "Active", color: "bg-cyan-500 text-slate-950" },
    crime_case: { label: "Crime Case", color: "bg-red-500 text-white" },
    not_crime: { label: "Not Crime", color: "bg-emerald-500 text-slate-950" },
    resolved: { label: "Resolved", color: "bg-emerald-500 text-slate-950" },
    archived: { label: "Archived", color: "bg-slate-500 text-white" },
  }[item.status] || { label: "Active", color: "bg-cyan-500 text-slate-950" };

  // Derive a short case ID from mongo _id or createdAt
  const caseId = item._id
    ? `${new Date(item.createdAt).toISOString().slice(0, 10)}-${item._id.slice(-3).toUpperCase()}`
    : "N/A";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-slate-700/60 rounded-2xl shadow-2xl" style={{ backgroundColor: "var(--bg-surface)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-800">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              Investigation
            </p>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Modern Investigation Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-7">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">

            {/* Prediction */}
            <div className="border border-slate-800 rounded-xl p-5" style={{ backgroundColor: "var(--bg-card)" }}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Prediction
              </p>
              {isCrime ? (
                <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                  <AlertTriangle size={18} className="shrink-0" />
                  Criminal Intent Detected
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <ShieldCheck size={18} className="shrink-0" />
                  No Criminal Intent
                </div>
              )}
            </div>

            {/* Confidence Level */}
            <div className="border border-slate-800 rounded-xl p-5" style={{ backgroundColor: "var(--bg-card)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                  <TrendingUp size={12} />
                  Confidence Level
                </p>
                <span className="text-white font-extrabold text-lg">{confidence}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    confidence >= 75
                      ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                      : confidence >= 50
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                      : "bg-gradient-to-r from-rose-600 to-red-400"
                  }`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>

            {/* Current Decision Status */}
            <div className="border border-slate-800 rounded-xl p-5" style={{ backgroundColor: "var(--bg-card)" }}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Current Decision Status
              </p>
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-bold text-sm">
                  {decisionStatus.label}
                </span>
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-lg ${decisionStatus.badgeColor}`}>
                  {decisionStatus.badge}
                </span>
              </div>
            </div>

            {/* Case Status */}
            <div className="border border-slate-800 rounded-xl p-5" style={{ backgroundColor: "var(--bg-card)" }}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Case Status
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-slate-400" />
                  <span className="text-slate-200 text-sm font-medium">
                    {formatStatus(item.status)}
                  </span>
                </div>
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-lg ${caseStatusBadge.color}`}>
                  {caseStatusBadge.label}
                </span>
              </div>
            </div>

            {/* Assigned Officer */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Case Category
              </p>
              {isAdmin ? (
                <select
                  value={category}
                  onChange={(e) => onCategory(e.target.value)}
                  className="w-full bg-[#0d1117] border border-amber-500/30 text-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                >
                  {SPECIALIZATION_OPTIONS.map((spec) => {
                    const count = specCounts[spec.value] || 0;
                    return (
                      <option key={spec.value} value={spec.value}>
                        {spec.label} ({count})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="text-amber-200 text-sm font-semibold">
                  {categoryLabel}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Investigator matching {categoryLabel} specialization ayaa lagu talinayaa.
              </p>
            </div>

            {/* Assigned Officer */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Assigned Investigator
              </p>
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                <User size={14} className="text-slate-400" />
                {item.assignedOfficer
                  ? `Det. ${item.assignedOfficer.name}`
                  : "Not Assigned"}
              </div>
              {isAdmin && (
                <select
                  value={item.assignedOfficer?._id || ""}
                  onChange={(e) => onAssign(e.target.value)}
                  className="mt-3 w-full bg-[#0d1117] border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-cyan-500"
                >
                  <option value="">Not assigned</option>
                  {sortedOfficers.map((officer) => {
                    const specs = officer.specializations?.length
                      ? ` - ${officer.specializations.map((s) => getSpecLabel(s)?.label || s).join(", ")}`
                      : "";
                    return (
                      <option key={officer._id} value={officer._id}>
                        {officer.name}{officerMatchesCategory(officer, category) ? " (Recommended)" : ""}{specs}
                      </option>
                    );
                  })}
                </select>
              )}
              {item.assignedOfficer?.specializations?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.assignedOfficer.specializations.map((specValue) => (
                    <span
                      key={specValue}
                      className={`text-[10px] px-2 py-0.5 rounded-md border ${
                        officerMatchesCategory(item.assignedOfficer, category)
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-600 bg-slate-800 text-slate-400"
                      }`}
                    >
                      {getSpecLabel(specValue)?.label || specValue}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Case ID */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                Case ID
              </p>
              <div className="flex items-center gap-2">
                <Hash size={13} className="text-slate-500" />
                <span className="text-slate-200 font-mono font-bold text-sm">
                  {caseId}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">

            {/* Incident Narrative */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3 flex items-center gap-1.5">
                <FileText size={12} />
                Incident Narrative
              </p>
              <textarea
                readOnly
                value={history.content || "No content available."}
                className="w-full h-56 bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 text-slate-300 text-sm font-mono resize-none outline-none leading-relaxed"
              />
            </div>

            {/* Notes */}
            {item.notes && item.notes.length > 0 && (
              <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">
                  Officer Notes
                </p>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {item.notes.map((note, i) => (
                    <div key={i} className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/50">
                      <p className="text-slate-300 text-xs leading-relaxed">{note.text}</p>
                      <p className="text-slate-600 text-[10px] mt-1.5">
                        {note.officer?.name || "Officer"} · {formatDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-auto">
              <button
                onClick={() => onStatus("investigating")}
                className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-sm py-3.5 rounded-xl transition"
              >
                <UserCheck size={16} />
                Mark Investigating
              </button>
              <button
                onClick={() => onClassify(true)}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm py-3.5 rounded-xl transition"
              >
                <ShieldAlert size={16} />
                Proceed as Crime
              </button>
              <button
                onClick={() => onClassify(false)}
                className="flex items-center justify-center gap-2 bg-transparent border border-rose-500/60 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-extrabold text-sm py-3.5 rounded-xl transition"
              >
                <ShieldCheck size={16} />
                Dismiss / Not Crime
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-3">
      <div className="text-xs uppercase text-slate-500 font-bold">{label}</div>
      <div className="text-sm text-slate-200 mt-2">{value}</div>
    </div>
  );
}

function Button({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${
        danger
          ? "bg-red-500/10 text-red-300 hover:bg-red-500/20"
          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function formatDate(date) {
  if (!date) return "Not available";
  return new Date(date).toLocaleString();
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
    }[status] || status
  );
}
