declare module 'nowpayments-api' {
  export interface APIConfig {
    apiKey: string;
    ipnSecret?: string;
    sandbox?: boolean;
  }

  export type PaymentStatusType =
    | 'waiting'
    | 'confirming'
    | 'confirmed'
    | 'sending'
    | 'partially_paid'
    | 'finished'
    | 'failed'
    | 'refunded'
    | 'expired';

  export type PayoutStatusType = 'pending' | 'processing' | 'completed' | 'failed';

  export interface Currency {
    currency: string;
    name: string;
    isFiat: boolean;
    isAvailable: boolean;
    image?: string;
    hasExternalId?: boolean;
    network?: string;
    validation_regex?: string;
    minimum_amount?: number;
    maximum_amount?: number;
    precision?: number;
  }

  export interface EstimatePrice {
    currency_from: string;
    currency_to: string;
    estimated_amount: number;
    rate: number;
    from_network?: string;
    to_network?: string;
    valid_until?: string;
  }

  export interface PaymentStatus {
    payment_id: string;
    payment_status: PaymentStatusType;
    pay_address: string;
    price_amount: number;
    price_currency: string;
    pay_amount: number;
    actually_paid: number;
    pay_currency: string;
    order_id: string;
    order_description: string;
    purchase_id: string;
    created_at: string;
    updated_at: string;
    outcome_amount: number;
    outcome_currency: string;
    burning_percent?: number;
    payin_hash?: string;
    payout_hash?: string;
    payment_extra_id?: string;
  }

  export interface Invoice {
    id: string;
    token_id: string;
    order_id: string;
    order_description: string;
    price_amount: number;
    price_currency: string;
    pay_currency: string;
    ipn_callback_url: string;
    invoice_url: string;
    success_url: string;
    cancel_url: string;
    created_at: string;
    updated_at: string;
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
  }

  export interface Payout {
    id: string;
    status: PayoutStatusType;
    address: string;
    amount: number;
    currency: string;
    ipn_callback_url: string;
    created_at: string;
    updated_at: string;
    batch_withdrawal_id?: string;
    error?: string;
    hash?: string;
  }

  export interface CreatePaymentParams {
    price_amount: number;
    price_currency: string;
    pay_currency: string;
    ipn_callback_url?: string;
    order_id?: string;
    order_description?: string;
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
    purchase_id?: string;
    payout_address?: string;
    payout_currency?: string;
    payout_extra_id?: string;
    fixed_rate?: boolean;
  }

  export interface CreateInvoiceParams {
    price_amount: number;
    price_currency: string;
    order_id?: string;
    order_description?: string;
    ipn_callback_url?: string;
    success_url?: string;
    cancel_url?: string;
    is_fixed_rate?: boolean;
    is_fee_paid_by_user?: boolean;
    payment_currency?: string;
  }

  export interface CreatePayoutParams {
    address: string;
    amount: number;
    currency: string;
    ipn_callback_url?: string;
    extra_id?: string;
    fee_payer?: 'sender' | 'receiver';
  }

  export interface GetPaymentsParams {
    limit?: number;
    page?: number;
    sortBy?: string;
    orderBy?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
    status?: PaymentStatusType;
  }

  export interface PaginationResponse<T> {
    data: T[];
    pagination: {
      count: number;
      limit: number;
      page: number;
      totalPages: number;
    };
  }

  export interface APIResponse<T> {
    statusCode: number;
    data: T;
  }

  export interface MinimumPaymentAmount {
    currency: string;
    min_amount: number;
    max_amount?: number;
  }

  export default class NowPaymentsAPI {
    constructor(config: APIConfig);

    getStatus(): Promise<{ message: string }>;

    getCurrencies(): Promise<Currency[]>;

    getEstimatePrice(params: {
      amount: number;
      currency_from: string;
      currency_to: string;
      from_network?: string;
      to_network?: string;
    }): Promise<EstimatePrice>;

    createPayment(payment: CreatePaymentParams): Promise<PaymentStatus>;

    getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

    getMinimumPaymentAmount(currency: string): Promise<MinimumPaymentAmount>;

    createInvoice(invoice: CreateInvoiceParams): Promise<Invoice>;

    getPayments(params?: GetPaymentsParams): Promise<PaginationResponse<PaymentStatus>>;

    createPayout(payout: CreatePayoutParams): Promise<Payout>;

    verifyIPN(ipnData: Record<string, any>, signature: string): boolean;
  }
}
