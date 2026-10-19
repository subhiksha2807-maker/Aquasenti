import { Beaker, Database, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTanks, sendReading } from '../services/api'

export default function DemoPage() {
  const [ids, setIds] = useState([])
  const [form, setForm] = useState({ tankId: 'TN-TANK-001', turbidity: 38.4, tds: 276.2, waterLevel: 74 })
  const [state, setState] = useState({ sending: false, message: '', error: false })
  useEffect(() => { getTanks().then(tanks => setIds(tanks.map(tank => tank.tankId))).catch(() => setIds(['TN-TANK-001', 'TN-TANK-002', 'TN-TANK-003'])) }, [])
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = async e => {
    e.preventDefault(); setState({ sending: true, message: '', error: false })
    try {
      await sendReading({ tankId: form.tankId, turbidity: Number(form.turbidity), tds: Number(form.tds), waterLevel: Number(form.waterLevel) })
      setState({ sending: false, message: 'Demo reading sent. The dashboard and AI prediction will update automatically.', error: false })
    } catch (err) { setState({ sending: false, message: err.message || 'Could not send reading.', error: true }) }
  }
  return <div className="content-page demo-page"><div className="page-header"><p className="kicker">ADMIN / TESTING TOOL</p><h1>Demo Sensor Simulator</h1><p>Send a clearly labelled calibrated-format reading through the same endpoint used by the ESP32.</p></div><div className="demo-layout"><form className="simulator-card" onSubmit={submit}><div className="simulator-title"><span><Beaker /></span><div><h2>New simulated reading</h2><p>This is not a physical sensor measurement.</p></div></div><label>Tank ID<select name="tankId" value={form.tankId} onChange={change}>{ids.map(id => <option key={id}>{id}</option>)}</select></label><div className="input-grid"><label>Turbidity <span>NTU</span><input name="turbidity" type="number" min="0" max="1000" step="0.1" required value={form.turbidity} onChange={change} /></label><label>TDS <span>ppm</span><input name="tds" type="number" min="0" max="5000" step="0.1" required value={form.tds} onChange={change} /></label><label>Water level <span>%</span><input name="waterLevel" type="number" min="0" max="100" step="0.1" required value={form.waterLevel} onChange={change} /></label></div><button className="primary-button full" disabled={state.sending}><Send size={18} />{state.sending ? 'Sending…' : 'Send Demo Reading'}</button>{state.message && <div className={`form-message ${state.error ? 'error' : ''}`}>{state.message}{!state.error && <Link to={`/tank/${form.tankId}`}>Open dashboard →</Link>}</div>}</form><aside className="demo-info"><Database /><h2>FastAPI + SQLite</h2><p>The simulator calls the protected sensor-ingestion REST endpoint. Use the same development API key in the backend and frontend environment files.</p><h3>Automatic flow</h3><ol><li>FastAPI validates and stores the reading in SQLite.</li><li>Seven-day trends are calculated.</li><li>The trained Random Forest model runs.</li><li>The prediction is stored historically.</li><li>A WebSocket event refreshes the open dashboard.</li></ol><p className="caution">Measurements must already be calibrated; raw ADC values are not NTU or ppm.</p></aside></div></div>
}
