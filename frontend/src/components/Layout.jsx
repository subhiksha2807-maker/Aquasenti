import { Activity, Droplets, FlaskConical } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f4f9fa] text-ink">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-white shadow-lg shadow-cyan-900/15"><Droplets size={22} /></span>
            <span><b className="block text-lg tracking-tight">AquaSentinel</b><small className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400 sm:block">Water intelligence</small></span>
          </NavLink>
          <nav className="flex items-center gap-1 text-sm font-semibold text-slate-600">
            <NavLink className="nav-link" to="/">Home</NavLink>
            <a className="nav-link hidden sm:block" href="/#about">About System</a>
            <NavLink className="nav-link" to="/admin/demo"><span className="hidden sm:inline">Admin / </span>Demo</NavLink>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© 2026 AquaSentinel · Maintenance intelligence for public infrastructure.</span>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700"><Activity size={14} /> FastAPI + SQLite</span>
        </div>
      </footer>
    </div>
  );
}
