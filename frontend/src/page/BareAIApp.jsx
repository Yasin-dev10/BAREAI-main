import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  Eye,
  FileSearch,
  LockKeyhole,
  LogIn,
  Menu,
  Radio,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import heroImage from "../assets/hero.png";

export default function BareAIApp() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: "Platform", href: "#platform" },
    { label: "Workflow", href: "#workflow" },
    { label: "Team", href: "#team" },
  ];

  const platformStats = [
    { value: "24/7", label: "Signal monitoring" },
    { value: "3", label: "Role workspaces" },
    { value: "AI", label: "Language analysis" },
  ];

  const capabilities = [
    {
      icon: BrainCircuit,
      title: "AI Text Analysis",
      text: "Classify incoming reports, detect risk patterns, and support Somali-language intelligence review.",
    },
    {
      icon: ClipboardList,
      title: "Case Operations",
      text: "Move validated incidents into investigation queues with owners, status, and action history.",
    },
    {
      icon: BellRing,
      title: "Priority Alerts",
      text: "Surface blacklist matches and new activity so investigators can respond before context is lost.",
    },
    {
      icon: LockKeyhole,
      title: "Secure Access",
      text: "Keep sensitive workflows behind role-based access for admins, investigators, and analysts.",
    },
  ];

  const workflow = [
    {
      icon: FileSearch,
      title: "Review",
      text: "Analyze reports and monitored content through a focused intelligence workspace.",
    },
    {
      icon: DatabaseZap,
      title: "Enrich",
      text: "Connect history, blacklist records, and model output into a clearer operational picture.",
    },
    {
      icon: Eye,
      title: "Investigate",
      text: "Assign cases, track evidence, and keep investigative movement visible to authorized teams.",
    },
  ];

  const teamMembers = [
    {
      name: "Nasteha Mohamud",
      role: "Lead ML & NLP Researcher",
      desc: "Builds language modeling approaches for Somali crime report analysis.",
    },
    {
      name: "Yazin Mohamud",
      role: "Full Stack & UI/UX Developer",
      desc: "Designs the secure product experience and operational dashboard flows.",
    },
    {
      name: "Naima",
      role: "Data Engineer & Analyst",
      desc: "Prepares datasets, feature pipelines, and reporting structures for model use.",
    },
    {
      name: "Najma",
      role: "Model Evaluation Specialist",
      desc: "Tests model quality, tuning decisions, and measurable system performance.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f2] text-[#111827] antialiased selection:bg-[#0f766e] selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#111827]/88 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-teal-200 text-[#111827] shadow-sm">
              <Shield className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black tracking-wide ">BAREAI</span>
              <span className="block truncate text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200">
                Crime Intelligence Platform
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </NavLink>
            <NavLink
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-black text-[#062b2a] shadow-sm transition hover:bg-teal-300"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </NavLink>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#111827] px-4 py-4 md:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <NavLink
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </NavLink>
                <NavLink
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-black text-[#062b2a]"
                >
                  <UserPlus className="h-4 w-4" />
                  Register
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="home">
        <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-[#111827] pt-16 text-white">
          <img
            src={heroImage}
            alt="BAREAI intelligence workspace"
            className="absolute inset-0 h-full w-full object-cover opacity-28"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.96)_0%,rgba(17,24,39,0.86)_42%,rgba(15,118,110,0.48)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f6f7f2] to-transparent" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:pb-20">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-100 backdrop-blur">
                <Radio className="h-4 w-4 text-[#f59e0b]" />
                Intelligence ready
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-7xl">
                BAREAI
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                A secure crime intelligence platform for report analysis, blacklist monitoring,
                investigation workflows, and operational decision support.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <NavLink
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg text-teal-200 px-5 py-3 text-sm font-black text-[#111827] shadow-lg shadow-black/20 transition hover:bg-amber-300"
                >
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </NavLink>
                <NavLink
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Request access
                  <UserPlus className="h-4 w-4" />
                </NavLink>
              </div>
            </div>

            <div className="self-end rounded-lg border border-white/15 bg-[#111827]/82 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/[0.16] text-teal-200">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black">Operational Snapshot</p>
                  <p className="text-xs text-slate-400">Built for secure field intelligence.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {platformStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-white/[0.08] p-3">
                    <p className="text-lg font-black text-teal-200">{stat.value}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="platform" className="bg-[#f6f7f2] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f766e]">
                Platform
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#111827] sm:text-4xl">
                One workspace for intelligence teams.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                BAREAI brings report analysis, alerts, cases, history, and user controls into a
                focused system designed for secure daily operations.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-lg border border-[#d7ddd2] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e7f4ef] text-[#0f766e]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-base font-black text-[#111827]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="bg-[#111827] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">
                  Workflow
                </p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  From raw signals to accountable cases.
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  The system supports the full flow from incoming text and monitored accounts to
                  investigation records, alerts, and decision-ready reports.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {workflow.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-400/[0.14] text-teal-200">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-xs font-black text-slate-500">
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="mt-5 text-base font-black">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
            {[
              "Role-based dashboards",
              "Case and report history",
              "Blacklist activity tracking",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0f766e]" />
                <p className="text-sm font-black text-[#111827]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="team" className="bg-[#eef1e9] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0f766e]">
                  Team
                </p>
                <h2 className="mt-3 text-3xl font-black text-[#111827] sm:text-4xl">
                  Built by specialists across AI, data, and product.
                </h2>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#d4d9cf] bg-white px-3 py-2 text-sm font-bold text-slate-700">
                <BadgeCheck className="h-4 w-4 text-[#0f766e]" />
                Team 4 Specialists
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {teamMembers.map((member) => (
                <article key={member.name} className="rounded-lg border border-[#d4d9cf] bg-white p-5 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#111827] text-amber-300">
                    <Users className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-black text-[#111827]">{member.name}</h3>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#0f766e]">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{member.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
