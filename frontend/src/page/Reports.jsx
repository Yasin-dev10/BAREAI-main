import { useEffect, useState, useCallback } from "react";
import {
  FileBarChart2, Globe, Calendar, CalendarDays,
  AlertTriangle, ShieldCheck, Download, RefreshCw,
  MapPin, Key, Layers, ChevronDown, ShieldAlert,
  FileText, FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import API from "../api";

const REPORT_TYPES = [
  { id: "general",    label: "General Report",    icon: Globe },
  { id: "individual", label: "Individual Report",  icon: ShieldAlert },
  { id: "monthly",    label: "Monthly Report",     icon: Calendar },
  { id: "weekly",     label: "Weekly Report",      icon: CalendarDays },
];

const PIE_COLORS = ["#ef4444", "#10b981"];
const TOOLTIP_STYLE = {
  background: "#0f172a", border: "1px solid #1e293b",
  borderRadius: "12px", color: "#fff",
};

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS  = Array.from({ length: 5 }, (_, i) => currentYear - i);
const MONTHS = [
  { v: 1, l: "January" }, { v: 2, l: "February" }, { v: 3, l: "March" },
  { v: 4, l: "April" },   { v: 5, l: "May" },       { v: 6, l: "June" },
  { v: 7, l: "July" },    { v: 8, l: "August" },    { v: 9, l: "September" },
  { v: 10, l: "October" },{ v: 11, l: "November" }, { v: 12, l: "December" },
];

export default function Reports() {
  const [activeType, setActiveType]   = useState("general");
  const [report,     setReport]       = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState("");

  // individual blacklist report params
  const [blacklistItems,        setBlacklistItems]        = useState([]);
  const [selectedBlacklistItem, setSelectedBlacklistItem] = useState("");
  // monthly params
  const [selYear,  setSelYear]  = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  // weekly params
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo,   setWeekTo]   = useState("");

  // Load blacklist items for individual report
  useEffect(() => {
    API.get("/blacklist")
      .then((r) => setBlacklistItems(r.data || []))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setError("");
    setLoading(true);
    setReport(null);
    try {
      if (activeType === "individual") {
        if (!selectedBlacklistItem) {
          setError("Please select a blacklist item.");
          setLoading(false);
          return;
        }

        const res = await API.get(`/blacklist/${selectedBlacklistItem}/details`);
        setReport(normalizeBlacklistDetailReport(res.data));
        return;
      }

      let url = `/reports/${activeType}`;
      const params = new URLSearchParams();

      if (activeType === "monthly") {
        params.set("year",  selYear);
        params.set("month", selMonth);
      }
      if (activeType === "weekly" && weekFrom && weekTo) {
        params.set("from", weekFrom);
        params.set("to",   weekTo);
      }

      const qs = params.toString();
      const res = await API.get(qs ? `${url}?${qs}` : url);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [activeType, selectedBlacklistItem, selYear, selMonth, weekFrom, weekTo]);

  // Auto-fetch when type changes (except individual which needs blacklist selection)
  useEffect(() => {
    if (activeType !== "individual") fetchReport();
    else setReport(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selYear, selMonth]);

  // ─── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!report) return;
    const rows = buildReportRows(report);

    const csv = rows
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(csv, `${getReportFileBase(report)}.csv`, "text/csv;charset=utf-8");
  };

  const exportExcel = () => {
    if (!report) return;
    const table = buildReportRows(report)
      .map((row) =>
        row.length
          ? `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
          : "<tr><td></td></tr>"
      )
      .join("");
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${table}</table></body></html>`;
    downloadBlob(
      workbook,
      `${getReportFileBase(report)}.xls`,
      "application/vnd.ms-excel;charset=utf-8"
    );
  };

  const exportPDF = () => {
    if (!report) return;
    const pdf = buildPdf(buildReportRows(report));
    downloadBlob(pdf, `${getReportFileBase(report)}.pdf`, "application/pdf");
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-4 lg:p-6 font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
            Reports Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Generate and export crime analysis reports</p>
        </div>
        {report && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold px-4 py-2.5 rounded-xl text-sm"
            >
              <FileText size={16} /> PDF
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm"
            >
              <Download size={16} /> CSV
            </button>
          </div>
        )}
      </div>

      {/* REPORT TYPE SELECTOR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {REPORT_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveType(id); setReport(null); setError(""); }}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${
              activeType === id
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <Icon size={20} />
            <span className="text-sm font-bold">{label}</span>
          </button>
        ))}
      </div>

      {/* PARAM CONTROLS */}
      <div className="border border-slate-800 rounded-2xl p-4 mb-6" style={{ backgroundColor: "var(--bg-card)" }}>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Individual - blacklist item picker */}
          {activeType === "individual" && (
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select Blacklist</label>
              <div className="relative">
                <select
                  value={selectedBlacklistItem}
                  onChange={(e) => setSelectedBlacklistItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose blacklist --</option>
                  {blacklistItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name || item.value} ({item.type})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Monthly – year + month */}
          {activeType === "monthly" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Year</label>
                <div className="relative">
                  <select value={selYear} onChange={(e) => setSelYear(+e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-blue-500">
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Month</label>
                <div className="relative">
                  <select value={selMonth} onChange={(e) => setSelMonth(+e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-blue-500">
                    {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Weekly – optional custom range */}
          {activeType === "weekly" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">From (optional)</label>
                <input type="date" value={weekFrom} onChange={(e) => setWeekFrom(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">To (optional)</label>
                <input type="date" value={weekTo} onChange={(e) => setWeekTo(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Generate Report"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400 font-medium">{error}</p>}
      </div>

      {/* REPORT CONTENT */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={32} className="animate-spin text-blue-500" />
          <span className="ml-3 text-slate-400 text-lg">Generating report…</span>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">

          {/* Report Header Banner */}
          <div className="border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4" style={{ backgroundColor: "var(--bg-card)" }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileBarChart2 size={18} className="text-blue-400" />
                <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">{report.reportType} Report</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{report.period}</h2>
              {report.user && (
                <p className="text-slate-400 text-sm mt-1">
                  {report.user.name} · <span className="capitalize">{report.user.role}</span> · {report.user.email}
                </p>
              )}
              {report.blacklistItem && (
                <p className="text-slate-400 text-sm mt-1 break-all">
                  {report.blacklistItem.name} · <span className="capitalize">{report.blacklistItem.type}</span> · {report.blacklistItem.value}
                </p>
              )}
            </div>
            <div className="text-sm text-slate-500 self-end sm:self-start">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Analysis" value={report.stats.total} color="blue" />
            <StatCard label="Crime Detected" value={report.stats.crime} color="red" />
            <StatCard label="Not Crime"       value={report.stats.notCrime} color="emerald" />
          </div>

          {report.blacklist && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Blacklist Items"
                value={report.blacklist.items || 0}
                color="cyan"
              />
              <StatCard
                label="Blacklist Matches"
                value={report.blacklist.matches || 0}
                color="amber"
              />
              <StatCard
                label="Blacklist Crime"
                value={report.blacklist.crimeMatches || 0}
                color="red"
              />
              <StatCard
                label="Blacklist Alerts"
                value={report.blacklist.alerts || 0}
                color="violet"
              />
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Crime vs Not Crime Pie */}
            <ChartCard title="Crime vs Not Crime Distribution">
              <ResponsiveContainer height={240}>
                <PieChart>
                  <Pie data={[
                    { name: "Crime",     value: report.stats.crime },
                    { name: "Not Crime", value: report.stats.notCrime },
                  ]} dataKey="value" nameKey="name" outerRadius={90} innerRadius={52} paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend iconType="circle" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Source Breakdown Bar */}
            {report.sourceBreakdown?.length > 0 && (
              <ChartCard title="Source / Type Breakdown">
                <ResponsiveContainer height={240}>
                  <BarChart data={report.sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="source" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Daily Breakdown Line (monthly / weekly) */}
            {report.dailyBreakdown?.length > 0 && (
              <ChartCard title="Daily Crime Trend">
                <ResponsiveContainer height={240}>
                  <LineChart data={report.dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey={report.reportType === "weekly" ? "day" : "date"}
                      stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="crime"    stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="notCrime" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Top Keywords */}
            {report.topKeywords?.length > 0 && (
              <ChartCard title="Top Matched Keywords">
                <ResponsiveContainer height={240}>
                  <BarChart data={report.topKeywords} layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis type="category" dataKey="keyword" stroke="#64748b" fontSize={11} tickLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Location Breakdown (general report) */}
          {report.locationBreakdown?.length > 0 && (
            <ChartCard title="Location / Country Breakdown">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                {report.locationBreakdown.map((l, i) => (
                  <div key={i} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-1">
                    <MapPin size={16} className="text-indigo-400" />
                    <span className="text-white font-bold text-lg">{l.count}</span>
                    <span className="text-slate-400 text-xs text-center">{l.country}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {report.blacklist?.topMatches?.length > 0 && (
            <ChartCard title="Top Blacklist Matches">
              <div className="space-y-3">
                {report.blacklist.topMatches.map((match, i) => (
                  <div
                    key={`${match.type}-${match.value}-${i}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldAlert size={15} className="text-amber-300" />
                        <span className="font-bold text-slate-100 break-all">
                          {match.value}
                        </span>
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">
                          {match.type}
                        </span>
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                          {match.priority}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-300">
                      {match.count} matches
                    </span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Records Table */}
          {(report.records || report.recentRecords)?.length > 0 && (
            <RecordsTable records={report.records || report.recentRecords} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  const palettes = {
    blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-300" },
    red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-300" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300" },
    cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    text: "text-cyan-300" },
    amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300" },
    violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-300" },
  };
  const p = palettes[color] || palettes.blue;
  return (
    <div className={`rounded-2xl border p-5 ${p.bg} ${p.border}`}>
      <p className={`text-sm font-semibold opacity-80 ${p.text}`}>{label}</p>
      <h2 className={`text-4xl font-extrabold mt-2 ${p.text}`}>{value}</h2>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="border border-slate-800 rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)" }}>
      <h3 className="font-bold text-sm mb-4 border-l-4 border-blue-500 pl-3" style={{ color: "var(--text-primary)" }}>{title}</h3>
      {children}
    </div>
  );
}

function buildReportRows(report) {
  const rows = [
    ["Report Type", report.reportType],
    ["Period", report.period],
    ["Generated", new Date(report.generatedAt).toLocaleString()],
    [],
    ["STATS"],
    ["Total", report.stats.total],
    ["Crime", report.stats.crime],
    ["Not Crime", report.stats.notCrime],
    [],
  ];

  if (report.sourceBreakdown?.length) {
    rows.push(["SOURCE BREAKDOWN"], ["Source", "Count"]);
    report.sourceBreakdown.forEach((s) => rows.push([s.source, s.count]));
    rows.push([]);
  }

  if (report.topKeywords?.length) {
    rows.push(["TOP KEYWORDS"], ["Keyword", "Count"]);
    report.topKeywords.forEach((k) => rows.push([k.keyword, k.count]));
    rows.push([]);
  }

  if (report.blacklist) {
    rows.push(
      ["BLACKLIST"],
      ["Items", report.blacklist.items || 0],
      ["Active Items", report.blacklist.activeItems || 0],
      ["Matches", report.blacklist.matches || 0],
      ["Crime Matches", report.blacklist.crimeMatches || 0],
      ["Not-Crime Matches", report.blacklist.notCrimeMatches || 0],
      ["Alerts", report.blacklist.alerts || 0],
      []
    );
  }

  if (report.blacklist?.topMatches?.length) {
    rows.push(["TOP BLACKLIST MATCHES"], ["Type", "Value", "Priority", "Count"]);
    report.blacklist.topMatches.forEach((m) =>
      rows.push([m.type, m.value, m.priority, m.count])
    );
    rows.push([]);
  }

  if (report.dailyBreakdown?.length) {
    rows.push(["DAILY BREAKDOWN"], ["Date", "Day", "Crime", "Not Crime", "Total"]);
    report.dailyBreakdown.forEach((d) =>
      rows.push([d.date, d.day || "", d.crime, d.notCrime, d.total])
    );
    rows.push([]);
  }

  const exportRecords = report.records || report.recentRecords || [];
  if (exportRecords.length) {
    rows.push(["RECORDS"], ["Type", "Source", "Crime?", "Confidence", "Keyword", "Blacklist", "Date", "Content"]);
    exportRecords.forEach((r) =>
      rows.push([
        r.type,
        r.sourceType,
        r.isCrime ? "CRIME" : "NOT CRIME",
        r.confidence,
        r.matchedKeyword || "",
        getBlacklistLabel(r),
        r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
        (r.content || "").replace(/\n/g, " ").slice(0, 200),
      ])
    );
  }

  return rows;
}

function downloadBlob(content, fileName, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function getReportFileBase(report) {
  const period = String(report.period || "report")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${report.reportType || "report"}_${period || "report"}_${Date.now()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPdf(rows) {
  const lines = rows.flatMap((row) =>
    row.length ? wrapPdfLine(row.map((cell) => String(cell ?? "")).join("    ")) : [""]
  );
  const pageChunks = [];
  for (let i = 0; i < lines.length; i += 42) {
    pageChunks.push(lines.slice(i, i + 42));
  }
  if (!pageChunks.length) pageChunks.push(["No report data"]);

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids = [];

  pageChunks.forEach((pageLines) => {
    const text = pageLines
      .map((line, index) => `${index === 0 ? "" : "T*"}(${escapePdfText(line)}) Tj`)
      .join("\n");
    const stream = `BT\n/F1 10 Tf\n14 TL\n50 770 Td\n${text}\nET`;
    const contentId = objects.length + 1;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

    const pageId = objects.length + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    kids.push(`${pageId} 0 R`);
  });

  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function wrapPdfLine(value) {
  const clean = value.replace(/[^\x20-\x7E]/g, "?");
  const chunks = [];
  for (let i = 0; i < clean.length; i += 92) {
    chunks.push(clean.slice(i, i + 92));
  }
  return chunks.length ? chunks : [""];
}

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function normalizeBlacklistDetailReport(data = {}) {
  const item = data.item || {};
  const detailReport = data.report || {};
  const records = Array.isArray(data.histories) ? data.histories : [];
  const totalMatches = detailReport.totalMatches ?? records.length;
  const crimeMatches = detailReport.crimeCount ?? records.filter((r) => r.isCrime === true).length;
  const notCrimeMatches = detailReport.notCrimeCount ?? records.filter((r) => r.isCrime === false).length;

  return {
    reportType: "individual",
    period: `${item.name || item.value || "Blacklist"} Blacklist Report`,
    generatedAt: new Date().toISOString(),
    blacklistItem: {
      name: item.name || "Unnamed blacklist",
      type: item.type || "blacklist",
      value: item.value || "",
      priority: item.priority || "normal",
      active: Boolean(item.active),
    },
    stats: {
      total: totalMatches,
      crime: crimeMatches,
      notCrime: notCrimeMatches,
    },
    blacklist: {
      items: item._id ? 1 : 0,
      activeItems: item.active ? 1 : 0,
      matches: totalMatches,
      crimeMatches,
      notCrimeMatches,
      alerts: detailReport.totalAlerts || 0,
      topMatches: buildTopBlacklistMatches(records, item, totalMatches),
    },
    sourceBreakdown: buildBreakdown(records, (record) => record.sourceType || record.type || "unknown", "source"),
    topKeywords: buildBreakdown(records, (record) => record.matchedKeyword, "keyword").slice(0, 10),
    records,
  };
}

function buildBreakdown(records, getKey, keyName) {
  const counts = records.reduce((acc, record) => {
    const key = getKey(record);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([key, count]) => ({ [keyName]: key, count }))
    .sort((a, b) => b.count - a.count);
}

function buildTopBlacklistMatches(records, item, fallbackCount) {
  const matches = {};

  records.forEach((record) => {
    (record.blacklistMatches || []).forEach((match) => {
      const value = match.value || item.value || item.name || "Blacklist item";
      const type = match.type || item.type || "blacklist";
      const key = `${type}:${value}`;

      if (!matches[key]) {
        matches[key] = {
          type,
          value,
          priority: match.priority || item.priority || "normal",
          count: 0,
        };
      }

      matches[key].count += 1;
    });
  });

  const topMatches = Object.values(matches).sort((a, b) => b.count - a.count);
  if (topMatches.length > 0) return topMatches.slice(0, 10);
  if (!item._id || fallbackCount < 1) return [];

  return [{
    type: item.type || "blacklist",
    value: item.value || item.name || "Blacklist item",
    priority: item.priority || "normal",
    count: fallbackCount,
  }];
}

function getBlacklistLabel(record) {
  const matches = record.blacklistMatches || [];
  if (!matches.length) return "";

  return matches
    .map((match) => match.value || match.type || "blacklist")
    .filter(Boolean)
    .join(", ");
}

function RecordsTable({ records }) {
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const totalPages = Math.ceil(records.length / PER_PAGE);
  const visible = records.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)" }}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <Layers size={16} className="text-blue-400" />
        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Records ({records.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Keyword</th>
              <th className="px-4 py-3 text-left">Blacklist</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Content</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visible.map((r) => (
              <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-slate-300 uppercase text-xs font-semibold">{r.type || "-"}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.sourceType || "-"}</td>
                <td className="px-4 py-3">
                  {r.isCrime
                    ? <span className="flex items-center gap-1 text-red-400 font-bold text-xs"><AlertTriangle size={12} />CRIME</span>
                    : <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs"><ShieldCheck size={12} />SAFE</span>}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">{r.confidence ?? 0}%</td>
                <td className="px-4 py-3 text-amber-400 text-xs">
                  {r.matchedKeyword
                    ? <span className="flex items-center gap-1"><Key size={11} />{r.matchedKeyword}</span>
                    : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                  {getBlacklistLabel(r)
                    ? (
                      <span className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
                        <ShieldAlert size={11} />
                        <span className="truncate">{getBlacklistLabel(r)}</span>
                      </span>
                    )
                    : <span className="text-slate-600">â€”</span>}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {r.location?.length > 0
                    ? <span className="flex items-center gap-1"><MapPin size={11} />{r.location[0].country || r.location[0].city || "—"}</span>
                    : <span className="text-slate-600">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-xs truncate">
                  {(r.content || "").slice(0, 80)}{r.content?.length > 80 ? "…" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
