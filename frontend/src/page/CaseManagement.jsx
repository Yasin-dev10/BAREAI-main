import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  X,
  Hash,
  User,
  UserPlus,
  Activity,
  TrendingUp,
  FileText,
  Save,
  UserCheck,
} from "lucide-react";
import API from "../api";
import { getStoredUser } from "../theme";
// ── Specialization config ─────────────────────────────────────────────────
const SPECIALIZATION_OPTIONS = [
  { value: 'murder',           label: 'Murder' },
  { value: 'robbery',          label: 'Robbery' },
  { value: 'terrorism',        label: 'Terrorism' },
  { value: 'sexual_assault',   label: 'Sexual Assault' },
  { value: 'financial_fraud',  label: 'Financial Fraud' },
  { value: 'drug_crimes',      label: 'Drug Crimes' },
  { value: 'cybercrime',       label: 'Cybercrime' },
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

const getMatchingOfficers = (officers, category) =>
  getSortedOfficers(officers, category).filter((officer) =>
    officerMatchesCategory(officer, category)
  );

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
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";
  const isInvestigator = user?.role === "investigator";
  const [cases, setCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [success, setSuccess] = useState("");

  const openCase = (item) => {
    setSelectedCase(item);
    if (!item?._id) return;
    navigate(`/cases?case=${item._id}`, { replace: true });
  };

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
            API.get(`/investigation/cases?status=${statusFilter}`),
            API.get("/investigation/officers"),
          ]
        : [API.get(`/investigation/cases?status=${statusFilter}`)];

      const [casesRes, officersRes] = await Promise.all(
        isAdmin ? requests : [requests[0], Promise.resolve({ data: [] })]
      );

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
      pending: cases.filter((item) => item.status === "pending").length,
      investigating: cases.filter((item) => item.status === "investigating").length,
      crimeCase: cases.filter((item) => item.status === "crime_case").length,
      notCrime: cases.filter((item) => item.status === "not_crime").length,
    }),
    [cases]
  );

  const updateCase = async (id, updates) => {
    try {
      setError("");
      setSuccess("");
      const res = await API.patch(`/investigation/cases/${id}`, updates);
      setCases((prev) => {
        const shouldKeep =
          statusFilter === "all" || res.data.case.status === statusFilter;
        const withoutOld = prev.filter((item) => item._id !== id);
        return shouldKeep ? [res.data.case, ...withoutOld] : withoutOld;
      });
      setSelectedCase((prev) => (prev?._id === id ? res.data.case : prev));

      if (updates.assignedOfficer) {
        setSuccess(
          "Officer assigned. A notification was sent to the investigator workspace."
        );
      }

      return true;
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to update case"
      );
      return false;
    }
  };

  const classifyCase = async (id, isCrime) => {
    const label = isCrime ? "Crime Case" : "Not Crime";
    if (!window.confirm(`Resolve this case as ${label}?`)) return;
    await updateCase(id, { isCrime });
  };

  const closeCaseDetails = () => {
    setSelectedCase(null);
    const params = new URLSearchParams(location.search);
    if (!params.has("case")) return;

    params.delete("case");
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true }
    );
  };

  const deleteCase = async (id) => {
    if (!window.confirm("Delete this case permanently?")) return;

    try {
      setError("");
      await API.delete(`/investigation/cases/${id}`);
      setCases((prev) => prev.filter((item) => item._id !== id));
      if (selectedCase?._id === id) closeCaseDetails();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete case");
    }
  };

  return (
    <div className="min-h-screen w-full p-8 transition-colors duration-300" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              {/* <p className="text-sm text-cyan-400 font-semibold">
                {isAdmin ? "BAREAI Admin Desk" : "BAREAI Investigator Desk"}
              </p> */}
              <h1 className="text-3xl font-bold mt-1">Case Management</h1>
              {/* <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Workflow step 3: assign investigators
                {isInvestigator
                  ? ", review evidence, then continue notes in Investigator."
                  : ". Assignment creates a notification for the officer."}
              </p> */}
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
              {success && <p className="text-sm text-emerald-400 mt-2">{success}</p>}
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
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Metric title="Pending" value={totals.pending} icon={ClipboardList} />
            <Metric title="Investigating" value={totals.investigating} icon={Eye} />
            <Metric title="Crime Cases" value={totals.crimeCase} icon={ShieldAlert} />
            <Metric title="Not Crime" value={totals.notCrime} icon={ShieldCheck} />
          </div>

          {loading ? (
            <p className="text-slate-400">Loading case management...</p>
          ) : (
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ClipboardList className="text-cyan-300" size={20} />
                  All Cases
                </h2>

                {cases.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No cases found. Send a record from History first.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cases.map((item) => (
                      <CaseRow
                        key={item._id}
                        item={item}
                        isAdmin={isAdmin}
                        onView={() => openCase(item)}
                        onAssign={() => openCase(item)}
                        onDelete={() => deleteCase(item._id)}
                        onClassify={(isCrime) => classifyCase(item._id, isCrime)}
                      />
                    ))}
                  </div>
                )}
              </section>
          )}

          {selectedCase && (
            <CaseDetails
              item={selectedCase}
              officers={officers}
              isAdmin={isAdmin}
              isInvestigator={isInvestigator}
              specCounts={specCounts}
              onClose={closeCaseDetails}
              onOpenInvestigator={() =>
                navigate(`/investigator?case=${selectedCase._id}`)
              }
              onSaveAssignment={async (updates) => {
                const saved = await updateCase(selectedCase._id, updates);
                if (saved) closeCaseDetails();
              }}
              onClassify={(isCrime) => classifyCase(selectedCase._id, isCrime)}
              onStatus={(status) => updateCase(selectedCase._id, { status })}
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

function CategoryAssignmentPanel({
  officers,
  category,
  savedCategory,
  selectedOfficerId,
  savedOfficerId,
  specCounts,
  onCategoryChange,
  onSelectOfficer,
  onSave,
  compact = false,
}) {
  const categoryLabel = getSpecLabel(category)?.label || "General";
  const matchingOfficers = getMatchingOfficers(officers, category);
  const savedOfficer = officers.find((o) => o._id === savedOfficerId);
  const hasChanges =
    category !== savedCategory ||
    (selectedOfficerId || "") !== (savedOfficerId || "");
  const canSave = hasChanges && selectedOfficerId;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={`w-full bg-[#0d1117] border border-amber-500/30 text-amber-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 ${
          compact ? "text-xs py-2 rounded-lg" : ""
        }`}
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

      <p className={`text-slate-500 ${compact ? "text-[10px]" : "text-[11px]"}`}>
        Investigator matching the {categoryLabel} specialization is recommended.
      </p>

      {savedOfficer && (
        <div className={`flex items-center gap-2 text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>
          <User size={compact ? 11 : 13} />
          <span>
            Currently: <span className="text-slate-200 font-semibold">Det. {savedOfficer.name}</span>
          </span>
        </div>
      )}

      {matchingOfficers.length === 0 ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          No investigators found for {categoryLabel}.
        </div>
      ) : (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              Matching investigators
            </p>
            <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
              {matchingOfficers.length}
            </span>
          </div>

          <div className={compact ? "space-y-1.5" : "grid gap-2 sm:grid-cols-2"}>
            {matchingOfficers.map((officer) => {
              const isSelected = selectedOfficerId === officer._id;
              const isSaved = savedOfficerId === officer._id;
              const specs = officer.specializations || [];

              return (
                <button
                  key={officer._id}
                  type="button"
                  onClick={() => onSelectOfficer(officer._id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/15 text-cyan-100"
                      : "border-slate-700/70 bg-slate-950/70 text-slate-200 hover:border-cyan-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold">
                      {officer.name || "Unnamed investigator"}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 rounded-md bg-cyan-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                        {isSaved ? "Saved" : "Selected"}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    {officer.badgeNumber || officer.email || officer.station || "Investigator"}
                  </p>

                  {specs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {specs.map((specValue) => (
                        <span
                          key={specValue}
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                            specValue === category || specValue === "general"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 bg-slate-900 text-slate-500"
                          }`}
                        >
                          {getSpecLabel(specValue)?.label || specValue}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-extrabold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 ${
          compact ? "py-2 text-xs" : "py-2.5 text-sm"
        }`}
      >
        <Save size={compact ? 14 : 16} />
        Save
      </button>
    </div>
  );
}

function CaseRow({ item, isAdmin, onView, onAssign, onDelete, onClassify }) {
  const history = item.history || {};
  const categoryLabel = getSpecLabel(getCaseCategory(item))?.label || "General";
  const canClassify =
    !isAdmin &&
    item.status !== "crime_case" &&
    item.status !== "not_crime" &&
    item.status !== "archived";

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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
                ({item.assignedOfficer.specializations.map((s) => getSpecLabel(s)?.label || s).join(", ")})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Category: <span className="text-amber-300 font-semibold">{categoryLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={onAssign}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold hover:bg-cyan-500/20 transition"
            >
              <UserPlus size={12} />
              Assign
            </button>
          )}
          {canClassify && (
            <>
              <Button
                icon={ShieldAlert}
                label="Resolve as Crime"
                onClick={() => onClassify(true)}
                danger
              />
              <Button
                icon={ShieldCheck}
                label="Resolve as Not Crime"
                onClick={() => onClassify(false)}
                safe
              />
            </>
          )}
          <Button icon={Eye} label="View" onClick={onView} />
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
  isInvestigator,
  specCounts,
  onClose,
  onOpenInvestigator,
  onSaveAssignment,
  onClassify,
  onStatus,
}) {
  const history = item.history || {};
  const confidence = history.confidence || 0;
  const isCrime = history.isCrime;
  const savedCategory = getCaseCategory(item);
  const categoryLabel = getSpecLabel(savedCategory)?.label || "General";
  const savedOfficerId = item.assignedOfficer?._id || "";
  const [pendingCategory, setPendingCategory] = useState(savedCategory);
  const [pendingOfficerId, setPendingOfficerId] = useState(savedOfficerId);

  useEffect(() => {
    setPendingCategory(getCaseCategory(item));
    setPendingOfficerId(item.assignedOfficer?._id || "");
  }, [item._id, item.category, item.assignedOfficer?._id]);

  const handleCategoryChange = (newCategory) => {
    setPendingCategory(newCategory);
    const currentOfficer = officers.find((o) => o._id === pendingOfficerId);
    if (currentOfficer && !officerMatchesCategory(currentOfficer, newCategory)) {
      setPendingOfficerId("");
    }
  };

  const handleSave = async () => {
    const updates = {};
    if (pendingCategory !== savedCategory) updates.category = pendingCategory;
    if (pendingOfficerId && pendingOfficerId !== savedOfficerId) {
      updates.assignedOfficer = pendingOfficerId;
    }
    if (Object.keys(updates).length > 0) {
      await onSaveAssignment(updates);
    }
  };

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
                      ? "progress-bar progress-bar--high"
                      : confidence >= 50
                      ? "progress-bar progress-bar--mid"
                      : "progress-bar progress-bar--low"
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

            {/* Category & Investigator Assignment */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                Case Category & Assignment
              </p>
              {isAdmin ? (
                <CategoryAssignmentPanel
                  officers={officers}
                  category={pendingCategory}
                  savedCategory={savedCategory}
                  selectedOfficerId={pendingOfficerId}
                  savedOfficerId={savedOfficerId}
                  specCounts={specCounts}
                  onCategoryChange={handleCategoryChange}
                  onSelectOfficer={setPendingOfficerId}
                  onSave={handleSave}
                />
              ) : (
                <>
                  <div className="text-amber-200 text-sm font-semibold">
                    {categoryLabel}
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm mt-3">
                    <User size={14} className="text-slate-400" />
                    {item.assignedOfficer
                      ? `Det. ${item.assignedOfficer.name}`
                      : "Not Assigned"}
                  </div>
                </>
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

            {/* Investigator verdict */}
            {!isAdmin && (
              <div className="border border-slate-800 rounded-xl p-5" style={{ backgroundColor: "var(--bg-card)" }}>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                  Investigation Verdict
                </p>

                {item.status === "crime_case" || item.status === "not_crime" ? (
                  <div className="flex items-center gap-2">
                    {item.status === "crime_case" ? (
                      <>
                        <ShieldAlert size={18} className="text-red-400 shrink-0" />
                        <span className="text-red-300 font-bold text-sm">
                          Crime — Confirmed
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-300 font-bold text-sm">
                          Not Crime
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-400 mb-3">
                      Resolve this case as Crime or Not Crime.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "pending" && (
                        <Button
                          icon={Activity}
                          label="Start Investigating"
                          onClick={() => onStatus("investigating")}
                        />
                      )}
                      <Button
                        icon={ShieldAlert}
                        label="Resolve as Crime"
                        onClick={() => onClassify(true)}
                        danger
                      />
                      <Button
                        icon={ShieldCheck}
                        label="Resolve as Not Crime"
                        onClick={() => onClassify(false)}
                        safe
                      />
                    </div>
                  </>
                )}

                {isInvestigator && (
                  <button
                    type="button"
                    onClick={onOpenInvestigator}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-cyan-400"
                  >
                    <UserCheck size={16} />
                    Continue in Investigator (notes)
                  </button>
                )}
              </div>
            )}
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

          </div>
        </div>
      </div>
    </div>
  );
}

function Button({ icon: Icon, label, onClick, danger = false, safe = false }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${
        danger
          ? "bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/30"
          : safe
          ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
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
