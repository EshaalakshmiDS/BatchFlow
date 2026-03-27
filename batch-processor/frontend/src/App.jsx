import { useState } from "react";
import UploadForm from "./components/UploadForm";
import JobMonitor from "./components/JobMonitor";
import ResultsTable from "./components/ResultsTable";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
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
    </div>
  );
}
