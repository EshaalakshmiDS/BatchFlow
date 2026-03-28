import { useState } from "react";
import { uploadJob, startJob } from "../api/client";

export default function UploadForm({ onJobStarted }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const job = await uploadJob(file);
      await startJob(job.id);
      onJobStarted(job.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Upload Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">Select a CSV file to begin batch processing</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            file ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
          }`}>
            <div className="text-center px-4">
              {file ? (
                <>
                  <p className="text-blue-600 font-medium text-sm truncate max-w-xs">{file.name}</p>
                  <p className="text-slate-400 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <p className="text-slate-500 text-sm">Drop your CSV here or <span className="text-blue-500">browse</span></p>
                  <p className="text-slate-400 text-xs mt-1">.csv files only</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            {loading ? "Uploading…" : "Upload & Process"}
          </button>
        </form>
      </div>
    </div>
  );
}
