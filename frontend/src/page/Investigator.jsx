import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  MessageSquarePlus,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import API from "../api";

const statusStyles = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  investigating: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  crime_case: "bg-red-500/10 text-red-300 border-red-500/30",
  not_crime: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  archived: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

export default function Investigator() {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCases = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/investigation/cases?status=${statusFilter}`);
      setCases(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load assigned cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter]);

  const totals = useMemo(
    () => ({
      assigned: cases.length,
      investigating: cases.filter((item) => item.status === "investigating").length,
      crimeCase: cases.filter((item) => item.status === "crime_case").length,
      notCrime: cases.filter((item) => item.status === "not_crime").length,
    }),
    [cases]
  );

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

  const addNote = async (e) => {
    e.preventDefault();

    if (!selectedCase || !noteText.trim()) return;

    try {
      const res = await API.post(`/investigation/cases/${selectedCase._id}/notes`, {
        text: noteText,
      });

      setNoteText("");
      setCases((prev) =>
        prev.map((item) => (item._id === selectedCase._id ? res.data.case : item))
      );
      setSelectedCase(res.data.case);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add note");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm text-cyan-400 font-semibold">
                BAREAI Investigator Desk
              </p>
              <h1 className="text-3xl font-bold mt-1">Assigned Investigation Cases</h1>
              <p className="text-sm text-slate-400 mt-2">
                Here the officer sees the cases assigned to him, the evidence, the notes, and the status updates.
              </p>
              {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm"
            >
              <option value="all">All assigned</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="crime_case">Crime Case</option>
              <option value="not_crime">Not Crime</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Metric title="Assigned Cases" value={totals.assigned} icon={ClipboardList} />
            <Metric title="Investigating" value={totals.investigating} icon={Eye} />
            <Metric title="Crime Cases" value={totals.crimeCase} icon={ShieldAlert} />
            <Metric title="Not Crime" value={totals.notCrime} icon={ShieldCheck} />
          </div>

          {loading ? (
            <p className="text-slate-400">Loading assigned cases...</p>
          ) : cases.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
              <ClipboardList className="mx-auto text-slate-500 mb-3" size={42} />
              <h2 className="text-xl font-bold">No assigned cases</h2>
              <p className="text-slate-400 mt-2">
                Weli case laguu assign-gareeyay ma jiro.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-bold mb-4">My Cases</h2>

              <div className="space-y-4">
                {cases.map((item) => (
                  <CaseRow
                    key={item._id}
                    item={item}
                    onSelect={() => setSelectedCase(item)}
                    onStatus={(status) => updateCase(item._id, { status })}
                    onClassify={(isCrime) =>
                      updateCase(item._id, { isCrime })
                    }
                  />
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
              onClose={() => setSelectedCase(null)}
              onStatus={(status) => updateCase(selectedCase._id, { status })}
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

function CaseRow({ item, onSelect, onStatus, onClassify }) {
  const history = item.history || {};

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
            Assigned officer: {item.assignedOfficer?.name || "You"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button icon={Eye} label="View Evidence" onClick={onSelect} />
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
        </div>
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-cyan-400 font-semibold">Evidence Details</p>
            <h2 className="text-2xl font-bold mt-1">Investigation Evidence</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            Close
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
        </div>

        {sourceLink && (
          <a
            href={sourceLink}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 text-cyan-300 hover:text-cyan-200 break-all"
          >
            Open source link
          </a>
        )}

        <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
            Crime Content
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-7">
            {history.content}
          </p>
        </div>

        {history.extractedText && (
          <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
              Extracted Text
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {history.extractedText}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            icon={UserCheck}
            label="Mark Investigating"
            onClick={() => onStatus("investigating")}
          />
          <Button
            icon={CheckCircle2}
            label="Mark Resolved"
            onClick={() => onStatus("resolved")}
          />
          <Button
            icon={ShieldAlert}
            label="Continue as Crime Case"
            onClick={() => onClassify(true)}
          />
          <Button
            icon={ShieldCheck}
            label="Resolve as Not Crime"
            onClick={() => onClassify(false)}
          />
          <Button icon={Archive} label="Archive" onClick={() => onStatus("archived")} />
        </div>

        <div className="mt-6">
          <h3 className="font-bold flex items-center gap-2">
            <FileText size={18} />
            Investigator Notes
          </h3>

          <div className="space-y-3 mt-4">
            {item.notes?.length ? (
              item.notes.map((note) => (
                <div
                  key={note._id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                >
                  <p className="text-sm text-slate-300">{note.text}</p>
                  <p className="text-xs text-slate-500 mt-2">
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
              placeholder="Ku dar qoraalka investigator-ka..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <button className="mt-3 inline-flex items-center gap-2 bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm">
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
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </div>
      <div className="text-sm text-slate-200 mt-2">{value || "Not available"}</div>
    </div>
  );
}

function Button({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
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
