import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const charts = [
  ["Turbidity vs Time", "turbidity", "NTU", "#08a9bd"],
  ["TDS vs Time", "tds", "ppm", "#2563eb"],
  ["Water Level vs Time", "waterLevel", "%", "#10b981"],
];

function Chart({ title, field, unit, color, data }) {
  return (
    <div className="card p-5">
      <div className="mb-5 flex items-center justify-between"><h3 className="font-bold">{title}</h3><span className="text-xs text-slate-400">{unit}</span></div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#e8eff2" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8292a1" }} tickLine={false} axisLine={false} minTickGap={35} />
            <YAxis tick={{ fontSize: 10, fill: "#8292a1" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dce8eb", fontSize: 12 }} />
            <Line type="monotone" dataKey={field} stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function HistoryCharts({ readings, range, onRangeChange, loading }) {
  const data = readings.map((item) => ({
    ...item,
    label: new Date(item.timestamp).toLocaleString([], range === "24h" ? { hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" }),
  }));
  return (
    <section className="section-space">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Historical intelligence</p><h2 className="section-title">Sensor history</h2></div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {["24h", "7d", "30d"].map((item) => <button key={item} onClick={() => onRangeChange(item)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${range === item ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-50"}`}>{item === "24h" ? "Last 24 Hours" : `Last ${item.slice(0, -1)} Days`}</button>)}
        </div>
      </div>
      {loading ? <div className="card grid h-64 place-items-center text-slate-500">Loading sensor history…</div> : data.length ? <div className="grid gap-5 lg:grid-cols-3">{charts.map((chart) => <Chart key={chart[1]} {...{ title: chart[0], field: chart[1], unit: chart[2], color: chart[3], data }} />)}</div> : <div className="card grid h-40 place-items-center text-slate-500">Sensor data currently unavailable.</div>}
    </section>
  );
}
