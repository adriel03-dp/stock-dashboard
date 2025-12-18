import { useEffect, useRef, useState } from "react";

export default function usePollingFetch(fn, deps = [], ms = 15000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fn();
      if (!mounted.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err);
      setData(null);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    mounted.current = true;
    const intervalMs = typeof ms === "number" && ms > 0 ? ms : 15000;

    fetchData();
    intervalRef.current = setInterval(fetchData, intervalMs);

    return () => {
      mounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, deps);

  return { data, loading, error, refetch };
}
