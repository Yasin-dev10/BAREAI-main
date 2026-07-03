import { useEffect, useState, useCallback } from "react";
import {
  FileBarChart2, User, Globe, Calendar, CalendarDays,
  AlertTriangle, ShieldCheck, Download, RefreshCw,
  MapPin, Key, Layers, ChevronDown, ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import API from "../api";

const REPORT_TYPES = [
  { id: "general",    label: "General Report",    icon: Globe },
  { id: "individual", label: "Individual Report",  icon: User },
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

  // individual params
  const [users,          setUsers]          = useState([]);
  const [selectedUser,   setSelectedUser]   = useState("");
  // monthly params
  const [selYear,  setSelYear]  = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  // weekly params
  const [weekFrom, setWeekFrom] = useState("");
  const [weekTo,   setWeekTo]   = useState("");

  // Load users list for individual report
  useEffect(() => {
    API.get("/reports/users")
      .then((r) => setUsers(r.data))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setError("");
    setLoading(true);
    setReport(null);
    try {
      let url = `/reports/${activeType}`;
      const params = new URLSearchParams();

      if (activeType === "individual") {
        if (!selectedUser) { setError("Please select a user."); setLoading(false); return; }
        params.set("userId", selectedUser);
      }
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
  }, [activeType, selectedUser, selYear, selMonth, weekFrom, weekTo]);

  // Auto-fetch when type changes (except individual which needs user selection)
  useEffect(() => {
    if (activeType !== "individual") fetchReport();
    else setReport(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, selYear, selMonth]);

  // ─── CSV Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["Report Type", report.reportType],
      ["Period",      report.period],
      ["Generated",   new Date(report.generatedAt).toLocaleString()],
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
          r.type, r.sourceType,
          r.isCrime ? "CRIME" : "NOT CRIME",
          r.confidence,
          r.matchedKeyword || "",
          getBlacklistLabel(r),
          new Date(r.createdAt).toLocaleString(),
          (r.content || "").replace(/\n/g, " ").slice(0, 200),
        ])
      );
    }

    const csv = rows
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${report.reportType}_report_${Date.now()}.csv`;
    a.click();
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
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
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

          {/* Individual – user picker */}
          {activeType === "individual" && (
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select User</label>
              <div className="relative">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose user --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
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
