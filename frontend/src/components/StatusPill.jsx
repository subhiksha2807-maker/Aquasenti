export default function StatusPill({ status }) {
  const classes = {
    "Urgent Inspection": "bg-rose-100 text-rose-700 border-rose-200",
    "Cleaning Soon": "bg-amber-100 text-amber-700 border-amber-200",
    "Monitor Closely": "bg-sky-100 text-sky-700 border-sky-200",
    "Routine Monitoring": "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classes[status] || classes["Monitor Closely"]}`}>{status || "Unavailable"}</span>;
}
