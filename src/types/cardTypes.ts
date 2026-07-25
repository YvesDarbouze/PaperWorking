export interface BusinessCard {
  name: string;
  email: string;
  phone: string;
  company: string;
  uid?: string; // Optional PaperWorking UID to enable "Follow" actions
}
