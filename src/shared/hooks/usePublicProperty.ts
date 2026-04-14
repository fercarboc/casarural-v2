import { useEffect, useState } from 'react';
import type { PublicProperty } from '../types/publicProperty';
import { fetchPublicProperty } from '../services/publicProperty.service';
import { useTenant } from '../context/TenantContext';

export function usePublicProperty() {
  const { property_id } = useTenant();
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await fetchPublicProperty(property_id);
        if (mounted) {
          setProperty(result);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [property_id]);

  return { property, loading };
}