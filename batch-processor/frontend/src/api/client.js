const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function uploadJob(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/jobs`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.json().then(j => j.detail).catch(() => "Upload failed"));
  return res.json();
}

export async function startJob(jobId) {
  const res = await fetch(`${BASE}/jobs/${jobId}/start`, { method: "POST" });
  if (!res.ok) throw new Error(await res.json().then(j => j.detail).catch(() => "Failed to start job"));
  return res.json();
}

export async function getJob(jobId) {
  const res = await fetch(`${BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function getTransactions(jobId, { filter = "all", page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams({ filter, page, page_size: pageSize });
  const res = await fetch(`${BASE}/jobs/${jobId}/transactions?${params}`);
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}
