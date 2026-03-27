import { useState, useEffect, useRef } from "react";
import { getJob } from "../api/client";

const TERMINAL_STATES = new Set(["completed", "failed"]);

export function useJobPoller(jobId, intervalMs = 2000) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await getJob(jobId);
        setJob(data);
        if (TERMINAL_STATES.has(data.status)) {
          clearInterval(timerRef.current);
        }
      } catch (e) {
        setError(e.message);
      }
    };

    poll(); // immediate first call
    timerRef.current = setInterval(poll, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [jobId, intervalMs]);

  return { job, error };
}
