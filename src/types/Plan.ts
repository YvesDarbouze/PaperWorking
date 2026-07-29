export interface Plan {
  id: string;
  label: string;
  price: string;
  priceNum: number;
  description: string;
  features: string[];
  recommended: boolean;
}
