import { AlertTriangle, Clock3, MapPin, Radio, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Loading from '../components/Loading'
import PredictionPanel from '../components/PredictionPanel'
import SensorCard from '../components/SensorCard'
import SensorHistory from '../components/SensorHistory'
import TankQr from '../components/TankQr'
import { useTank } from '../hooks/useTank'

const formatDate = value => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : 'Not available'
const formatDateTime = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : 'Not available'

export default function TankPage() {
  const { tankId = '' } = useParams()
  const { tank, loading, error, live } = useTank(tankId)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (loading) return <Loading />
  if (error) return <div className="page-message"><AlertTriangle /><h1>Tank data unavailable</h1><p>{error}</p><Link to="/">Return to tank search</Link></div>
  if (!tank) return <div className="page-message"><AlertTriangle /><h1>Tank not found</h1><p>Tank not found. Please check the Tank ID.</p><Link to="/">Return to tank search</Link></div>

  const { metadata = {}, latest: rawLatest, readings = [], prediction } = tank
  const latest = rawLatest || {}
  const offlineMinutes = Number(import.meta.env.VITE_SENSOR_OFFLINE_MINUTES || 30)
  const ageMinutes = Math.max(0, Math.floor((now - new Date(latest.timestamp).getTime()) / 60_000))
  const offline = !latest.timestamp || ageMinutes > offlineMinutes
  return <div className="tank-page">
    <section className="tank-banner">
      <div><div className="breadcrumb"><Link to="/">Tank Search</Link><span>/</span><b>{tankId}</b></div><div className="tank-title-row"><div><p className="kicker">TANK DASHBOARD</p><h1>{metadata.tankName || tankId}</h1><p className="tank-location"><MapPin size={17} /> {metadata.locality || 'Locality unavailable'}, {metadata.district || 'District unavailable'}</p></div><div className="tank-actions"><span className={`connection-badge ${offline ? 'offline' : ''}`}><Radio size={16} />{offline ? 'Sensor Offline' : 'Receiving Data'}</span><TankQr tankId={tankId} /></div></div></div>
    </section>

    {offline && <div className="offline-alert"><AlertTriangle /><div><strong>ESP32 / Sensor Unit Offline</strong><span>{latest.timestamp ? `Last reading received ${ageMinutes} minutes ago (${formatDateTime(latest.timestamp)}).` : 'No sensor reading has been received.'}</span></div></div>}

    <section className="metadata-strip"><div><span>Tank ID</span><strong>{metadata.tankId || tankId}</strong></div><div><span>Last cleaned</span><strong>{formatDate(metadata.lastCleanedDate)}</strong></div><div><span>Last sensor update</span><strong>{formatDateTime(latest.timestamp)}</strong></div><div><span>Coordinates</span><strong>{metadata.latitude && metadata.longitude ? `${metadata.latitude}, ${metadata.longitude}` : 'Not available'}</strong></div></section>

    <section className="section-block readings-section"><div className="section-heading"><div><p className="kicker">CURRENT CONDITIONS</p><h2>Latest Sensor Readings</h2><p>Most recent values received from the tank sensor unit.</p></div><span className="updated-label"><RotateCw size={15} /> {live ? 'WebSocket connected' : 'Reconnecting live updates…'}</span></div><div className="sensor-grid"><SensorCard type="turbidity" value={latest.turbidity} /><SensorCard type="tds" value={latest.tds} /><SensorCard type="waterLevel" value={latest.waterLevel} /></div><div className="safety-note"><Clock3 size={18} /><span><strong>Condition-monitoring data only.</strong> Sensor readings support maintenance prioritization and do not replace laboratory water-quality testing. Status badges use demo maintenance thresholds.</span></div></section>
    <PredictionPanel prediction={prediction} pending={false} error={null} />
    <SensorHistory readings={readings} />
  </div>
}
