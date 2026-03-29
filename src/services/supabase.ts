import { 
  supabase as supabaseClient, 
  isSupabaseConfigured as checkSupabaseConfigured,
  isMockMode as checkMockMode 
} from '../integrations/supabase/client';

export const isSupabaseConfigured = checkSupabaseConfigured;
export const isMockMode = checkMockMode;

export const getSupabase = () => {
  return supabaseClient;
};

// For backward compatibility
export const supabase = supabaseClient;

// Edge Function Wrappers (NO RPC)
export const edgeFunctions = {
  checkAvailability: async (checkIn: string, checkOut: string) => {
    // Mock call to Edge Function
    return { available: true };
  },
  createReservation: async (data: any) => {
    // Mock call to Edge Function
    return { id: 'res_' + Math.random().toString(36).substr(2, 9) };
  },
  updateReservation: async (id: string, data: any) => {
    // Mock call to Edge Function
    return { success: true };
  },
  cancelReservation: async (id: string) => {
    // Mock call to Edge Function
    return { success: true };
  },
  calculatePrice: async (checkIn: string, checkOut: string, guests: number, rateType: string) => {
    // Mock call to Edge Function
    return { total: 450, breakdown: [] };
  },
  createStripeSession: async (reservationId: string) => {
    // Mock call to Edge Function
    return { url: 'https://checkout.stripe.com/...' };
  },
  syncIcal: async () => {
    // Mock call to Edge Function
    return { success: true };
  },
  generateInvoice: async (reservationId: string) => {
    // Mock call to Edge Function
    return { url: 'https://storage.supabase.co/...' };
  }
};
