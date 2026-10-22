export default function SensorCard({ icon: Icon, label, value, unit, description, accent }) {
  return (
    <article className="card group overflow-hidden p-6">
      <div className="mb-8 flex items-start justify-between">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${accent}`}><Icon size={21} /></span>
        <span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Live reading</span>
      </div>
      <div className="flex items-end gap-2"><strong className="text-4xl tracking-tight text-ink">{value ?? "—"}</strong><span className="mb-1 font-semibold text-slate-400">{value == null ? "" : unit}</span></div>
      <h3 className="mt-4 font-bold">{label}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}
