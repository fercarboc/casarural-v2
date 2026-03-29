export interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  date: string;
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: "inv_1",
    customer: "Carlos García",
    amount: 1375,
    status: "PAID",
    date: "2026-06-01"
  },
  {
    id: "inv_2",
    customer: "Laura Fernández",
    amount: 1500,
    status: "PENDING",
    date: "2026-06-15"
  }
];

export const getMockInvoices = async () => {
  return new Promise<Invoice[]>((resolve) => {
    setTimeout(() => resolve(MOCK_INVOICES), 500);
  });
};
