export interface WebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  pongTimeout?: number;
  endpoint?: string;
}

export interface ConnectionState {
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
}

export interface PaymentUpdateEvent {
  type: 'payment_update';
  data: {
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
  };
}

export interface WebSocketError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
