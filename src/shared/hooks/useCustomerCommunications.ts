import { useCallback, useEffect, useState } from 'react';
import { customerCommunicationsService } from '../../services/customerCommunications.service';
import type { CustomerCommunication } from '../types/customerCommunication.types';

interface UseCustomerCommunicationsParams {
  propertyId?: string;
  customerEmail?: string;
  limit?: number;
  enabled?: boolean;
}

export function useCustomerCommunications({
  propertyId,
  customerEmail,
  limit = 100,
  enabled = true,
}: UseCustomerCommunicationsParams) {
  const [items, setItems] = useState<CustomerCommunication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !propertyId || !customerEmail) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await customerCommunicationsService.listByCustomer({
        propertyId,
        customerEmail,
        limit,
      });

      setItems(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error cargando comunicaciones';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled, propertyId, customerEmail, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    error,
    reload: load,
    hasItems: items.length > 0,
  };
}