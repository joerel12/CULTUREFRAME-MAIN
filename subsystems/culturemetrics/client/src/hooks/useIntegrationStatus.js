import { useState, useEffect } from 'react';
import { integrationService } from '../services/integrationService';

/**
 * Polls integration status every 30 seconds.
 * Used by Header to show live/mock/sync indicator.
 */
export function useIntegrationStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        const data = await integrationService.getStatus();
        if (mounted) setStatus(data);
      } catch {
        // Non-critical — header will just not show extra status
      }
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
