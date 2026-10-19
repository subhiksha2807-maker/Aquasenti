import { BrainCircuit, CalendarClock, Clock3, ShieldAlert } from 'lucide-react'

const formatDate = value => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : 'Not available'
const formatDateTime = value => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not available'

export default function PredictionPanel({ prediction, pending, error }) {
  return <section className="prediction-panel" id="prediction">
    <div className="prediction-intro"><span className="prediction-icon"><BrainCircuit /></span><p className="kicker">DEMO RANDOM FOREST MODEL</p><h2>AI Tank Maintenance Prediction</h2><p>Uses current readings, cleaning age, and recent sensor trends to prioritize inspection and cleaning.</p><div className="prediction-warning"><ShieldAlert size={18} /> This recommendation does not guarantee water safety.</div></div>
    <div className="prediction-results">
      {pending && <p className="inline-loading"><span className="spinner" /> Recalculating from the latest reading…</p>}
      {error && !prediction && <div className="alert warning">AI prediction temporarily unavailable. {error}</div>}
      {prediction ? <>
        <div className="status-row"><span>Current maintenance status</span><strong className={`maintenance-status ${String(prediction.maintenanceStatus).toLowerCase().replaceAll(' ', '-')}`}>{prediction.maintenanceStatus}</strong></div>
        <div className="days-value"><span>Recommended inspection / cleaning</span><strong>{prediction.predictedDays}</strong><em>days</em><p>Within approximately {prediction.predictedDays} {prediction.predictedDays === 1 ? 'day' : 'days'}</p></div>
        <div className="prediction-dates"><div><CalendarClock /><span>Predicted date<strong>{formatDate(prediction.predictedCleaningDate)}</strong></span></div><div><Clock3 /><span>Generated at<strong>{formatDateTime(prediction.generatedAt)}</strong></span></div></div>
        {error && <p className="stale-note">Showing the most recently saved prediction because the AI service is unavailable.</p>}
      </> : !pending && !error ? <div className="empty-panel">No prediction is available yet.</div> : null}
    </div>
  </section>
}
