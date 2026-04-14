import type { PublicProperty } from '../types/publicProperty';

export async function fetchPublicProperty(property_id: string): Promise<PublicProperty | null> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_property_context`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ property_id }),
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
