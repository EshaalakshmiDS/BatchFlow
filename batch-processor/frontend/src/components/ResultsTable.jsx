import { useState, useEffect } from "react";
import { getTransactions } from "../api/client";

const FILTERS = ["all", "valid", "invalid", "suspicious"];

const FILTER_STYLE = {
  all:        { active: "bg-slate-700 text-white border-slate-700",     inactive: "border-slate-300 text-slate-500 hover:border-slate-400" },
  valid:      { active: "bg-green-600 text-white border-green-600",     inactive: "border-slate-300 text-slate-500 hover:border-green-400" },
  invalid:    { active: "bg-red-500 text-white border-red-500",         inactive: "border-slate-300 text-slate-500 hover:border-red-400" },
  suspicious: { active: "bg-amber-500 text-white border-amber-500",     inactive: "border-slate-300 text-slate-500 hover:border-amber-400" },
};

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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md p-6">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <h2 className="text-lg font-semibold text-slate-800 mr-2">Transactions</h2>
        {FILTERS.map((f) => {
          const s = FILTER_STYLE[f];
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${
                filter === f ? s.active : s.inactive
              }`}
            >
              {f}
            </button>
          );
        })}
        {data && (
          <span className="ml-auto text-xs text-slate-400">
            {data.total.toLocaleString()} records
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-200">
              {["Transaction ID", "User ID", "Amount", "Timestamp", "Valid", "Suspicious", "Errors"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">Loading…</td>
              </tr>
            ) : data?.results.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">No records match this filter</td>
              </tr>
            ) : data?.results.map((tx) => (
              <tr
                key={tx.id}
                className={`transition-colors hover:bg-slate-50 ${
                  !tx.is_valid ? "bg-red-50/60" : tx.is_suspicious ? "bg-amber-50/60" : ""
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[130px]">{tx.transaction_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400 truncate max-w-[130px]">{tx.user_id}</td>
                <td className={`px-4 py-3 font-medium tabular-nums ${tx.is_suspicious ? "text-amber-600" : "text-slate-700"}`}>
                  {tx.amount != null
                    ? Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                  {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {tx.is_valid
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Valid</span>
                    : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Invalid</span>
                  }
                </td>
                <td className="px-4 py-3">
                  {tx.is_suspicious
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Yes</span>
                    : <span className="text-slate-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-xs text-red-500 max-w-[200px]">
                  {tx.validation_errors?.join("; ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
