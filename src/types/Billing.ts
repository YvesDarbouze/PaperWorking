import { Invoice } from './Invoice';

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface Billing {
  plan: string;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  subscriptionStatus: string;
  usage?: {
    propertiesUsed: number;
    propertiesLimit: number;
  };
}
