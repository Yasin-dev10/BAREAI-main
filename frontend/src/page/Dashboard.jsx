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
  Bell, // Waxaan ku darnay gambaleelka notification-ka
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

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

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
  const recentAlerts = dashboard.recentAlerts || [];

  // Midabyo aad u qurux badan oo loo xushay dark mode-ka cusub
  const pieColors = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b"];

  const tooltipStyle = {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
  };

  /* ---------- STATS ---------- */
  const stats = [
    { title: "Total Analysis", value: dashboard.stats.totalAnalysis, icon: FileSearch, color: "text-blue-400", bg: "hover:border-blue-500/30" },
    { title: "Crime Detected", value: dashboard.stats.crimeDetected, icon: AlertTriangle, color: "text-red-400", bg: "hover:border-red-500/30" },
    { title: "Not Crime", value: dashboard.stats.safeContent, icon: ShieldCheck, color: "text-emerald-400", bg: "hover:border-emerald-500/30" },
    { title: "Investigator", value: dashboard.stats.investigatorUsers, icon: Users, color: "text-indigo-400", bg: "hover:border-indigo-500/30" },
    { title: "Facebook Pages", value: dashboard.stats.facebookPages, icon: Globe, color: "text-purple-400", bg: "hover:border-purple-500/30" },
    { title: "Active Cases", value: dashboard.stats.activeCases, icon: FolderSearch, color: "text-amber-400", bg: "hover:border-amber-500/30" },
   
  ];

  return (
    <div className="bg-[#030712] min-h-screen p-8 lg:p-10 font-sans text-slate-200 selection:bg-blue-500 selection:text-white transition-all duration-300">
        
        {/* HEADER AREA (Halkan waxaa ku jira Notification Icon-kii aad codsatay) */}
        <div className="flex justify-between items-center mb-10 pb-5 border-b border-slate-900">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
              Welcome, {user?.name || "Admin"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">To Dashboard</p>
          </div>

          {/* NOTIFICATION BELL COMPONENT */}
        {/* NOTIFICATION BELL COMPONENT */}
{/* <div
  onClick={() => Navigate("/notifications")}
  className="relative group cursor-pointer p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-lg"
>
  <Bell className="text-slate-400 group-hover:text-amber-400 transition-colors w-6 h-6" />

  {recentAlerts.length > 0 && (
    <span className="absolute top-2 right-2 flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
    </span>
  )}
</div> */}
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.title} 
                className={`bg-[#0b1329] border border-slate-900/60 p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group backdrop-blur-sm ${item.bg}`}
              >
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider group-hover:text-slate-300 transition-colors">
                  {item.title}
                </p>
                <div className="flex justify-between items-end mt-4">
                  <h2 className="text-4xl font-black text-white tracking-tight">
                    {loading ? (
                      <span className="inline-block animate-pulse text-2xl text-slate-600">...</span>
                    ) : (
                      item.value
                    )}
                  </h2>
                  <div className={`p-3 bg-slate-950 rounded-xl border border-slate-850 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`${item.color} w-6 h-6`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Crime Trend */}
          <ChartCard title="Crime Trend Line">
            <ResponsiveContainer height={320}>
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="crime" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="safe" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Crime vs Not Crime */}
          <ChartCard title="Crime vs Not Crime Share">
            <ResponsiveContainer height={320}>
              <PieChart>
                <Pie
                  data={classificationData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={105}
                  innerRadius={60} // Waxaan ka dhigay Donut Chart aad u moodal ah
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
          <ChartCard title="Analysis Category Types">
            <ResponsiveContainer height={320}>
              <BarChart data={analysisTypes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="type" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
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
          <ChartCard title="Investigation Status Overview">
            <ResponsiveContainer height={320}>
              <BarChart data={caseStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="status" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
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
function ChartCard({ title, children }) {
  return (
    <div className="bg-[#0b1329] border border-slate-950 p-6 rounded-2xl shadow-xl hover:border-slate-800/40 transition-colors duration-300">
      <h2 className="text-white text-lg font-bold mb-6 tracking-tight border-l-4 border-blue-500 pl-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
