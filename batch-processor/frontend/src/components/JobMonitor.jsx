import { useEffect } from "react";
import { useJobPoller } from "../hooks/useJobPoller";

const STATUS_COLOR = {
  pending: "text-gray-500",
  running: "text-blue-600",
  completed: "text-green-600",
  failed: "text-red-600",
};

export default function JobMonitor({ jobId, onComplete }) {
  const { job, error } = useJobPoller(jobId);

  useEffect(() => {
    if (job?.status === "completed") onComplete?.();
  }, [job?.status, onComplete]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!job) return <p className="text-gray-400">Connecting…</p>

  return (
    <div className="max-w-lg mx-auto mt-12 p-8 border rounded-xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Processing Job</h2>
        <span className={`font-medium capitalize ${STATUS_COLOR[job.status]}`}>
          {job.status}
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${job.progress_percent}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 text-right">{job.progress_percent}%</p>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="Processed" value={job.processed_records} />
        <Stat label="Valid" value={job.valid_records} color="text-green-600" />
        <Stat label="Invalid" value={job.invalid_records} color="text-red-600" />
      </div>

      {job.status === "failed" && (
        <p className="text-red-600 text-sm">Error: {job.error_message}</p>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-gray-800" }) {
  return (
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
