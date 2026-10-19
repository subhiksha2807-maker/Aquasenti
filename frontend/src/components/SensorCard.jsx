import { Droplets, Gauge, Waves } from 'lucide-react'
import { getSensorStatus } from '../config/sensorThresholds'

const details = {
  turbidity: { label: 'Turbidity', unit: 'NTU', description: 'Measures suspended particles and cloudiness in water.', Icon: Waves },
  tds: { label: 'Total Dissolved Solids', unit: 'ppm', description: 'Measures total dissolved solids present in water.', Icon: Droplets },
  waterLevel: { label: 'Water Level', unit: '%', description: 'Shows the approximate amount of water currently available in the tank.', Icon: Gauge },
}

export default function SensorCard({ type, value }) {
  const { label, unit, description, Icon } = details[type]
  const status = getSensorStatus(type, value)
  const progress = type === 'waterLevel' ? Math.max(0, Math.min(100, Number(value) || 0)) : Math.max(5, Math.min(100, type === 'turbidity' ? value * 1.25 : value / 5))
  return <article className="sensor-card">
    <div className="sensor-card-head"><span className={`sensor-icon ${type}`}><Icon /></span><span className={`status-badge ${status.toLowerCase()}`}>{status}</span></div>
    <p className="eyebrow">{label}</p>
    <div className="reading">{value ?? '—'} <span>{unit}</span></div>
    <div className="progress"><i style={{ width: `${progress}%` }} /></div>
    <p className="sensor-description">{description}</p>
  </article>
}
