import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for fetching analytics data.
 * @param {Function} fetchFn - async function that returns data
 * @param {Object} deps - dependency values that trigger re-fetch
 */
export function useAnalytics(fetchFn, deps = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(deps)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
