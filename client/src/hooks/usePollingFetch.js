import { useEffect, useRef, useState } from "react";

export default function usePollingFetch(fn, deps = [], ms = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const intervalMs = typeof ms === "number" && ms > 0 ? ms : 15000;
    let id;

    const get = async () => {
      try {
        const result = await fn();
        if (!mounted.current) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (!mounted.current) return;
        setError(err);
      }
    };

    get();
    id = setInterval(get, intervalMs);

    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [...deps, ms]);

  return { data, error };
}
