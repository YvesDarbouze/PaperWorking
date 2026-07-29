export interface Invoice {
  id: string;
  date: string;
  number: string;
  amount: string;
  status: 'paid' | 'pending' | 'failed';
  downloadUrl?: string;
}
