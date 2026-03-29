export const MOCK_INCOME_DATA = {
  summary: [
    { label: 'Total Facturado (2026)', value: '10.200€', trend: '+18%', color: 'emerald' },
    { label: 'Pendiente de Cobro', value: '1.450€', trend: '3 reservas', color: 'amber' },
    { label: 'Media por Reserva', value: '425€', trend: '+5%', color: 'blue' },
  ],
  monthlyBreakdown: [
    { month: 'Enero', income: 2850, reservations: 8, growth: '+12%' },
    { month: 'Febrero', income: 3100, reservations: 10, growth: '+8%' },
    { month: 'Marzo', income: 4250, reservations: 14, growth: '+25%' },
    { month: 'Abril (Est.)', income: 3800, reservations: 12, growth: '-5%' },
  ],
  paymentMethods: [
    { label: 'Stripe (Web)', percentage: 65, amount: '6.630€', color: 'indigo' },
    { label: 'Transferencia', percentage: 25, amount: '2.550€', color: 'blue' },
    { label: 'Efectivo', percentage: 10, amount: '1.020€', color: 'emerald' },
  ]
};

export const incomeMockService = {
  getIncomeData: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_INCOME_DATA), 500);
    });
  }
};
