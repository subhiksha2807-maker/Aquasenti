import { CheckCircle2, FlaskConical, Send, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function DemoPage() {
  const [form, setForm] = useState({ tankId: "TN-TANK-001", turbidity: 50, tds: 330, waterLevel: 62 });
  const [state, setState] = useState({ loading: false, error: "", result: null });
  const update = (key) => (e) => setForm({ ...form, [key]: key === "tankId" ? e.target.value : Number(e.target.value) });
  async function submit(e) {
    e.preventDefault(); setState({ loading: true, error: "", result: null });
    try { setState({ loading: false, error: "", result: await api.sendDemoReading({ ...form, tankId: form.tankId.trim().toUpperCase() }) }); }
    catch (err) { setState({ loading: false, error: err.message, result: null }); }
  }
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
        <div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-800"><FlaskConical /></span><p className="eyebrow mt-7">Local testing utility</p><h1 className="mt-2 text-4xl font-bold tracking-tight">Demo Sensor Simulator</h1><p className="mt-5 leading-7 text-slate-500">Send a simulated field reading through the exact same ingestion, database, prediction, and live-update flow used by an ESP32.</p><div className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><TriangleAlert className="mt-0.5 shrink-0" size={19} /><p><b>This is simulated test data.</b><br />Use it only for local development and demonstrations.</p></div></div>
        <form onSubmit={submit} className="card p-6 sm:p-8">
          <div className="grid gap-5"><Field label="Tank ID"><select value={form.tankId} onChange={update("tankId")}><option>TN-TANK-001</option><option>TN-TANK-002</option><option>TN-TANK-003</option></select></Field><div className="grid gap-5 sm:grid-cols-3"><Field label="Turbidity" suffix="NTU"><input type="number" min="0" max="4000" step="0.1" required value={form.turbidity} onChange={update("turbidity")} /></Field><Field label="TDS" suffix="ppm"><input type="number" min="0" max="10000" step="0.1" required value={form.tds} onChange={update("tds")} /></Field><Field label="Water level" suffix="%"><input type="number" min="0" max="100" step="0.1" required value={form.waterLevel} onChange={update("waterLevel")} /></Field></div></div>
          <button disabled={state.loading} className="primary-btn mt-7 h-13 w-full">{state.loading ? "Sending reading…" : "Send Demo Reading"}<Send size={17} /></button>
          {state.error && <p className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{state.error}</p>}
          {state.result && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} /> Reading saved successfully</div><p className="mt-2">Prediction: {state.result.prediction.maintenanceStatus} · ~{state.result.prediction.predictedDays} days</p><Link className="mt-3 inline-block font-bold underline" to={`/tank/${state.result.tankId}`}>Open live dashboard →</Link></div>}
        </form>
      </div>
      <div className="mt-14 grid gap-3 sm:grid-cols-4">{["Reading validated", "Stored in SQLite", "ML prediction run", "Dashboard broadcast"].map((item, i) => <div key={item} className="rounded-2xl bg-white p-5 text-sm font-semibold shadow-sm"><span className="mb-3 block text-xs font-bold text-cyan-700">0{i + 1}</span>{item}</div>)}</div>
    </div>
  );
}
function Field({ label, suffix, children }) { return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span><span className="relative block">{children}{suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{suffix}</span>}</span></label>; }
