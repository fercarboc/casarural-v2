import type { PublicProperty } from '../types/publicProperty';

const PROPERTY_SLUG =
  (import.meta as any).env?.VITE_PROPERTY_SLUG || 'la-rasilla';

export async function fetchPublicProperty(): Promise<PublicProperty | null> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_property_context`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ slug: PROPERTY_SLUG }),
      },
    );

    const data = await res.json();

    if (!data.ok) {
      console.warn('public_property_context: no property found', data.error);
      return null;
    }

    return data.property as PublicProperty;
  } catch (err) {
    console.error('Error loading public property:', err);
    return null;
  }
}
