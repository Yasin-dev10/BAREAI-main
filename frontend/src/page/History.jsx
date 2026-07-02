import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Trash2,
  Download,
  Search,
  Calendar,
  ShieldCheck,
  Percent,
  FileText,
  Globe,
  Layers,
  Link as LinkIcon,
  UserSearch,
  Filter,
  Send,
} from "lucide-react";
import API from "../api";

export default function History() {
  const [activeSection, setActiveSection] = useState("ANALYSIS");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [crime, setCrime] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await API.get("/history");
      setData(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const isBlacklistRecord = (item) => {
    return (
      item.historyType === "FACEBOOK" ||
      item.sourceType === "facebook" ||
      item.type === "facebook" ||
      item.type === "blacklist" ||
      (item.blacklistMatches && item.blacklistMatches.length > 0)
    );
  };

  const analysisData = useMemo(
    () => data.filter((item) => !isBlacklistRecord(item)),
    [data]
  );

  const blacklistData = useMemo(
    () => data.filter((item) => isBlacklistRecord(item)),
    [data]
  );

  const activeData = activeSection === "ANALYSIS" ? analysisData : blacklistData;

  const filtered = useMemo(() => {
    const s = search.toLowerCase();

    return activeData.filter((item) => {
      const blacklistValues = (item.blacklistMatches || [])
        .map((b) => b.value || b.name || "")
        .join(" ")
        .toLowerCase();

      const contentMatch =
        item.content?.toLowerCase().includes(s) ||
        item.type?.toLowerCase().includes(s) ||
        item.prediction?.toLowerCase().includes(s) ||
        item.matchedKeyword?.toLowerCase().includes(s) ||
        blacklistValues.includes(s);

      const crimeMatch =
        crime === "ALL" ? true : crime === "CRIME" ? item.isCrime : !item.isCrime;

      const priorityMatch =
        activeSection === "ANALYSIS"
          ? true
          : priority === "ALL"
          ? true
          : item.priority === priority;

      return contentMatch && crimeMatch && priorityMatch;
    });
  }, [activeData, search, crime, priority, activeSection]);

  const deleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await API.delete(`/history/${id}`);
      setData((prev) => prev.filter((i) => i._id !== id));
    } catch (error) {
      console.error("Error deleting record:", error);
    }
  };

  const sendToInvestigation = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to send this record to Investigation & Case Management?"
      )
    ) {
      return;
    }

    try {
      await API.post("/investigation/cases", { historyId: id });
      setData((prev) =>
        prev.map((item) =>
          item._id === id
            ? { ...item, investigationStatus: "sent_to_investigation" }
            : item
        )
      );
    } catch (error) {
      console.error("Error sending to investigation:", error);
      alert(
        error.response?.data?.message ||
          "Failed to send to investigation. Please try again."
      );
    }
  };

  const downloadCSV = () => {
    const rows = [
      ["Section", "Type", "Name", "Crime", "Priority", "Confidence", "Content", "Date"],
      ...filtered.map((i) => [
        activeSection,
        i.type || "N/A",
        getBlacklistName(i),
        i.isCrime ? "CRIME" : "SAFE",
        i.priority || "N/A",
        i.confidence || 0,
        i.content || "",
        i.createdAt ? new Date(i.createdAt).toLocaleString() : "N/A",
      ]),
    ];

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download =
      activeSection === "ANALYSIS"
        ? "analysis_history_report.csv"
        : "blacklist_history_report.csv";
    a.click();
  };

  const stats = {
    total: filtered.length,
    crime: filtered.filter((i) => i.isCrime).length,
    safe: filtered.filter((i) => !i.isCrime).length,
    high: filtered.filter((i) => i.priority === "high").length,
  };

  return (
    <div className="bg-[#0b0f19] min-h-full text-slate-100 font-sans overflow-x-hidden p-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              History Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Analysis records and blacklist records are stored in two separate sections.
            </p>
          </div>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            <Download size={16} /> Download Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setActiveSection("ANALYSIS")}
            className={`p-5 rounded-2xl border text-left transition ${
              activeSection === "ANALYSIS"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h2 className="font-extrabold">Analysis History</h2>
                <p className="text-sm opacity-80">Text, URL, File, and Batch analysis</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveSection("BLACKLIST")}
            className={`p-5 rounded-2xl border text-left transition ${
              activeSection === "BLACKLIST"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <UserSearch size={24} />
              <div>
                <h2 className="font-extrabold">Blacklist History</h2>
                <p className="text-sm opacity-80">People/pages registered in the blacklist</p>
              </div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <StatCard title="Total Records" value={stats.total} />
          <StatCard title="Crime" value={stats.crime} danger />
          <StatCard title="Not Crime" value={stats.safe} safe />
          <StatCard
            title={activeSection === "BLACKLIST" ? "High Priority" : "Input Records"}
            value={activeSection === "BLACKLIST" ? stats.high : stats.total}
            warning
          />
        </div>

        <div className="flex flex-col gap-4 mb-8 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
          <div className="flex items-center bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 focus-within:border-cyan-500/50">
            <Search className="text-slate-500 mr-3" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeSection === "ANALYSIS"
                  ? "Search text, URL, file, batch content..."
                  : "Search blacklist person/page name, keyword, or content..."
              }
              className="bg-transparent outline-none text-white w-full text-sm placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <FilterGroup
              label="Status"
              value={crime}
              setValue={setCrime}
              items={["ALL", "CRIME", "SAFE"]}
            />

            {activeSection === "BLACKLIST" && (
              <FilterGroup
                label="Priority"
                value={priority}
                setValue={setPriority}
                items={["ALL", "low", "medium", "high"]}
              />
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <p className="text-slate-400">Loading secure records...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
            <ShieldCheck className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-400 font-medium">No results found</p>
          </div>
        )}

        <div className="space-y-4">
          {!loading &&
            filtered.map((item) => (
              <HistoryCard
                key={item._id}
                item={item}
                section={activeSection}
                deleteRecord={deleteRecord}
                sendToInvestigation={sendToInvestigation}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ item, section, deleteRecord, sendToInvestigation }) {
  const isCrime = item.isCrime;

  return (
    <div className="group bg-gradient-to-b from-[#111827] to-[#0f172a] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 flex justify-between items-start gap-4 transition">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isCrime ? (
            <AlertTriangle className="text-rose-400" size={18} />
          ) : (
            <ShieldCheck className="text-emerald-400" size={18} />
          )}

          <span className="text-slate-200 font-bold text-sm truncate max-w-md">
            {section === "BLACKLIST" ? getBlacklistName(item) : getAnalysisTitle(item)}
          </span>

          <StatusBadge isCrime={isCrime} />

          {section === "BLACKLIST" && item.priority && (
            <PriorityBadge priority={item.priority} />
          )}

          <InvestigationStatusBadge status={item.investigationStatus} />

          <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
            <Percent size={10} className="text-slate-500" />
            <span className="text-[11px] font-bold text-slate-400">
              {item.confidence || 0}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-3">
          {getTypeIcon(item.type)}
          <span>
            {section === "BLACKLIST"
              ? getBlacklistSource(item)
              : item.type?.toUpperCase()}
          </span>
        </div>

        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 mb-3">
          <p className="text-slate-300 text-sm font-mono break-all line-clamp-3 leading-relaxed">
            {item.content || "No content available"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-500 text-xs">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(item.createdAt)}
          </span>
          <span>Keyword: {item.matchedKeyword || "Not provided"}</span>
        </div>
      </div>

      <button
        onClick={() => deleteRecord(item._id)}
        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function FilterGroup({ label, value, setValue, items }) {
  return (
    <div className="flex items-center gap-2 bg-slate-950/50 p-1 rounded-xl border border-slate-800/80">
      <span className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider flex items-center gap-1">
        <Filter size={12} />
        {label}:
      </span>

      {items.map((item) => (
        <button
          key={item}
          onClick={() => setValue(item)}
          className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase transition ${
            value === item
              ? "bg-cyan-500 text-slate-950"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function StatCard({ title, value, danger, safe, warning }) {
  const color = danger
    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : safe
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : warning
    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
    : "border-slate-800 bg-slate-900/60 text-slate-100";

  return (
    <div className={`rounded-2xl p-5 border ${color}`}>
      <p className="text-sm opacity-80">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function StatusBadge({ isCrime }) {
  return (
    <span
      className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md border ${
        isCrime
          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      }`}
    >
      {isCrime ? "CRIME" : "SAFE"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const style =
    priority === "high"
      ? "bg-red-500/20 text-red-400"
      : priority === "medium"
      ? "bg-amber-500/20 text-amber-400"
      : "bg-blue-500/20 text-blue-400";

  return (
    <span className={`text-[10px] uppercase px-2 py-0.5 font-bold rounded-md ${style}`}>
      {priority}
    </span>
  );
}

function InvestigationStatusBadge({ status }) {
  if (!status || status === "none") return null;

  const styles = {
    sent_to_investigation:
      "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    under_review:
      "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    resolved:
      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    closed:
      "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  };

  const labels = {
    sent_to_investigation: "Sent to Investigation",
    under_review: "Under Review",
    resolved: "Resolved",
    closed: "Closed",
  };

  const style = styles[status] || "bg-slate-500/20 text-slate-400 border border-slate-500/30";
  const label = labels[status] || status;

  return (
    <span className={`text-[10px] uppercase px-2 py-0.5 font-bold rounded-md ${style}`}>
      {label}
    </span>
  );
}

function getBlacklistName(item) {
  return (
    (item.blacklistMatches || [])
      .map((b) => b.value || b.name)
      .join(", ") || "No blacklist match"
  );
}

function getBlacklistSource(item) {
  return (
    (item.blacklistMatches || [])
      .map((b) => b.type || "blacklist")
      .join(", ") || "Blacklist record"
  );
}

function getAnalysisTitle(item) {
  const type = item.type?.toUpperCase() || "TEXT";
  return `${type} Analysis`;
}

function getTypeIcon(type) {
  if (type === "url") return <LinkIcon size={14} />;
  if (type === "file") return <FileText size={14} />;
  if (type === "batch") return <Layers size={14} />;
  return <Globe size={14} />;
}

function formatDate(dateStr) {
  if (!dateStr) return "No Date Available";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "No Date Available" : d.toLocaleString();
}
