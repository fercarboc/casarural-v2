import { isMockMode } from '../integrations/supabase/client';
import { incomeMockService } from './income.mock';

export const incomeService = {
  getIncomeData: async () => {
    if (isMockMode) {
      return incomeMockService.getIncomeData();
    }
    // Placeholder for real implementation
    return incomeMockService.getIncomeData();
  }
};
