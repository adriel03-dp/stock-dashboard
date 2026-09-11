import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

// Poll the real provider aggregate. Retain the last successful response on failure.
export function useFinnhubNews(enabled = true) {
  const [articles, setArticles] = useState([]);
  const [isConnected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const request = useRef(null);
  const refresh = useCallback(async () => {
    if (!enabled || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    try {
      const {data} = await api.get('/news/top', {params:{limit:50}, signal:controller.signal, timeout:30000});
      if (!Array.isArray(data)) throw new Error('Invalid news response');
      if (controller.signal.aborted) return;
      setArticles(data);
      setConnected(true);
      setError(null);
      setStatus({updatedAt:new Date().toISOString()});
    } catch (err) {
      if (controller.signal.aborted) return;
      setConnected(false);
      setError(err.response?.data?.error || 'Unable to refresh news. Please try again.');
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => {clearInterval(timer); request.current?.abort(); request.current = null;};
  }, [enabled, refresh]);
  return {articles, isConnected, error, status, refresh};
}
