import { useEffect, useState } from "react";
import {
  AlertTriangle,
  FileSearch,
  ShieldCheck,
  Users,
  Globe,
  FolderSearch,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import API from "../api";
import useTheme from "../useTheme";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const { isLight } = useTheme();

  const [dashboard, setDashboard] = useState({
    stats: {
      totalAnalysis: 0,
      crimeDetected: 0,
      safeContent: 0,
      investigatorUsers: 0,
      facebookPages: 0,
      activeCases: 0,
      blacklistTotal: 0,
    },
    trend: [],
    classificationDistribution: [],
    analysisTypes: [],
    caseStatus: [],
    facebookMonitoring: [],
    topKeywords: [],
    blacklistCrimeChart: [],
    recentAlerts: [],
    recentInvestigations: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await API.get("/dashboard");
      setDashboard({
        ...dashboard,
        ...res.data,
      });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SAFE DATA ---------- */
  const trendData =
    dashboard.trend?.length > 0
      ? dashboard.trend
      : [{ day: "No Data", crime: 0, safe: 0 }];

  const classificationData = dashboard.classificationDistribution || [];
  const analysisTypes = dashboard.analysisTypes || [];
  const caseStatus = dashboard.caseStatus || [];

  const pieColors = ["#b91c1c", "#1E3A8A", "#64748b", "#94a3b8"];

  /* Dynamic tooltip style based on theme */
  const tooltipStyle = isLight
    ? {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        color: "#0f172a",
        fontSize: "12px",
      }
    : {
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "8px",
        color: "#f1f5f9",
        fontSize: "12px",
      };

  /* ---------- STATS ---------- */
  const stats = [
    { title: "Total Analysis", value: dashboard.stats.totalAnalysis, icon: FileSearch },
    { title: "Crime Detected", value: dashboard.stats.crimeDetected, icon: AlertTriangle, tone: "danger" },
    { title: "Not Crime", value: dashboard.stats.safeContent, icon: ShieldCheck },
    { title: "Investigator", value: dashboard.stats.investigatorUsers, icon: Users },
    { title: "Facebook Pages", value: dashboard.stats.facebookPages, icon: Globe },
    { title: "Active Cases", value: dashboard.stats.activeCases, icon: FolderSearch },
  ];

  /* ---- Axis & Grid colors ---- */
  const axisColor    = isLight ? "#94a3b8" : "#64748b";
  const gridColor    = isLight ? "#e2e8f0" : "#1e293b";
  const cursorColor  = isLight ? "#e2e8f0" : "#1e293b";

  return (
    <div
      className="min-h-screen p-4 lg:p-6 font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* HEADER */}
      <div
        className={`flex justify-between items-center mb-5 pb-3 border-b ${
          isLight ? "border-slate-200" : "border-slate-800"
        }`}
      >
        <div>
          <h1 className="page-title">
            Welcome, {user?.name || "Admin"}
          </h1>
          <p className="page-subtitle">Overview Dashboard</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-5">
        {stats.map((item) => {
          const Icon = item.icon;
          const isDanger = item.tone === "danger";
          return (
            <div
              key={item.title}
              className="rounded-xl border px-3 py-2.5"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: isDanger
                  ? "rgba(185, 28, 28, 0.3)"
                  : isLight
                  ? "#e2e8f0"
                  : "var(--border-base)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide leading-snug"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.title}
                </p>
                <Icon
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: isDanger ? "#fca5a5" : "var(--text-muted)" }}
                />
              </div>
              <p
                className="mt-1.5 text-xl font-bold tabular-nums tracking-tight"
                style={{
                  color: isDanger
                    ? isLight
                      ? "#b91c1c"
                      : "#fca5a5"
                    : "var(--text-primary)",
                }}
              >
                {loading ? "…" : item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Crime Trend */}
        <ChartCard title="Crime Trend" isLight={isLight}>
          <ResponsiveContainer height={220}>
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="crime" stroke="#b91c1c" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="safe" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Crime vs Not Crime */}
        <ChartCard title="Crime vs Not Crime" isLight={isLight}>
          <ResponsiveContainer height={220}>
            <PieChart>
              <Pie
                data={classificationData}
                dataKey="value"
                nameKey="name"
                outerRadius={72}
                innerRadius={40}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {classificationData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} className="focus:outline-none" />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ paddingTop: "8px", fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Analysis Types */}
        <ChartCard title="Analysis Types" isLight={isLight}>
          <ResponsiveContainer height={220}>
            <BarChart data={analysisTypes} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorColor, opacity: 0.35 }} />
              <Bar dataKey="count" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Investigation Status */}
        <ChartCard title="Investigation Status" isLight={isLight}>
          <ResponsiveContainer height={220}>
            <BarChart data={caseStatus} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorColor, opacity: 0.35 }} />
              <Bar dataKey="count" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}

/* ---------- REUSABLE CHART CARD COMPONENT ---------- */
function ChartCard({ title, children, isLight }) {
  return (
    <div
      className="overflow-hidden rounded-xl border p-3.5 transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: isLight ? "#e2e8f0" : "var(--border-base)",
      }}
    >
      <h2
        className="mb-3 border-l-2 pl-2.5 text-sm font-semibold tracking-tight"
        style={{ color: "var(--text-primary)", borderColor: "var(--brand)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
