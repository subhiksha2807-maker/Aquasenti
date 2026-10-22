import { ArrowRight, BarChart3, BrainCircuit, Radio, Search, ShieldCheck, Waves } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function HomePage() {
  const [tankId, setTankId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    const normalized = tankId.trim().toUpperCase();
    if (!normalized) return setError("Enter a Tank ID to continue.");
    setLoading(true); setError("");
    try { await api.tank(normalized); navigate(`/tank/${encodeURIComponent(normalized)}`); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="hero-grid absolute inset-0 opacity-30" />
        <div className="orb -right-32 -top-52 h-[34rem] w-[34rem] bg-cyan-400/20" />
        <div className="orb -bottom-80 -left-40 h-[38rem] w-[38rem] bg-blue-500/20" />
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.15fr_.85fr] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-200"><Waves size={15} /> AI-powered tank monitoring</div>
            <h1 className="text-5xl font-semibold leading-[1.03] tracking-[-.045em] sm:text-6xl lg:text-7xl">Know your tank.<br /><span className="text-cyan-300">Protect every drop.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">Live sensor visibility and AI-assisted maintenance prioritization for public water infrastructure—all in one clear dashboard.</p>
            <form onSubmit={submit} className="mt-10 max-w-2xl rounded-2xl border border-white/10 bg-white p-2 shadow-2xl shadow-black/25 sm:flex">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-4"><Search className="shrink-0 text-cyan-600" size={20} /><input value={tankId} onChange={(e) => setTankId(e.target.value)} className="h-14 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400" placeholder="Enter Tank ID – Example: TN-TANK-001" /></label>
              <button disabled={loading} className="primary-btn h-14 w-full sm:w-auto">{loading ? "Checking…" : "Check Tank"}<ArrowRight size={17} /></button>
            </form>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-400"><span>Try TN-TANK-001</span><span>•</span><span>Live WebSocket updates</span><span>•</span><span>Local-first data</span></div>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative mx-auto aspect-square max-w-md rounded-full border border-cyan-300/15 bg-gradient-to-b from-cyan-300/10 to-transparent p-12">
              <div className="absolute inset-12 rounded-full border border-dashed border-cyan-200/20 animate-[spin_30s_linear_infinite]" />
              <div className="relative grid h-full place-items-center rounded-full border border-white/10 bg-[#0b2b40]/80 shadow-2xl">
                <div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-cyan-300 text-ink shadow-xl shadow-cyan-400/20"><Waves size={42} /></div><b className="mt-5 block text-2xl">System online</b><span className="mt-1 block text-sm text-slate-400">Monitoring 3 demo tanks</span></div>
              </div>
              {["top-8 left-12", "right-2 top-1/2", "bottom-8 left-16"].map((pos, i) => <span key={pos} className={`absolute ${pos} h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_25px_6px_rgba(103,232,249,.35)]`} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">One connected system</p><h2 className="section-title text-4xl">From sensor signal to maintenance action.</h2><p className="mt-4 leading-7 text-slate-500">AquaSentinel turns continuous field data into an accessible operational view for teams responsible for public tanks.</p></div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            [Radio, "Monitor continuously", "Capture turbidity, total dissolved solids, and water-level readings from each connected unit."],
            [BarChart3, "See patterns early", "Review historical signals across 24-hour, 7-day, and 30-day windows."],
            [BrainCircuit, "Prioritize maintenance", "Use a demonstration ML model to help rank inspection and cleaning needs."],
          ].map(([Icon, title, text], i) => <article key={title} className="card p-8"><span className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-mist text-cyan-700"><Icon /></span><span className="text-xs font-bold text-cyan-700">0{i + 1}</span><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-500">{text}</p></article>)}
        </div>
        <div className="mt-16 flex items-start gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-6 text-sm leading-6 text-sky-900"><ShieldCheck className="mt-0.5 shrink-0" /><p><b>Designed for maintenance decisions—not potability certification.</b> Actual drinking-water safety requires appropriate, validated laboratory testing.</p></div>
      </section>
    </>
  );
}
