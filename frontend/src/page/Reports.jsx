import { useEffect, useState, useCallback } from "react";
import {
  FileBarChart2, Globe, Calendar, CalendarDays,
  AlertTriangle, ShieldCheck, Download, RefreshCw,
  Layers, ChevronDown, ShieldAlert,
  FileText, FileSpreadsheet, ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import API from "../api";
import useTheme from "../useTheme";
import { exportReportCSV, exportReportExcel, exportReportPDF } from "../utils/reportExport";

const REPORT_TYPES = [
  { id: "general",    label: "General Report",    icon: Globe },
  { id: "weekly",     label: "Weekly Report",     icon: CalendarDays },
  { id: "monthly",    label: "Monthly Report",    icon: Calendar },
  { id: "individual", label: "Individual Report", icon: ShieldAlert },
];

const PIE_COLORS = ["#ef4444", "#1E3A8A"];
const CHART_CRIME = "#ef4444";
const CHART_SAFE = "#1E3A8A";
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS  = Array.from({ length: 5 }, (_, i) => currentYear - i);
const MONTHS = [
  { v: 1, l: "January" }, { v: 2, l: "February" }, { v: 3, l: "March" },
  { v: 4, l: "April" },   { v: 5, l: "May" },       { v: 6, l: "June" },
  { v: 7, l: "July" },    { v: 8, l: "August" },    { v: 9, l: "September" },
  { v: 10, l: "October" },{ v: 11, l: "November" }, { v: 12, l: "December" },
];

/** Explicit palettes — no CSS vars in charts/UI so light mode never inherits dark colors */
const THEME = {
  light: {
    page: "#eef2f7",
    card: "#ffffff",
    elevated: "#f1f5f9",
    text: "#0f172a",
    secondary: "#334155",
    muted: "#64748b",
    border: "#cbd5e1",
    brand: "#1E3A8A",
    brandSoft: "rgba(30, 58, 138, 0.1)",
    brandRing: "rgba(30, 58, 138, 0.25)",
    danger: "#dc2626",
    dangerSoft: "rgba(220, 38, 38, 0.12)",
    warn: "#d97706",
    warnSoft: "rgba(245, 158, 11, 0.12)",
    warnBorder: "rgba(245, 158, 11, 0.35)",
    axis: "#64748b",
    grid: "#e2e8f0",
    shadow: "0 1px 2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.04)",
    tooltipShadow: "0 8px 28px rgba(15, 23, 42, 0.1)",
  },
  dark: {
    page: "#0a0d14",
    card: "#141b2d",
    elevated: "#1a2338",
    text: "#ffffff",
    secondary: "#a0aec0",
    muted: "#6b7a99",
    border: "#1e2d4a",
    brand: "#06B6D4",
    brandSoft: "rgba(6, 182, 212, 0.12)",
    brandRing: "rgba(6, 182, 212, 0.35)",
    danger: "#f87171",
    dangerSoft: "rgba(239, 68, 68, 0.15)",
    warn: "#fbbf24",
    warnSoft: "rgba(245, 158, 11, 0.12)",
    warnBorder: "rgba(245, 158, 11, 0.35)",
    axis: "#64748b",
    grid: "#1e2d4a",
    shadow: "0 1px 3px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04)",
    tooltipShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
  },
};

export default function Reports() {
  const { theme, isLight } = useTheme();
  const t = THEME[isLight ? "light" : "dark"];

  const [activeType, setActiveType]   = useState("general");
  const [report,     setReport]       = useState(null);
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState("");

  const [blacklistItems, setBlacklistItems] = useState([]);
  const [selectedBlacklistId, setSelectedBlacklistId] = useState("");
  const [selYear,  setSelYear]  = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo,   setWeekTo]   = useState("");

  const fieldStyle = {
    backgroundColor: t.elevated,
    borderColor: t.border,
    color: t.text,
  };

  const tooltipStyle = {
    background: t.card,
    border: `1px solid ${t.border}`,
    borderRadius: "12px",
    color: t.text,
    fontSize: "12px",
    boxShadow: t.tooltipShadow,
  };

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

      if (activeType === "weekly") {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

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

  useEffect(() => {
    if (activeType !== "individual") fetchReport();
    else setReport(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selYear, selMonth, selectedBlacklistId]);

  return (
    <div
      className="reports-page w-full transition-colors duration-300"
      style={{
        backgroundColor: t.page,
        color: t.text,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div className="page-header" style={{ borderColor: t.border }}>
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: t.brandSoft, color: t.brand }}
          >
            <FileBarChart2 size={20} />
          </span>
          <div>
            <h1 className="page-title" style={{ color: t.text }}>Reports</h1>
            <p className="page-subtitle" style={{ color: t.muted }}>
              General, weekly, monthly, and individual reports with links to related cases and analysis.
            </p>
          </div>
        </div>
        {report && (
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => exportReportPDF(report)}
              className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition"
              style={{
                backgroundColor: t.elevated,
                borderColor: t.border,
                color: t.text,
              }}
            >
              <FileText size={16} /> Download PDF
            </button>
            <button
              type="button"
              onClick={() => exportReportExcel(report)}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition"
              style={{ backgroundColor: t.brand }}
            >
              <FileSpreadsheet size={16} /> Download Excel
            </button>
            <button
              type="button"
              onClick={() => exportReportCSV(report)}
              className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white transition"
              style={{ backgroundColor: t.brand }}
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map(({ id, label, icon: Icon }) => {
          const active = activeType === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveType(id); setReport(null); setError(""); }}
              className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200"
              style={{
                backgroundColor: active ? t.brand : t.card,
                borderColor: active ? t.brand : t.border,
                color: active ? "#ffffff" : t.secondary,
                boxShadow: active ? t.shadow : "none",
              }}
            >
              <Icon size={16} className="shrink-0 opacity-80" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          );
        })}
      </div>

      <div
        className="mb-6 rounded-2xl border p-4"
        style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: t.shadow }}
      >
        <div className="flex flex-wrap items-end gap-4">
          {(activeType === "individual" || activeType === "monthly" || activeType === "weekly") && (
            <div className="flex min-w-[220px] flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
                {activeType === "individual" ? "Select Blacklist" : "Filter by Blacklist (optional)"}
              </label>
              <div className="relative">
                <select
                  value={selectedBlacklistId}
                  onChange={(e) => setSelectedBlacklistId(e.target.value)}
                  className="w-full appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm focus:outline-none"
                  style={fieldStyle}
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
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3.5" style={{ color: t.muted }} />
              </div>
            </div>
          )}

          {activeType === "monthly" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.muted }}>Year</label>
                <div className="relative">
                  <select
                    value={selYear}
                    onChange={(e) => setSelYear(+e.target.value)}
                    className="appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm focus:outline-none"
                    style={fieldStyle}
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3.5" style={{ color: t.muted }} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.muted }}>Month</label>
                <div className="relative">
                  <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(+e.target.value)}
                    className="appearance-none rounded-xl border px-3 py-2.5 pr-8 text-sm focus:outline-none"
                    style={fieldStyle}
                  >
                    {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-3.5" style={{ color: t.muted }} />
                </div>
              </div>
            </>
          )}

          {activeType === "weekly" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.muted }}>From (optional)</label>
                <input
                  type="date"
                  value={weekFrom}
                  max={weekTo || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setWeekFrom(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={fieldStyle}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.muted }}>To (optional)</label>
                <input
                  type="date"
                  value={weekTo}
                  min={weekFrom || undefined}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setWeekTo(e.target.value)}
                  className="rounded-xl border px-3 py-2.5 text-sm focus:outline-none"
                  style={fieldStyle}
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ backgroundColor: t.brand }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Preparing…" : "Create report"}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm font-medium" style={{ color: t.danger }}>{error}</p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <RefreshCw size={32} className="animate-spin" style={{ color: t.brand }} />
          <span className="ml-3 text-lg" style={{ color: t.muted }}>Preparing your report…</span>
        </div>
      )}

      {!loading && report && (
        <div className="space-y-6">
          <div
            className="flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:flex-row"
            style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: t.shadow }}
          >
            <div>
              <div className="mb-1 flex items-center gap-2">
                <FileBarChart2 size={18} style={{ color: t.brand }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: t.muted }}>
                  {report.reportType} report
                </span>
              </div>
              <h2 className="text-xl font-extrabold" style={{ color: t.text }}>{report.period}</h2>
              {report.blacklistItem && (
                <p className="mt-1 break-all text-sm" style={{ color: t.secondary }}>
                  {report.blacklistItem.name} ·{" "}
                  <span className="capitalize">{report.blacklistItem.type}</span> ·{" "}
                  {report.blacklistItem.value}
                </p>
              )}
            </div>
            <div className="self-end text-sm sm:self-start" style={{ color: t.muted }}>
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatCard t={t} label="Total Analysed" value={report.stats.total} />
            <StatCard t={t} label="Crime" value={report.stats.crime} tone="danger" />
            <StatCard t={t} label="Not Crime" value={report.stats.notCrime} />
          </div>

          {report.blacklist && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatCard
                t={t}
                label={report.reportType === "general" ? "Blacklist Items" : "Blacklist Items (Period)"}
                value={report.blacklist.items || 0}
              />
              <StatCard t={t} label="Alerts raised" value={report.blacklist.alerts || 0} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" key={theme}>
            <ChartCard t={t} title="Crime and safe content">
              <ResponsiveContainer height={240}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Crime", value: report.stats.crime },
                      { name: "Not Crime", value: report.stats.notCrime },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={52}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ color: t.secondary, fontSize: 12 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {report.sourceBreakdown?.length > 0 && (
              <ChartCard t={t} title="Where reports came from">
                <ResponsiveContainer height={240}>
                  <BarChart data={report.sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="source" stroke={t.axis} fontSize={12} tickLine={false} tick={{ fill: t.axis }} />
                    <YAxis stroke={t.axis} fontSize={12} tickLine={false} tick={{ fill: t.axis }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill={CHART_SAFE} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {report.dailyBreakdown?.length > 0 && (
              <ChartCard t={t} title="Daily activity">
                <ResponsiveContainer height={240}>
                  <LineChart data={report.dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey={report.reportType === "weekly" ? "day" : "date"}
                      stroke={t.axis}
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: t.axis }}
                    />
                    <YAxis stroke={t.axis} fontSize={12} tickLine={false} tick={{ fill: t.axis }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="crime" stroke={CHART_CRIME} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="notCrime" stroke={CHART_SAFE} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    <Legend wrapperStyle={{ color: t.secondary, fontSize: 12 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {report.blacklist?.topMatches?.length > 0 && (
            <ChartCard t={t} title="Most frequent blacklist matches">
              <div className="space-y-3">
                {report.blacklist.topMatches.map((match, i) => {
                  const hrefCandidate = String(match.value || match.name || "").trim();
                  const href = /^https?:\/\//i.test(hrefCandidate) ? hrefCandidate : null;
                  const label = match.name || match.value;
                  return (
                    <div
                      key={`${match.type}-${match.value}-${i}`}
                      className="flex flex-col justify-between gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
                      style={{ backgroundColor: t.elevated, borderColor: t.border }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ShieldAlert size={15} style={{ color: t.muted }} />
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1.5 break-all font-bold hover:underline"
                              style={{ color: t.brand }}
                              title={href}
                            >
                              <span className="truncate">{label}</span>
                              <ExternalLink size={12} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="break-all font-bold" style={{ color: t.text }}>{label}</span>
                          )}
                          {match.value && match.name && match.value !== match.name && !href && (
                            <span className="break-all text-xs" style={{ color: t.muted }}>{match.value}</span>
                          )}
                          <span
                            className="rounded-full border px-2 py-0.5 text-xs"
                            style={{ borderColor: t.border, backgroundColor: t.card, color: t.secondary }}
                          >
                            {match.type}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: t.text }}>
                        {match.count} matches
                      </span>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}

          {(report.records || report.recentRecords)?.length > 0 && (
            <RecordsTable t={t} records={report.records || report.recentRecords} />
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ t, label, value, tone = "default" }) {
  const isDanger = tone === "danger";
  return (
    <div
      className="rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: t.card,
        borderColor: isDanger ? t.dangerSoft : t.border,
        boxShadow: t.shadow,
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.muted }}>
        {label}
      </p>
      <h2 className="mt-1 text-xl font-bold tabular-nums" style={{ color: isDanger ? t.danger : t.text }}>
        {value}
      </h2>
    </div>
  );
}

function ChartCard({ t, title, children }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: t.shadow }}
    >
      <h3
        className="mb-4 border-l-4 pl-3 text-sm font-bold"
        style={{ color: t.text, borderColor: t.brand }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function getBlacklistMatches(record) {
  const matches = record.blacklistMatches || [];
  return matches
    .map((match, index) => {
      const hrefCandidate = String(match.value || match.name || "").trim();
      const href = /^https?:\/\//i.test(hrefCandidate) ? hrefCandidate : null;
      const label = href || match.name || match.value || match.type || "blacklist";
      return { key: `${label}-${index}`, label, href };
    })
    .filter((item) => item.label);
}

function getPostUrl(record) {
  for (const value of [record.url, record.content]) {
    const text = String(value || "").trim();
    if (/^https?:\/\//i.test(text)) return text;
  }
  return null;
}

function BlacklistMatchChip({ t, match }) {
  const style = {
    borderColor: t.warnBorder,
    backgroundColor: t.warnSoft,
    color: t.warn,
  };
  const className =
    "inline-flex max-w-[220px] items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium";

  if (match.href) {
    return (
      <a href={match.href} target="_blank" rel="noopener noreferrer" className={`${className} hover:opacity-90`} style={style} title={match.href}>
        <ShieldAlert size={11} className="shrink-0" />
        <span className="truncate">{match.label}</span>
        <ExternalLink size={10} className="shrink-0 opacity-70" />
      </a>
    );
  }

  return (
    <span className={className} style={style} title={match.label}>
      <ShieldAlert size={11} className="shrink-0" />
      <span className="truncate">{match.label}</span>
    </span>
  );
}

function RecordsTable({ t, records }) {
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const totalPages = Math.ceil(records.length / PER_PAGE);
  const visible = records.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ backgroundColor: t.card, borderColor: t.border, boxShadow: t.shadow }}
    >
      <div className="flex items-center gap-2 border-b px-5 py-4" style={{ borderColor: t.border }}>
        <Layers size={16} style={{ color: t.brand }} />
        <h3 className="text-sm font-bold" style={{ color: t.text }}>
          Records reviewed ({records.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: t.border, color: t.muted }}>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Classification</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Related blacklist</th>
              <th className="px-4 py-3 text-left">Published</th>
              <th className="px-4 py-3 text-left">Report content</th>
              <th className="px-4 py-3 text-left">Link</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const postUrl = getPostUrl(r);
              const blacklistMatches = getBlacklistMatches(r);
              return (
                <tr key={r._id} className="border-b" style={{ borderColor: t.border }}>
                  <td className="px-4 py-3 text-xs" style={{ color: t.muted }}>
                    {r.sourceType || r.type || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {r.isCrime ? (
                      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: t.danger }}>
                        <AlertTriangle size={12} /> CRIME
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold" style={{ color: t.brand }}>
                        <ShieldCheck size={12} /> NO CRIME
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: t.secondary }}>
                    {r.confidence ?? 0}%
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {blacklistMatches.length > 0 ? (
                      <div className="flex max-w-[260px] flex-col gap-1.5">
                        {blacklistMatches.map((match) => (
                          <BlacklistMatchChip key={match.key} t={t} match={match} />
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: t.muted }}>—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: t.muted }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs" style={{ color: t.secondary }}>
                    {(r.content || "").slice(0, 80)}
                    {r.content?.length > 80 ? "…" : ""}
                  </td>
                  <td className="px-4 py-3">
                    {postUrl ? (
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-[280px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold hover:opacity-90"
                        style={{
                          borderColor: t.brandRing,
                          backgroundColor: t.brandSoft,
                          color: t.brand,
                        }}
                        title={postUrl}
                      >
                        <span className="truncate">{postUrl}</span>
                        <ExternalLink size={10} className="shrink-0" />
                      </a>
                    ) : (
                      <span style={{ color: t.muted }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between border-t px-5 py-3 text-xs"
          style={{ borderColor: t.border, color: t.muted }}
        >
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg px-3 py-1.5 transition disabled:opacity-40"
              style={{ backgroundColor: t.elevated, color: t.text }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg px-3 py-1.5 transition disabled:opacity-40"
              style={{ backgroundColor: t.elevated, color: t.text }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
