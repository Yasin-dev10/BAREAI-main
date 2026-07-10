import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import API from "../api";

export default function History() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("ANALYSIS");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [crime, setCrime] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const userRole = getStoredRole();
  const isGeneralUser = userRole === "user";

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/history");
      setData(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchHistory();
    });
  }, [fetchHistory]);

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
        crime === "ALL"
          ? true
          : crime === "CRIME"
          ? item.isCrime === true
          : item.isCrime !== true;

      return contentMatch && crimeMatch;
    });
  }, [activeData, search, crime, activeSection]);

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
      const res = await API.post("/investigation/cases", { historyId: id });
      const caseId = res.data?.case?._id;

      setData((prev) =>
        prev.map((item) =>
          item._id === id
            ? { ...item, investigationStatus: "sent_to_investigation" }
            : item
        )
      );

      if (caseId) {
        navigate(`/cases?case=${caseId}`);
      }
    } catch (error) {
      console.error("Error sending to investigation:", error);
      alert(
        error.response?.data?.message ||
          "Failed to send to investigation. Please try again."
      );
    }
  };

  const openCaseManagement = async (historyId) => {
    try {
      const res = await API.get("/investigation/cases?status=all");
      const match = (res.data || []).find(
        (item) => String(item.history?._id || item.history) === String(historyId)
      );

      if (match?._id) {
        navigate(`/cases?case=${match._id}`);
        return;
      }

      alert("Case not found for this record.");
    } catch (error) {
      console.error("Error opening case management:", error);
      alert(
        error.response?.data?.message ||
          "Failed to open case management. Please try again."
      );
    }
  };

  const downloadCSV = () => {
    const rows = [
      [
        "Section",
        "Type",
        "Name",
        "Decision",
        "Confidence",
        "URL",
        "Content",
        "Date",
      ],
      ...filtered.map((i) => [
        activeSection,
        i.type || "N/A",
        getBlacklistName(i),
        getDecisionLabel(i),
        i.confidence || 0,
        getSourceUrl(i) || "N/A",
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
      isGeneralUser
        ? "my_analysis_history_report.csv"
        : activeSection === "ANALYSIS"
        ? "analysis_history_report.csv"
        : "blacklist_history_report.csv";
    a.click();
  };

  const stats = {
    total: filtered.length,
    crime: filtered.filter((i) => i.isCrime).length,
    notCrime: filtered.filter((i) => !i.isCrime).length,
  };

  return (
    <div
      className="min-h-full font-sans overflow-x-hidden p-8 transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-normal text-slate-100">
              {isGeneralUser ? "My History" : "History Center"}
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-6">
              {isGeneralUser
                ? "Review your own analysis records and final decisions in one readable timeline."
                : "Review analyzed text, source URLs, blacklist matches, and final decisions in one readable timeline."}
            </p>
          </div>

          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-2.5 rounded-lg font-bold text-sm"
          >
            <Download size={16} /> Download Report
          </button>
        </div>

        <div className={`grid grid-cols-1 ${isGeneralUser ? "" : "md:grid-cols-2"} gap-3 mb-6`}>
          <button
            onClick={() => setActiveSection("ANALYSIS")}
            className={`p-4 rounded-lg border text-left transition ${
              activeSection === "ANALYSIS"
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : "bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h2 className="font-extrabold">Analysis History</h2>
                <p className="text-sm opacity-80">
                  {isGeneralUser
                    ? "Your text, URL, file, and batch analysis"
                    : "Text, URL, File, and Batch analysis"}
                </p>
              </div>
            </div>
          </button>

          {!isGeneralUser && (
            <button
              onClick={() => setActiveSection("BLACKLIST")}
              className={`p-4 rounded-lg border text-left transition ${
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
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Records" value={stats.total} />
          <StatCard title="Crime" value={stats.crime} danger />
          <StatCard title="Not Crime" value={stats.notCrime} safe />
        </div>

        <div className="flex flex-col gap-4 mb-6 bg-slate-900/40 p-4 rounded-lg border border-slate-800/60">
          <div className="flex items-center bg-slate-950/80 px-4 py-3 rounded-lg border border-slate-800 focus-within:border-cyan-500/50">
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
              items={[
                { value: "ALL", label: "ALL" },
                { value: "CRIME", label: "CRIME" },
                { value: "NOT_CRIME", label: "NOT CRIME" },
              ]}
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-20">
            <p className="text-slate-400">Loading secure records...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-lg">
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
                openCaseManagement={openCaseManagement}
                canManageInvestigation={!isGeneralUser}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({
  item,
  section,
  deleteRecord,
  sendToInvestigation,
  openCaseManagement,
  canManageInvestigation,
}) {
  const isCrime = item.isCrime === true;
  const decision = getDecisionLabel(item);
  const sourceUrl = getSourceUrl(item);
  const readableText = getReadableText(item);
  const sourceLabel =
    section === "BLACKLIST" ? getBlacklistSource(item) : item.type?.toUpperCase() || "TEXT";
  const canSendToInvestigation =
    canManageInvestigation &&
    item.investigationStatus !== "sent_to_investigation" &&
    item.investigationStatus !== "crime_case" &&
    item.investigationStatus !== "not_crime";
  const canOpenCaseManagement =
    canManageInvestigation && item.investigationStatus === "sent_to_investigation";

  return (
    <div
      className="group border border-slate-800/80 hover:border-slate-700 rounded-lg p-5 transition-colors duration-300"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {isCrime ? (
                  <AlertTriangle className="text-rose-400 shrink-0" size={18} />
                ) : (
                  <ShieldCheck className="text-emerald-400 shrink-0" size={18} />
                )}

                <h2 className="text-slate-100 font-extrabold text-base leading-6 break-words">
                  {section === "BLACKLIST" ? getBlacklistName(item) : getAnalysisTitle(item)}
                </h2>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 text-cyan-400">
                  {getTypeIcon(item.type)}
                  {sourceLabel}
                </span>
                <span className="hidden sm:inline text-slate-700">|</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>

            <button
              onClick={() => deleteRecord(item._id)}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
              title="Delete record"
              aria-label="Delete record"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge isCrime={isCrime} label={decision} />

            <InvestigationStatusBadge status={item.investigationStatus} />

            <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
              <Percent size={12} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-300">
                {item.confidence || 0}% confidence
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <EvidenceBlock label="Visible Text" value={readableText} />
            <SourceUrlBlock url={sourceUrl} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-500 text-xs">
            <span>
              Keyword:{" "}
              <span className="text-slate-300 font-semibold">
                {item.matchedKeyword || "Not provided"}
              </span>
            </span>
            {item.authorName && (
              <span>
                Author: <span className="text-slate-300 font-semibold">{item.authorName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="lg:w-56 shrink-0 flex lg:flex-col gap-2">
          {canSendToInvestigation && (
            <button
              onClick={() => sendToInvestigation(item._id)}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-2 rounded-lg text-xs font-bold"
            >
              <Send size={14} />
              Send to Investigation
            </button>
          )}
          {canOpenCaseManagement && (
            <button
              onClick={() => openCaseManagement(item._id)}
              className="inline-flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 px-3 py-2 rounded-lg text-xs font-bold"
            >
              <UserSearch size={14} />
              Open Case Management
            </button>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 px-3 py-2 rounded-lg text-xs font-bold"
            >
              <ExternalLink size={14} />
              Open URL
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceBlock({ label, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasText = Boolean(value);

  return (
    <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={!hasText}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isOpen ? <EyeOff size={14} /> : <Eye size={14} />}
          {isOpen ? "Close" : "Opern"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 max-h-64 overflow-y-auto overflow-x-hidden rounded-md border border-slate-800/60 bg-slate-950/50 p-3">
          <p
            className="text-slate-200 text-sm leading-6 whitespace-pre-wrap break-words"
            style={{ overflowWrap: "anywhere" }}
          >
            {value}
          </p>
        </div>
      )}

      {!hasText && (
        <p className="mt-3 text-slate-400 text-sm leading-6">No readable text available</p>
      )}
    </div>
  );
}

function SourceUrlBlock({ url }) {
  return (
    <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800/40">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
        Source URL
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block max-w-full overflow-hidden text-cyan-300 hover:text-cyan-200 text-sm font-semibold leading-6 break-all"
          style={{ overflowWrap: "anywhere" }}
        >
          {url}
        </a>
      ) : (
        <p className="text-slate-400 text-sm leading-6">No URL attached to this record</p>
      )}
    </div>
  );
}

function FilterGroup({ label, value, setValue, items }) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-950/50 p-1 rounded-lg border border-slate-800/80">
      <span className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider flex items-center gap-1">
        <Filter size={12} />
        {label}:
      </span>

      {items.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;

        return (
          <button
            key={optionValue}
            onClick={() => setValue(optionValue)}
            className={`px-4 py-1.5 rounded-md font-bold text-xs uppercase transition ${
              value === optionValue
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {optionLabel}
          </button>
        );
      })}
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
    <div className={`rounded-lg p-5 border ${color}`}>
      <p className="text-sm opacity-80">{title}</p>
      <h2 className="text-3xl font-extrabold mt-2">{value}</h2>
    </div>
  );
}

function StatusBadge({ isCrime, label }) {
  return (
    <span
      className={`px-3 py-1 text-[11px] font-extrabold rounded-md border ${
        isCrime
          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      }`}
    >
      {label}
    </span>
  );
}

function InvestigationStatusBadge({ status }) {
  if (!status || status === "none") return null;

  const styles = {
    pending:
      "bg-slate-500/20 text-slate-400 border border-slate-500/30",
    sent_to_investigation:
      "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    under_review:
      "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    resolved:
      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    closed:
      "bg-slate-500/20 text-slate-400 border border-slate-500/30",
    crime_case:
      "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    not_crime:
      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  };

  const labels = {
    pending: "Pending",
    sent_to_investigation: "Sent to Investigation",
    under_review: "Under Review",
    resolved: "Resolved",
    closed: "Closed",
    crime_case: "Crime Case",
    not_crime: "Not Crime",
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

function getDecisionLabel(item) {
  return item.isCrime === true ? "CRIME" : "NOT CRIME";
}

function getSourceUrl(item) {
  if (isLikelyUrl(item.url)) return item.url;
  if (item.type === "url" && isLikelyUrl(item.content)) return item.content;
  return "";
}

function getReadableText(item) {
  if (item.extractedText) return item.extractedText;
  if (item.content && item.content !== getSourceUrl(item)) return item.content;
  if (item.content) return item.content;
  return "";
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
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

function getStoredRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.role || "user";
  } catch {
    return "user";
  }
}
