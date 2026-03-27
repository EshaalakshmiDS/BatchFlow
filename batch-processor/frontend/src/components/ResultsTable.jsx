import { useState, useEffect } from "react";
import { getTransactions } from "../api/client";

const FILTERS = ["all", "valid", "invalid", "suspicious"];

export default function ResultsTable({ jobId }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getTransactions(jobId, { filter, page })
      .then(setData)
      .finally(() => setLoading(false));
  }, [jobId, filter, page]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6">
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1 rounded-full text-sm capitalize border ${
              filter === f ? "bg-blue-600 text-white border-blue-600" : "border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
        {data && <span className="ml-auto text-sm text-gray-500">{data.total} records</span>}
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {["Transaction ID", "User ID", "Amount", "Timestamp", "Valid", "Suspicious", "Errors"].map(h => (
                <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : data?.results.map((tx) => (
              <tr key={tx.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs truncate max-w-[120px]">{tx.transaction_id}</td>
                <td className="px-4 py-2 font-mono text-xs truncate max-w-[120px]">{tx.user_id}</td>
                <td className={`px-4 py-2 ${tx.is_suspicious ? "text-amber-600 font-medium" : ""}`}>
                  {tx.amount ?? "—"}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}</td>
                <td className="px-4 py-2">{tx.is_valid ? "✓" : "✗"}</td>
                <td className="px-4 py-2">{tx.is_suspicious ? "⚠" : "—"}</td>
                <td className="px-4 py-2 text-xs text-red-500">{tx.validation_errors?.join("; ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="disabled:opacity-40">
          ← Prev
        </button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="disabled:opacity-40">
          Next →
        </button>
      </div>
    </div>
  );
}
