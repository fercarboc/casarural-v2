import { isMockMode } from '../integrations/supabase/client';
import { getMockCustomers } from './customer.mock';

export const customerService = {
  async getCustomers() {
    if (isMockMode) {
      return getMockCustomers();
    }
    // Real implementation placeholder
    return getMockCustomers();
  }
};
