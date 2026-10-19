import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const ranges = [{ label: 'Last 24 Hours', days: 1 }, { label: 'Last 7 Days', days: 7 }, { label: 'Last 30 Days', days: 30 }]
const charts = [
  { key: 'turbidity', title: 'Turbidity vs Time', color: '#0ea5e9', unit: 'NTU' },
  { key: 'tds', title: 'TDS vs Time', color: '#0891b2', unit: 'ppm' },
  { key: 'waterLevel', title: 'Water Level vs Time', color: '#2563eb', unit: '%' },
]

function Chart({ config, data }) {
  return <article className="chart-card">
    <div className="chart-title"><h3>{config.title}</h3><span>{config.unit}</span></div>
    <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 6" stroke="#dbeafe" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={26} />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={['auto', 'auto']} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dbeafe' }} formatter={value => [`${value} ${config.unit}`, config.title.split(' vs')[0]]} />
        <Line type="monotone" dataKey={config.key} stroke={config.color} strokeWidth={3} dot={data.length < 10} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer></div>
  </article>
}

export default function SensorHistory({ readings = {} }) {
  const [days, setDays] = useState(7)
  const [now] = useState(() => Date.now())
  const data = useMemo(() => {
    const cutoff = now - days * 86_400_000
    return Object.values(readings).filter(r => new Date(r.timestamp).getTime() >= cutoff).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(r => ({
      ...r,
      label: new Intl.DateTimeFormat('en-IN', days === 1 ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short' }).format(new Date(r.timestamp)),
    }))
  }, [readings, days, now])
  return <section className="section-block" id="history">
    <div className="section-heading"><div><p className="kicker">LIVE HISTORY</p><h2>Sensor History</h2><p>Graphs update automatically when a reading is received.</p></div><div className="range-tabs">{ranges.map(r => <button key={r.days} className={days === r.days ? 'selected' : ''} onClick={() => setDays(r.days)}>{r.label}</button>)}</div></div>
    {data.length ? <div className="charts-grid">{charts.map(c => <Chart key={c.key} config={c} data={data} />)}</div> : <div className="empty-panel">No readings are available for this time range.</div>}
  </section>
}
