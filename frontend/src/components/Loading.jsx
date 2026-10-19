export default function Loading({ label = 'Loading tank data…' }) {
  return <div className="loading-state"><span className="spinner" /><p>{label}</p></div>
}
