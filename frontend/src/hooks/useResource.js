import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Loads a GET endpoint and exposes { data, error, loading, reload }.
 * `loading` stays true until the first response so pages can show skeletons.
 * Responses from a superseded path are discarded.
 */
export function useResource(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const payload = await api(path);
      if (id !== requestId.current) return;
      setData(payload);
      setError(null);
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    load();
    return () => {
      // Invalidate the in-flight request when the path changes or we unmount.
      requestId.current += 1;
    };
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
