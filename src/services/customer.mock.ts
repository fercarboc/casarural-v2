export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalReservations: number;
  totalSpent: number;
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cust_1",
    name: "Carlos García",
    email: "carlos@email.com",
    phone: "600123123",
    totalReservations: 3,
    totalSpent: 4125
  },
  {
    id: "cust_2",
    name: "Laura Fernández",
    email: "laura@email.com",
    phone: "611222333",
    totalReservations: 1,
    totalSpent: 1500
  }
];

export const getMockCustomers = async () => {
  return new Promise<Customer[]>((resolve) => {
    setTimeout(() => resolve(MOCK_CUSTOMERS), 500);
  });
};
