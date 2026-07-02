import { Shield, Home, Users, Sun, LogIn, UserPlus, Radio, CheckCircle2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import heroImage from '../assets/hero.png';

export default function BareAIApp() {
  // Team data 
  const teamMembers = [
    { name: "Nasteha Mohamud", role: "Lead ML & NLP Researcher", desc: "Specialized in computational linguistics and Somali language modeling frameworks." },
    { name: "Yazin Mohamud", role: "Full Stack & UI/UX Developer", desc: "Expert in building high-performance web systems and fluid interactive dashboards." },
    { name: "Naima", role: "Data Engineer & Analyst", desc: "Focuses on crime report dataset preprocessing, tokenization, and vectorization." },
    { name: "Najma", role: "Model Evaluation Specialist", desc: "Handles algorithmic benchmarking, hyperparameter tuning, and system metrics testing." }
  ];

  const highlights = [
    "Somali NLP support",
    "Secure access control",
    "Role-based investigation workspace"
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

            
           
            <NavLink to="/login">
              <button className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2">
              <LogIn className="h-4 w-4" />
              Log in
          
            </button>
            </NavLink>
            <NavLink to="/register" className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-4 py-2 border border-neutral-800 rounded-lg bg-neutral-900/20">
              <UserPlus className="h-4 w-4" />
              Register
            </NavLink>
          </div>
        </div>
      </header>

      {/* ================= HERO / HOME SECTION ================= */}
      <main id="home" className="max-w-[1600px] mx-auto px-6 pt-14 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT SIDE: Heading and focused actions */}
          <div className="lg:col-span-7 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 rounded-lg bg-blue-950/30 border border-blue-900/40 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-widest text-blue-500 uppercase">Dambi Baare AI</h3>
                <p className="text-xs text-neutral-500">An intelligence workspace with Somali support</p>
              </div>
            </div>

            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] max-w-3xl mb-6">
              Dambi Baare AI
            </h2>
            <p className="max-w-2xl text-base sm:text-lg leading-8 text-neutral-400 mb-8">
              A clean, secure workspace for Somali-language crime intelligence teams.
              Sign in to continue to the protected tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <NavLink to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500">
                <LogIn className="h-4 w-4" />
                Log in
              </NavLink>
              <NavLink to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-5 py-3 text-sm font-bold text-neutral-200 transition-colors hover:bg-neutral-900 hover:text-white">
                <UserPlus className="h-4 w-4" />
                Register
              </NavLink>
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-800/80 pt-8 text-sm text-neutral-400 sm:flex-row sm:flex-wrap">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: Brand visual only, no analysis panel */}
          <div className="lg:col-span-5">
            <div className="flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-[#101010] p-8">
              <img
                src={heroImage}
                alt="Dambi Baare AI secure workspace visual"
                className="h-auto w-full max-w-sm object-contain"
              />
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
