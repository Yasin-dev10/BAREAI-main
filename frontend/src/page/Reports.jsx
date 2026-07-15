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
import { exportReportCSV, exportReportExcel, exportReportPDF } from "../utils/reportExport";
import useTheme from "../useTheme";

const REPORT_TYPES = [
  { id: "general",    label: "Overview",           icon: Globe },
  { id: "individual", label: "Blacklist activity", icon: ShieldAlert },
  { id: "monthly",    label: "Monthly activity",   icon: Calendar },
  { id: "weekly",     label: "Weekly activity",    icon: CalendarDays },
];

const PIE_COLORS = ["#b91c1c", "#1E3A8A"];
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
  const { isLight } = useTheme();
  const [activeType, setActiveType]   = useState("general");
  const [report,     setReport]       = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState("");

  // blacklist filter for individual / monthly / weekly
  const [blacklistItems, setBlacklistItems] = useState([]);
  const [selectedBlacklistId, setSelectedBlacklistId] = useState("");
  // monthly params
  const [selYear,  setSelYear]  = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  // weekly params
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo,   setWeekTo]   = useState("");

  const tooltipStyle = {
    background: isLight ? "#ffffff" : "var(--bg-card)",
    border: `1px solid ${isLight ? "#dbe4f0" : "var(--border-base)"}`,
    borderRadius: "12px",
    color: isLight ? "#0f172a" : "#ffffff",
  };
  const axisColor = isLight ? "#64748b" : "#94a3b8";
  const gridColor = isLight ? "#dbe4f0" : "#1e2d4a";

  // Load blacklist items for item-specific reports
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
        if (!selectedBlacklistId) {
          setError("Please select a blacklist entry.");
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        params.set("blacklistId", selectedBlacklistId);
        const res = await API.get(`/reports/individual?${params}`);
        setReport(res.data);
        return;
      }

      // ── Monthly validation ─────────────────────────────────────────────────
      if (activeType === "monthly") {
        const now = new Date();
        const selectedDate = new Date(selYear, selMonth - 1, 1);
        const thisMonth    = new Date(now.getFullYear(), now.getMonth(), 1);

        if (selYear < 2000 || selYear > now.getFullYear() + 1) {
          setError(`Year must be between 2000 and ${now.getFullYear() + 1}.`);
          setLoading(false);
          return;
        }
        if (selectedDate > thisMonth) {
          setError("Cannot generate a report for a future month.");
          setLoading(false);
          return;
        }
      }

      // ── Weekly validation ──────────────────────────────────────────────────
      if (activeType === "weekly") {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Both or neither — mixing is not allowed
        if ((weekFrom && !weekTo) || (!weekFrom && weekTo)) {
          setError("Please provide both a start date and an end date for the custom range.");
          setLoading(false);
          return;
        }

        if (weekFrom && weekTo) {
          const from = new Date(weekFrom);
          const to   = new Date(weekTo);

          if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            setError("Invalid date format. Please use the date picker.");
            setLoading(false);
            return;
          }
          if (from > to) {
            setError("Start date cannot be after end date.");
            setLoading(false);
            return;
          }
          if (from > today) {
            setError("Start date cannot be in the future.");
            setLoading(false);
            return;
          }
          if (to > today) {
            setError("End date cannot be in the future.");
            setLoading(false);
            return;
          }
          const diffDays = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
          if (diffDays > 7) {
            setError("Custom range cannot exceed 7 days for a weekly report.");
            setLoading(false);
            return;
          }
          if (diffDays < 1) {
            setError("Date range must be at least 1 day.");
            setLoading(false);
            return;
          }
        }
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
      if (selectedBlacklistId && (activeType === "monthly" || activeType === "weekly")) {
        params.set("blacklistId", selectedBlacklistId);
      }

      const qs = params.toString();
      const res = await API.get(qs ? `${url}?${qs}` : url);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [activeType, selectedBlacklistId, selYear, selMonth, weekFrom, weekTo]);

  // Auto-fetch when type changes (except individual which needs blacklist selection)
  useEffect(() => {
    if (activeType !== "individual") fetchReport();
    else setReport(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selYear, selMonth, selectedBlacklistId]);

  // ─── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!report) return;
    exportReportCSV(report);
  };

  const exportExcel = () => {
    if (!report) return;
    exportReportExcel(report);
  };

  const exportPDF = () => {
    if (!report) return;
    exportReportPDF(report);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-4 lg:p-6 font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >

      {/* HEADER */}
      <div className="page-header">
        <div className="flex items-start gap-3">
          <span className="icon-badge shrink-0">
            <FileBarChart2 size={20} />
          </span>
          <div>
            <h1 className="page-title">Reports</h1>
            
          </div>
        </div>
        {report && (
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <button
              onClick={exportPDF}
              className="btn-secondary"
            >
              <FileText size={16} /> Download PDF
            </button>
            <button
              onClick={exportExcel}
              className="btn-primary"
            >
              <FileSpreadsheet size={16} /> Download Excel
            </button>
            <button
              onClick={exportCSV}
              className="btn-primary"
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        )}
      </div>

      {/* REPORT TYPE SELECTOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mb-6">
        {REPORT_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveType(id); setReport(null); setError(""); }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
              activeType === id
                ? "text-white shadow-sm"
                : "hover:border-[var(--brand-ring)]"
            }`}
            style={{
              backgroundColor: activeType === id ? "var(--brand-dark)" : "var(--bg-card)",
              borderColor: activeType === id ? "var(--brand-dark)" : "var(--border-base)",
              color: activeType === id ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            <Icon size={16} className="shrink-0 opacity-80" />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {/* PARAM CONTROLS */}
      <div className="border border-slate-800 rounded-2xl p-4 mb-6" style={{ backgroundColor: "var(--bg-card)" }}>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Blacklist picker — individual (required), monthly & weekly (optional) */}
          {(activeType === "individual" || activeType === "monthly" || activeType === "weekly") && (
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {activeType === "individual" ? "Select Blacklist" : "Filter by Blacklist (optional)"}
              </label>
              <div className="relative">
                <select
                  value={selectedBlacklistId}
                  onChange={(e) => setSelectedBlacklistId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">
                    {activeType === "individual" ? "-- Choose blacklist --" : "All blacklist items"}
                  </option>
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
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-cyan-500">
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Month</label>
                <div className="relative">
                  <select value={selMonth} onChange={(e) => setSelMonth(+e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-cyan-500">
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
                <input
                  type="date"
                  value={weekFrom}
                  max={weekTo || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setWeekFrom(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">To (optional)</label>
                <input
                  type="date"
                  value={weekTo}
                  min={weekFrom || undefined}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setWeekTo(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </>
          )}

          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Preparing…" : "Create report"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400 font-medium">{error}</p>}
      </div>

      {/* REPORT CONTENT */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={32} className="animate-spin brand-text" />
          <span className="ml-3 text-slate-400 text-lg">Preparing your report…</span>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">

          {/* Report Header Banner */}
          <div className="border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-4" style={{ backgroundColor: "var(--bg-card)" }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileBarChart2 size={18} className="brand-text" />
                <span className="text-xs text-slate-400 uppercase font-bold tracking-widest">{report.reportType} report</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">{report.period}</h2>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <StatCard label="Total Analysed" value={report.stats.total} />
            <StatCard label="Crime" value={report.stats.crime} tone="danger" />
            <StatCard label="Not-Crime-relate" value={report.stats.notCrime} />
          </div>

          {report.blacklist && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatCard
                label={report.reportType === "general" ? "Blacklist Items" : "Blacklist Items (Period)"}
                value={report.blacklist.items || 0}
              />
              {/* <StatCard
                label="Blacklist Matches"
                value={report.blacklist.matches || 0}
              /> */}
              {/* <StatCard
                label="Blacklist Crime"
                value={report.blacklist.crimeMatches || 0}
                tone="danger"
              /> */}
              <StatCard
                label="Alerts raised"
                value={report.blacklist.alerts || 0}
              />
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Crime vs Not Crime Pie */}
            <ChartCard title="Crime and safe content">
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
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Source Breakdown Bar */}
            {report.sourceBreakdown?.length > 0 && (
              <ChartCard title="Where reports came from">
                <ResponsiveContainer height={240}>
                  <BarChart data={report.sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="source" stroke={axisColor} fontSize={12} tickLine={false} />
                    <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Daily Breakdown Line (monthly / weekly) */}
            {report.dailyBreakdown?.length > 0 && (
              <ChartCard title="Daily activity">
                <ResponsiveContainer height={240}>
                  <LineChart data={report.dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey={report.reportType === "weekly" ? "day" : "date"}
                      stroke={axisColor} fontSize={11} tickLine={false} />
                    <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="crime"    stroke="#b91c1c" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="notCrime" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

          </div>

          {/* Location Breakdown (general report) */}
          {report.locationBreakdown?.length > 0 && (
            <ChartCard title="Locations mentioned">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                {report.locationBreakdown.map((l, i) => (
                  <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 flex flex-col items-center gap-0.5">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-base font-bold text-slate-100">{l.count}</span>
                    <span className="text-slate-500 text-[11px] text-center">{l.country}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {report.blacklist?.topMatches?.length > 0 && (
            <ChartCard title="Most frequent blacklist matches">
              <div className="space-y-3">
                {report.blacklist.topMatches.map((match, i) => (
                  <div
                    key={`${match.type}-${match.value}-${i}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldAlert size={15} className="text-slate-400" />
                        <span className="font-bold text-slate-100 break-all">
                          {match.name || match.value}
                        </span>
                        {match.value && match.name && match.value !== match.name && (
                          <span className="text-slate-400 text-xs break-all">{match.value}</span>
                        )}
                        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300">
                          {match.type}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-xs text-slate-300">
                          {match.priority}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-200">
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

function StatCard({ label, value, tone = "default" }) {
  const isDanger = tone === "danger";

  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: isDanger ? "rgba(185, 28, 28, 0.35)" : "var(--border-base)",
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <h2
        className="mt-1 text-xl font-bold tabular-nums"
        style={{ color: isDanger ? "#fca5a5" : "var(--text-primary)" }}
      >
        {value}
      </h2>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card rounded-2xl p-5">
      <h3 className="font-bold text-sm mb-4 border-l-4 pl-3" style={{ color: "var(--text-primary)", borderColor: "var(--brand)" }}>{title}</h3>
      {children}
    </div>
  );
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
          name: item.name || match.name || value,
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
    name: item.name || item.value || "Blacklist item",
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
    <div className="card rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <Layers size={16} className="brand-text" />
        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Records reviewed ({records.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Classification</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Keyword</th>
              <th className="px-4 py-3 text-left">Related blacklist</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Published</th>
              <th className="px-4 py-3 text-left">Report content</th>
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
                    : <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs"><ShieldCheck size={12} />NO CRIME</span>}
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
