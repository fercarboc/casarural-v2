import { useEffect, useState } from 'react';
import type { PublicProperty } from '../types/publicProperty';
import { fetchPublicProperty } from '../services/publicProperty.service';

export function usePublicProperty() {
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const result = await fetchPublicProperty();
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
  }, []);

  return { property, loading };
}