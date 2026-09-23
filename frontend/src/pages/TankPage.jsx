import { Activity, AlertTriangle, CalendarDays, Clock3, CloudOff, Droplet, FlaskConical, Gauge, MapPin, QrCode, Radio, Sparkles, Waves, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import HistoryCharts from "../components/HistoryCharts";
import SensorCard from "../components/SensorCard";
import StatusPill from "../components/StatusPill";
import { useTankSocket } from "../hooks/useTankSocket";
import { api } from "../services/api";

const dateFormat = (value, withTime = false) => value ? new Intl.DateTimeFormat("en-IN", withTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "Unavailable";

function elapsed(value) {
  if (!value) return "No updates received";
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function TankPage() {
  const { tankId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [readings, setReadings] = useState([]);
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const refreshHistory = useCallback(() => api.readings(tankId, range).then(setReadings).catch(() => setReadings([])).finally(() => setHistoryLoading(false)), [tankId, range]);
  useEffect(() => { setLoading(true); api.dashboard(tankId).then(setDashboard).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [tankId]);
  useEffect(() => { setHistoryLoading(true); refreshHistory(); }, [refreshHistory]);
  const socketConnected = useTankSocket(tankId, (update) => { setDashboard((current) => current ? { ...current, latestReading: update.latestReading, prediction: update.prediction } : current); refreshHistory(); });

  if (loading) return <div className="grid min-h-[70vh] place-items-center"><div className="text-center"><Waves className="mx-auto animate-pulse text-cyan-600" size={40} /><p className="mt-4 text-sm text-slate-500">Loading tank intelligence…</p></div></div>;
  if (error) return <div className="mx-auto grid min-h-[70vh] max-w-lg place-items-center px-5 text-center"><div><AlertTriangle className="mx-auto text-amber-500" size={48} /><h1 className="mt-5 text-2xl font-bold">Tank dashboard unavailable</h1><p className="mt-2 text-slate-500">{error}</p></div></div>;

  const { tank, latestReading: latest, prediction } = dashboard;
  const ageMinutes = latest ? (Date.now() - new Date(latest.timestamp).getTime()) / 60000 : Infinity;
  const offline = ageMinutes > (dashboard.offlineAfterMinutes ?? 30);
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">{tank.tankId}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${offline ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />{offline ? "Sensor Unit Offline" : "Sensor Unit Online"}</span></div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tank.tankName}</h1><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><MapPin size={16} />{tank.locality}, {tank.district}</p></div>
        <button onClick={() => setQrOpen(true)} className="secondary-btn"><QrCode size={18} /> Generate tank QR</button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Info icon={CalendarDays} label="Last cleaning date" value={dateFormat(tank.lastCleanedDate)} />
        <Info icon={Clock3} label="Last sensor update" value={latest ? dateFormat(latest.timestamp, true) : "No reading"} sub={latest && elapsed(latest.timestamp)} />
        <Info icon={socketConnected ? Radio : CloudOff} label="Live connection" value={socketConnected ? "WebSocket connected" : "Reconnecting…"} />
      </div>

      <section className="section-space"><div className="mb-6"><p className="eyebrow">Current condition</p><h2 className="section-title">Latest sensor readings</h2></div><div className="grid gap-5 md:grid-cols-3"><SensorCard icon={Waves} label="Turbidity" value={latest?.turbidity} unit="NTU" description="Measures suspended particles and cloudiness." accent="bg-cyan-50 text-cyan-700" /><SensorCard icon={FlaskConical} label="Total dissolved solids" value={latest?.tds} unit="ppm" description="Measures total dissolved solids." accent="bg-blue-50 text-blue-700" /><SensorCard icon={Gauge} label="Water level" value={latest?.waterLevel} unit="%" description="Shows current tank water level." accent="bg-emerald-50 text-emerald-700" /></div><p className="mt-5 text-xs leading-5 text-slate-500">Sensor readings are intended for monitoring and maintenance prioritization and do not replace laboratory water-quality testing.</p></section>

      <section className="section-space overflow-hidden rounded-3xl bg-ink text-white shadow-xl shadow-slate-900/10"><div className="grid lg:grid-cols-[.9fr_1.1fr]"><div className="relative overflow-hidden p-8 sm:p-10"><div className="orb -left-32 -top-32 h-80 w-80 bg-cyan-400/20" /><div className="relative"><p className="eyebrow !text-cyan-300">AI-assisted outlook</p><h2 className="mt-2 text-3xl font-bold tracking-tight">AI Tank Maintenance Prediction</h2><p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">A data-led estimate to help operations teams prioritize inspections and cleaning schedules.</p><div className="mt-8"><StatusPill status={prediction?.maintenanceStatus} /></div></div></div><div className="grid gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3"><Metric label="Days until cleaning" value={prediction ? `~${prediction.predictedDays} days` : "Unavailable"} /><Metric label="Predicted date" value={prediction ? dateFormat(prediction.predictedCleaningDate) : "Unavailable"} /><Metric label="Generated" value={prediction ? dateFormat(prediction.generatedAt, true) : "Unavailable"} /></div></div><p className="mt-4 px-2 text-xs leading-5 text-slate-500"><Sparkles className="mr-1 inline" size={13} /> Demonstration prediction only. It is not a guarantee of water safety or a substitute for professional inspection and validated testing.</p></section>

      <HistoryCharts {...{ readings, range, loading: historyLoading }} onRangeChange={setRange} />
      {qrOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm" onClick={() => setQrOpen(false)}><div className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}><button aria-label="Close" onClick={() => setQrOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"><X /></button><QRCodeSVG className="mx-auto" value={window.location.href} size={210} level="H" marginSize={2} /><h3 className="mt-6 text-xl font-bold">{tank.tankId}</h3><p className="mt-2 text-sm text-slate-500">Scan to open this tank dashboard directly.</p></div></div>}
    </div>
  );
}

function Info({ icon: Icon, label, value, sub }) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-cyan-700"><Icon size={18} /></span><span className="min-w-0"><small className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</small><b className="mt-1 block truncate text-sm">{value}</b>{sub && <small className="text-slate-400">Updated {sub}</small>}</span></div>; }
function Metric({ label, value }) { return <div className="flex min-h-32 flex-col justify-center bg-[#0b2a3e] p-7"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{label}</span><b className="mt-2 text-xl">{value}</b></div>; }
