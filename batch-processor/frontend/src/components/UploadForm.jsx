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
    <div className="max-w-lg mx-auto mt-16 p-8 border rounded-xl shadow-sm">
      <h1 className="text-2xl font-semibold mb-6">Upload Transactions CSV</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full mb-4 text-sm"
        />
        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={!file || loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload & Process"}
        </button>
      </form>
    </div>
  );
}
