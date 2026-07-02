import React, { useEffect, useState } from 'react';
import { Shield, Home, Users, Sun, LogIn, UserPlus, Target, Zap, AlertTriangle, Bell, Database, Radio, CheckCircle2, MessageSquare, Brain, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import API from '../api';

export default function BareAIApp() {
  const [modelInfo, setModelInfo] = useState({
    available: false,
    status: "checking",
    message: "Checking Python model",
    featureCount: "--",
  });

  useEffect(() => {
    let cancelled = false;

    API.get("/model/info")
      .then((res) => {
        if (!cancelled) setModelInfo(res.data);
      })
      .catch(() => {
        if (!cancelled) {
          setModelInfo({
            available: false,
            status: "offline",
            message: "Backend is unavailable",
            featureCount: "--",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const modelOnline = modelInfo.available === true;
  const statusLabel =
    modelInfo.status === "checking" ? "Checking" : modelOnline ? "Online" : "Offline";

  // Team data 
  const teamMembers = [
    { name: "Nasteha Mohamud", role: "Lead ML & NLP Researcher", desc: "Specialized in computational linguistics and Somali language modeling frameworks." },
    { name: "Yazin Mohamud", role: "Full Stack & UI/UX Developer", desc: "Expert in building high-performance web systems and fluid interactive dashboards." },
    { name: "Naima", role: "Data Engineer & Analyst", desc: "Focuses on crime report dataset preprocessing, tokenization, and vectorization." },
    { name: "Najma", role: "Model Evaluation Specialist", desc: "Handles algorithmic benchmarking, hyperparameter tuning, and system metrics testing." }
  ];

  // System features oo lagu dhex daray Home Page-ka
  const systemFeatures = [
    { title: "Somali NLP Engine", desc: "Wuxuu falanqeeyaa qaab-dhismeedka rasmiga ah ee af-Soomaaliga.", icon: <MessageSquare className="h-4 w-4 text-blue-500" /> },
    { title: "AI Crime Classifier", desc: "Si toos ah ayuu u kala saaraa dambiyada kala duwan ee qoraalka ku jira.", icon: <Brain className="h-4 w-4 text-blue-500" /> },
    { title: "Real-time Metrics", desc: "Dashboard muujinaya xogta iyo dhibcaha saxnaanta (accuracy score).", icon: <LayoutGrid className="h-4 w-4 text-blue-500" /> },
    { title: "Secure Data Pipeline", desc: "Ilaalin sare oo la siiyay xogta dambiyada ee xasaasiga ah.", icon: <Shield className="h-4 w-4 text-blue-500" /> }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ================= HEADER SECTION ================= */}
      <header className="w-full bg-[#0a0a0a] border-b border-neutral-800/60 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <Shield className="h-6 w-6 text-blue-500" />
              <span className="absolute -top-1 -right-1 bg-blue-600 text-[10px] font-bold text-white px-1 rounded-md">1</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">Dambi Baare AI</h1>
              <p className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">Somali Intelligence Center</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-3">
            <a href="#home" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm font-medium text-white transition-all">
              <Home className="h-4 w-4 text-neutral-400" />
              Home
            </a>
            <a href="#team" className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-900/50 transition-all">
              <Users className="h-4 w-4 text-neutral-500" />
              Team
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:text-white transition-colors">
              <Sun className="h-4 w-4" />
            </button>
            
            <div className="h-6 w-[1px] bg-neutral-800" />

            
           
            <NavLink to="login">
                <button className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2">
              <LogIn className="h-4 w-4" />
              Log in
          
            </button>
            </NavLink>
            <button className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900/20">
              <UserPlus className="h-4 w-4" />
              Register
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO / HOME SECTION ================= */}
      <main id="home" className="max-w-[1600px] mx-auto px-6 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT SIDE: Heading, Status & Integrated Features */}
          <div className="lg:col-span-7 pt-6">
            {/* Mini Branding */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded-lg bg-blue-950/30 border border-blue-900/40 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-widest text-blue-500 uppercase">Dambi Baare AI</h3>
                <p className="text-xs text-neutral-500">An intelligence workspace with Somali support</p>
              </div>
            </div>

            {/* Offline Alert Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 ${
              modelOnline
                ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-400"
                : "bg-red-950/20 border border-red-900/30 text-red-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${modelOnline ? "bg-emerald-500" : "bg-red-500"}`} />
              {modelInfo.message}
            </div>

            {/* Main Punchline Heading */}
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-2xl mb-12">
              Detect risky text before it slips through.
            </h2>

            {/* INTEGRATED SYSTEM FEATURES GRID */}
            <div className="border-t border-neutral-800/80 pt-10 max-w-3xl">
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-6">System Features & Capabilities</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {systemFeatures.map((feat, idx) => (
                  <div key={idx} className="flex gap-3 p-4 rounded-xl bg-neutral-900/30 border border-neutral-800/40 hover:border-neutral-800 transition-all">
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 h-fit">
                      {feat.icon}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-neutral-200">{feat.title}</h5>
                      <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Live Detection Console */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-neutral-800 bg-[#121212] p-6 shadow-2xl sticky top-28">
              
              {/* Header inside the box */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-5 mb-5">
                <div>
                  <h4 className="text-base font-bold text-white tracking-wide">Live Detection Console</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">Live metadata from /api/model/info</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-black tracking-wider uppercase ${
                  modelOnline
                    ? "bg-emerald-950/40 border border-emerald-900/40 text-emerald-400"
                    : "bg-red-950/40 border border-red-900/40 text-red-400"
                }`}>
                  {statusLabel}
                </span>
              </div>

              {/* Console Items List */}
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#161616] border border-neutral-800/60 hover:border-neutral-700/60 transition-colors">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-blue-500 mt-0.5">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-neutral-200">Signal intake</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">Text, URL, file, and batch sources</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#161616] border border-neutral-800/60 opacity-80">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-yellow-500 mt-0.5">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-neutral-400">ML classifier</h5>
                    <p className={`text-xs font-medium mt-0.5 ${modelOnline ? "text-emerald-400" : "text-red-400"}`}>
                      {modelOnline ? "Model online" : "Model unavailable"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#161616] border border-neutral-800/60 opacity-80">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-emerald-500 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-neutral-400">Crime threshold</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">Unavailable</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#161616] border border-neutral-800/60">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-red-500 mt-0.5">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-neutral-200">Urgent alerts</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">Live, SMS, and email ready</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#161616] border border-neutral-800/60">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-500 mt-0.5">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-neutral-200">Feature count</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">{modelInfo.featureCount} monitored inputs</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <hr className="border-neutral-800/50 max-w-[1600px] mx-auto" />

      {/* ================= TEAM SECTION ================= */}
      <section id="team" className="max-w-[1600px] mx-auto px-6 py-24">
        <div className="flex items-center gap-3 mb-12">
          <Radio className="h-5 w-5 text-blue-500 animate-pulse" />
          <h3 className="text-lg font-bold tracking-wider text-white uppercase">Team 4 Specialists</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => (
            <div key={index} className="p-6 rounded-xl bg-[#121212] border border-neutral-800/60 hover:border-blue-500/30 transition-all duration-300">
              <div className="h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-white tracking-wide">{member.name}</h4>
              <p className="text-xs text-blue-500 font-medium tracking-wide mt-0.5 mb-3">{member.role}</p>
              <p className="text-xs text-neutral-400 leading-relaxed">{member.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
