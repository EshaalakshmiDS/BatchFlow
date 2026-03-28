import { useEffect } from "react";
import { useJobPoller } from "../hooks/useJobPoller";

const STATUS_STYLE = {
  pending:   "bg-slate-100 text-slate-500",
  running:   "bg-blue-100 text-blue-600",
  completed: "bg-green-100 text-green-600",
  failed:    "bg-red-100 text-red-600",
};

export default function JobMonitor({ jobId, onComplete }) {
  const { job, error } = useJobPoller(jobId);

  useEffect(() => {
    if (job?.status === "completed") onComplete?.();
  }, [job?.status, onComplete]);

  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (!job) return <p className="text-slate-400 text-sm">Connecting…</p>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Job Progress</h2>
        <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${STATUS_STYLE[job.status]}`}>
          {job.status}
        </span>
      </div>

      <div className="mb-1">
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${job.progress_percent}%` }}
          />
        </div>
        <p className="text-right text-xs text-slate-400 mt-1">{job.progress_percent}%</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <Stat label="Processed" value={job.processed_records} color="text-slate-700" bg="bg-slate-50 border border-slate-200" />
        <Stat label="Valid"      value={job.valid_records}     color="text-green-600" bg="bg-green-50 border border-green-200" />
        <Stat label="Invalid"    value={job.invalid_records}   color="text-red-500"   bg="bg-red-50 border border-red-200" />
      </div>

      {job.status === "failed" && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
          {job.error_message}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl px-4 py-3 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}
