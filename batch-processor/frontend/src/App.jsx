import { useState } from "react";
import UploadForm from "./components/UploadForm";
import JobMonitor from "./components/JobMonitor";
import ResultsTable from "./components/ResultsTable";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="font-semibold text-lg tracking-tight text-slate-800">BatchFlow</span>
          <span className="ml-auto text-xs text-slate-400">Batch Processing System</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!jobId && <UploadForm onJobStarted={setJobId} />}
        {jobId && !showResults && (
          <JobMonitor jobId={jobId} onComplete={() => setShowResults(true)} />
        )}
        {showResults && (
          <>
            <JobMonitor jobId={jobId} />
            <ResultsTable jobId={jobId} />
          </>
        )}
      </main>
    </div>
  );
}
