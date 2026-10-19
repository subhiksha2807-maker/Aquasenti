import { ArrowRight, BarChart3, BrainCircuit, Radio, Search, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tankExists } from '../services/api'

export default function HomePage() {
  const [tankId, setTankId] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()
  const submit = async e => {
    e.preventDefault()
    const normalized = tankId.trim().toUpperCase()
    if (!normalized) return setError('Please enter a Tank ID.')
    setChecking(true); setError('')
    try {
      if (await tankExists(normalized)) navigate(`/tank/${encodeURIComponent(normalized)}`)
      else setError('Tank not found. Please check the Tank ID.')
    } catch { setError('Tank lookup is temporarily unavailable. Please try again.') }
    finally { setChecking(false) }
  }
  return <>
    <section className="hero">
      <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
      <div className="hero-content"><div className="public-label"><ShieldCheck size={16} /> Public infrastructure monitoring</div><h1>Know your tank.<br /><span>Protect every drop.</span></h1><p className="hero-subtitle">AI-Powered Public Water Tank Monitoring</p><p className="hero-copy">Real-time sensor visibility and predictive maintenance intelligence for cleaner, more reliable public water infrastructure.</p>
        <form className="search-box" onSubmit={submit}><Search /><input aria-label="Tank ID" value={tankId} onChange={e => setTankId(e.target.value)} placeholder="Enter Tank ID – Example: TN-TANK-001" /><button disabled={checking}>{checking ? 'Checking…' : 'Check Tank'}<ArrowRight size={18} /></button></form>
        {error && <div className="search-error">{error}</div>}
        <p className="try-demo">Try a sample: {['TN-TANK-001', 'TN-TANK-002', 'TN-TANK-003'].map(id => <button key={id} onClick={() => setTankId(id)}>{id}</button>)}</p>
      </div>
      <div className="hero-dashboard" aria-hidden="true"><div className="tank-visual"><div className="water-fill"><span /><span /></div><div className="tank-label"><b>74%</b><span>Current level</span></div></div><div className="floating-stat stat-one"><span><Radio /></span><div><small>Sensor unit</small><b>Online</b></div></div><div className="floating-stat stat-two"><span><BrainCircuit /></span><div><small>AI prediction</small><b>4 days</b></div></div><div className="floating-stat stat-three"><span><BarChart3 /></span><div><small>Live reading</small><b>38.4 NTU</b></div></div></div>
    </section>
    <section className="how-it-works"><p className="kicker">ONE CONNECTED SYSTEM</p><h2>From field sensor to informed action</h2><div className="steps">{[['01', 'Monitor', 'Calibrated sensors capture tank-condition readings.'], ['02', 'Connect', 'ESP32 securely posts readings to FastAPI.'], ['03', 'Understand', 'SQLite history becomes a clear live dashboard.'], ['04', 'Prioritize', 'The demo ML model estimates the next inspection window.']].map(([n, t, d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
  </>
}
