import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  FileSearch,
  ShieldCheck,
  Users,
  Globe,
  FolderSearch,
  Ban,
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
import { Navigate } from "react-router-dom";
import useTheme from "../useTheme";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const { theme, isLight } = useTheme();

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

  const pieColors = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b"];

  /* Dynamic tooltip style based on theme */
  const tooltipStyle = isLight
    ? {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        color: "#0f172a",
        boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.1)",
        fontFamily: "Inter, sans-serif",
        fontSize: "13px",
      }
    : {
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "12px",
        color: "#f1f5f9",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
        fontFamily: "Inter, sans-serif",
        fontSize: "13px",
      };

  /* ---------- STATS ---------- */
  const stats = [
    { title: "Total Analysis", value: dashboard.stats.totalAnalysis, icon: FileSearch, color: "text-blue-400", hoverBorder: isLight ? "hover:border-blue-400/40" : "hover:border-blue-500/30" },
    { title: "Crime Detected", value: dashboard.stats.crimeDetected, icon: AlertTriangle, color: "text-red-400", hoverBorder: isLight ? "hover:border-red-400/40" : "hover:border-red-500/30" },
    { title: "Not Crime", value: dashboard.stats.safeContent, icon: ShieldCheck, color: "text-emerald-400", hoverBorder: isLight ? "hover:border-emerald-400/40" : "hover:border-emerald-500/30" },
    { title: "Investigator", value: dashboard.stats.investigatorUsers, icon: Users, color: "text-indigo-400", hoverBorder: isLight ? "hover:border-indigo-400/40" : "hover:border-indigo-500/30" },
    { title: "Facebook Pages", value: dashboard.stats.facebookPages, icon: Globe, color: "text-purple-400", hoverBorder: isLight ? "hover:border-purple-400/40" : "hover:border-purple-500/30" },
    { title: "Active Cases", value: dashboard.stats.activeCases, icon: FolderSearch, color: "text-amber-400", hoverBorder: isLight ? "hover:border-amber-400/40" : "hover:border-amber-500/30" },
  ];

  /* ---- Axis & Grid colors ---- */
  const axisColor    = isLight ? "#94a3b8" : "#64748b";
  const gridColor    = isLight ? "#e2e8f0" : "#1e293b";
  const cursorColor  = isLight ? "#e2e8f0" : "#1e293b";

  return (
    <div
      className="min-h-screen p-4 lg:p-6 font-sans selection:bg-blue-500 selection:text-white transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* HEADER */}
      <div
        className={`flex justify-between items-center mb-6 pb-4 border-b ${
          isLight ? "border-slate-200" : "border-slate-900"
        }`}
      >
        <div>
          <h1
            className={`text-3xl font-extrabold tracking-tight ${
              isLight
                ? "text-slate-900"
                : "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400"
            }`}
          >
            Welcome, {user?.name || "Admin"}
          </h1>
          <p className={`text-sm mt-1 ${isLight ? "text-slate-500" : "text-slate-500"}`}>
            Overview Dashboard
          </p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`border p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group backdrop-blur-sm ${item.hoverBorder}`}
              style={{ backgroundColor: "var(--bg-card)", borderColor: isLight ? "#e2e8f0" : undefined }}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isLight ? "text-slate-500 group-hover:text-slate-700" : "text-slate-400 group-hover:text-slate-300"
                }`}
              >
                {item.title}
              </p>
              <div className="flex justify-between items-end mt-3">
                <h2 className={`text-3xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  {loading ? (
                    <span className={`inline-block animate-pulse text-2xl ${isLight ? "text-slate-300" : "text-slate-600"}`}>...</span>
                  ) : (
                    item.value
                  )}
                </h2>
                <div
                  className={`p-2.5 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300 ${
                    isLight ? "bg-slate-100 border border-slate-200" : "bg-slate-950 border border-slate-800"
                  }`}
                >
                  <Icon className={`${item.color} w-5 h-5`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Crime Trend */}
        <ChartCard title="Crime Trend Line" isLight={isLight}>
          <ResponsiveContainer height={260}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke={axisColor} fontSize={12} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="crime" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="safe" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Crime vs Not Crime */}
        <ChartCard title="Crime vs Not Crime Share" isLight={isLight}>
          <ResponsiveContainer height={260}>
            <PieChart>
              <Pie
                data={classificationData}
                dataKey="value"
                nameKey="name"
                outerRadius={86}
                innerRadius={48}
                paddingAngle={4}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {classificationData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} className="focus:outline-none" />
                ))}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Analysis Types */}
        <ChartCard title="Analysis Category Types" isLight={isLight}>
          <ResponsiveContainer height={260}>
            <BarChart data={analysisTypes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" stroke={axisColor} fontSize={12} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorColor, opacity: 0.4 }} />
              <Bar dataKey="count" fill="url(#blueGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Investigation Status */}
        <ChartCard title="Investigation Status Overview" isLight={isLight}>
          <ResponsiveContainer height={260}>
            <BarChart data={caseStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" stroke={axisColor} fontSize={12} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={12} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: cursorColor, opacity: 0.4 }} />
              <Bar dataKey="count" fill="url(#amberGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.6} />
                </linearGradient>
              </defs>
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
      className="border p-4 rounded-2xl shadow-xl transition-colors duration-300 overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: isLight ? "#e2e8f0" : "#0f172a",
      }}
    >
      <h2
        className="text-base font-bold mb-4 tracking-tight border-l-4 border-blue-500 pl-3"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
