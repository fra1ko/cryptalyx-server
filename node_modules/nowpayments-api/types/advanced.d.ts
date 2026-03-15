export interface PaymentStatusExtended {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  created_at: string;
  updated_at: string;
  network: string;
  riskScore: number;
  paymentExtraData: {
    processingTime: number;
    isExpired: boolean;
    remainingTime: number;
  };
}

export interface PaymentFlow {
  payment_id: string;
  status: string;
  steps: {
    name: string;
    status: string;
    timestamp: string;
    details?: Record<string, any>;
  }[];
}

export interface AdvancedCurrency extends Currency {
  validation_regex: string;
  minimum_amount: number;
  maximum_amount: number;
  precision: number;
  networks: {
    name: string;
    network_id: string;
    is_default: boolean;
    token_contract?: string;
  }[];
}
