import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  ClipboardList,
  Eye,
  FileText,
  MessageSquarePlus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import API from "../api";
import { getStoredUser } from "../theme";
const statusStyles = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  investigating: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  crime_case: "bg-red-500/10 text-red-300 border-red-500/30",
  not_crime: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  archived: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

const ACTIVE_STATUSES = new Set(["pending", "investigating"]);

export default function Investigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const isAdmin = user?.role === "admin";

  const [allCases, setAllCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const scopedCases = useMemo(() => {
    if (!isAdmin) return allCases;
    // Admin desk should only show cases that are actually assigned to an officer.
    return allCases.filter((item) => item.assignedOfficer);
  }, [allCases, isAdmin]);

  const visibleCases = useMemo(() => {
    if (statusFilter === "all") return scopedCases;
    if (statusFilter === "active") {
      return scopedCases.filter((item) => ACTIVE_STATUSES.has(item.status));
    }
    return scopedCases.filter((item) => item.status === statusFilter);
  }, [scopedCases, statusFilter]);

  const totals = useMemo(
    () => ({
      active: scopedCases.filter((item) => ACTIVE_STATUSES.has(item.status)).length,
      investigating: scopedCases.filter((item) => item.status === "investigating").length,
      crimeCase: scopedCases.filter((item) => item.status === "crime_case").length,
      notCrime: scopedCases.filter((item) => item.status === "not_crime").length,
    }),
    [scopedCases]
  );

  const openCase = (item) => {
    setSelectedCase(item);
    setNoteText("");
    if (!item?._id) return;
    navigate(`/investigator?case=${item._id}`, { replace: true });
  };

  const closeCase = () => {
    setSelectedCase(null);
    setNoteText("");
    const params = new URLSearchParams(location.search);
    if (!params.has("case")) return;
    params.delete("case");
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true }
    );
  };

  const loadCases = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/investigation/cases?status=all");
      setAllCases(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assigned cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    const caseId = new URLSearchParams(location.search).get("case");
    if (!caseId) return;

    const match = scopedCases.find((item) => item._id === caseId);
    if (match) {
      setSelectedCase(match);
      return;
    }

    // Deep-link may point to a closed case while Active filter is on — still open it.
    const fromAll = allCases.find((item) => item._id === caseId);
    if (fromAll) setSelectedCase(fromAll);
  }, [location.search, scopedCases, allCases]);

  const updateCase = async (id, updates) => {
    try {
      setError("");
      setSuccess("");
      const res = await API.patch(`/investigation/cases/${id}`, updates);
      const updated = res.data.case;
      setAllCases((prev) => {
        const withoutOld = prev.filter((item) => item._id !== id);
        return [updated, ...withoutOld];
      });
      setSelectedCase(updated);
      setSuccess("Case updated. History status stays in sync.");
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

  const confirmStatus = async (id, status) => {
    if (status === "resolved") {
      const item = allCases.find((c) => c._id === id) || selectedCase;
      const isCrime = item?.history?.isCrime === true;
      const label = isCrime ? "Crime Case" : "Not Crime";
      if (
        !window.confirm(
          `Resolve this case as ${label}? (based on the current crime / not-crime decision)`
        )
      ) {
        return;
      }
      await updateCase(id, { isCrime });
      return;
    }

    const labels = {
      investigating: "Investigating",
      archived: "Archived",
    };
    if (!window.confirm(`Set case status to ${labels[status] || status}?`)) return;
    await updateCase(id, { status });
  };

  const confirmClassify = async (id, isCrime) => {
    const label = isCrime ? "Crime Case" : "Not Crime";
    if (!window.confirm(`Resolve this case as ${label}?`)) return;
    await updateCase(id, { isCrime });
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!selectedCase || !noteText.trim()) return;

    try {
      setError("");
      setSuccess("");
      const res = await API.post(`/investigation/cases/${selectedCase._id}/notes`, {
        text: noteText,
      });
      setNoteText("");
      setAllCases((prev) =>
        prev.map((item) => (item._id === selectedCase._id ? res.data.case : item))
      );
      setSelectedCase(res.data.case);
      setSuccess("Note saved on this case.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add note");
    }
  };

  return (
    <div
      className="min-h-screen w-full p-8 transition-colors duration-300"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            {/* <p className="text-sm text-cyan-400 font-semibold">BAREAI Investigator Desk</p> */}
            <h1 className="text-3xl font-bold mt-1">Assigned Investigation Cases</h1>
            {/* <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {isAdmin
                ? "Only cases assigned to an officer appear here. Assign from Case Management first."
                : "Your assigned queue only. Open a case to update status and add notes — History stays synced."}
            </p> */}
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            {success && <p className="text-sm text-emerald-400 mt-2">{success}</p>}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm"
          >
            <option value="active">Active queue</option>
            <option value="all">All assigned</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="crime_case">Crime Case</option>
            <option value="not_crime">Not Crime</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Metric title="Active Queue" value={totals.active} icon={ClipboardList} />
          <Metric title="Investigating" value={totals.investigating} icon={Eye} />
          <Metric title="Crime Cases" value={totals.crimeCase} icon={ShieldAlert} />
          <Metric title="Not Crime" value={totals.notCrime} icon={ShieldCheck} />
        </div>

        {loading ? (
          <p className="text-slate-400">Loading assigned cases...</p>
        ) : visibleCases.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <ClipboardList className="mx-auto text-slate-500 mb-3" size={42} />
            <h2 className="text-xl font-bold">
              {statusFilter === "active" ? "No active cases" : "No cases in this filter"}
            </h2>
            <p className="text-slate-400 mt-2 max-w-md mx-auto">
              {isAdmin
                ? "Assign an officer in Case Management, then the case appears here and in Notifications."
                : "When admin assigns you a case, open it from Notifications, then work notes here."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
              >
                Open Notifications
              </button>
              <button
                type="button"
                onClick={() => navigate("/cases")}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700"
              >
                Case Management
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">
                {statusFilter === "active" ? "Active Cases" : "My Cases"}
              </h2>
              <p className="text-xs text-slate-500">
                Showing {visibleCases.length} of {scopedCases.length} assigned
              </p>
            </div>

            <div className="space-y-4">
              {visibleCases.map((item) => (
                <CaseRow key={item._id} item={item} onSelect={() => openCase(item)} />
              ))}
            </div>
          </div>
        )}

        {selectedCase && (
          <CaseDetails
            item={selectedCase}
            noteText={noteText}
            setNoteText={setNoteText}
            onAddNote={addNote}
            onClose={closeCase}
            onStatus={(status) => confirmStatus(selectedCase._id, status)}
            onClassify={(isCrime) => confirmClassify(selectedCase._id, isCrime)}
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

function CaseRow({ item, onSelect }) {
  const history = item.history || {};

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
              {formatDate(history.createdAt || item.createdAt)}
            </span>
          </div>

          <h3 className="font-bold mt-3">
            {(history.sourceType || history.type || "record").toUpperCase()} Investigation Case
          </h3>

          <p className="text-sm text-slate-400 mt-2 line-clamp-2">{history.content}</p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>Officer: {item.assignedOfficer?.name || "You"}</span>
            <span>Notes: {item.notes?.length || 0}</span>
            <span>Category: {formatCategory(item.category)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSelect}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400"
        >
          <Eye size={16} />
          Open case
        </button>
      </div>
    </div>
  );
}

function CaseDetails({
  item,
  noteText,
  setNoteText,
  onAddNote,
  onClose,
  onStatus,
  onClassify,
}) {
  const history = item.history || {};
  const sourceLink = history.url || (history.type === "url" ? history.content : "");
  const isClosed =
    item.status === "crime_case" ||
    item.status === "not_crime" ||
    item.status === "archived";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-cyan-400 font-semibold">Evidence & Notes</p>
            <h2 className="text-2xl font-bold mt-1">Investigation Workspace</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Info label="Status" value={formatStatus(item.status)} />
          <Info label="Source" value={history.sourceType || history.type || "Unknown"} />
          <Info label="Prediction" value={history.prediction || "Unknown"} />
          <Info label="Current Decision" value={history.isCrime ? "Crime" : "Not Crime"} />
          <Info label="Confidence" value={`${history.confidence || 0}%`} />
          <Info label="Matched Keyword" value={history.matchedKeyword || "Not provided"} />
          <Info label="Officer Assigned" value={item.assignedOfficer?.name || "You"} />
          <Info label="Category" value={formatCategory(item.category)} />
        </div>

        {sourceLink && (
          <a
            href={sourceLink}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 break-all text-cyan-300 hover:text-cyan-200"
          >
            Open source link
          </a>
        )}

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Case Content
          </div>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {history.content}
          </p>
        </div>

        {history.extractedText && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Extracted Text
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-300">
              {history.extractedText}
            </p>
          </div>
        )}

        {!isClosed && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              icon={UserCheck}
              label="Mark Investigating"
              onClick={() => onStatus("investigating")}
            />
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
            <Button icon={Archive} label="Archive" onClick={() => onStatus("archived")} />
          </div>
        )}

        <div className="mt-6">
          <h3 className="flex items-center gap-2 font-bold">
            <FileText size={18} />
            Investigator Notes
          </h3>

          <div className="mt-4 space-y-3">
            {item.notes?.length ? (
              item.notes.map((note) => (
                <div
                  key={note._id || `${note.createdAt}-${note.text}`}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <p className="text-sm text-slate-300">{note.text}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {note.officer?.name || "Officer"} · {formatDate(note.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No notes added yet.</p>
            )}
          </div>

          <form onSubmit={onAddNote} className="mt-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows="3"
              placeholder="Add investigator notes..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <MessageSquarePlus size={16} />
              Add Note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-200">{value || "Not available"}</div>
    </div>
  );
}

function Button({ icon: Icon, label, onClick, danger, safe }) {
  const tone = danger
    ? "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20"
    : safe
    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
    : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${tone}`}
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
    }[category] ||
    category ||
    "General"
  );
}
