export interface ErrorData {
  [key: string]: any;
}

export interface APIErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, any>;
}

export class NOWPaymentsError extends Error {
  code: string | number;
  data?: ErrorData;

  constructor(message: string, code: string | number, data?: ErrorData);

  toString(): string;
  toJSON(): {
    name: string;
    code: string | number;
    message: string;
    data?: ErrorData;
  };
}

export class APIError extends NOWPaymentsError {
  statusCode: number;
  responseData?: APIErrorResponse;

  constructor(message: string, statusCode: number, responseData?: APIErrorResponse);
}

export class ValidationError extends NOWPaymentsError {
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>);
}

export class WebSocketError extends NOWPaymentsError {
  constructor(message: string, code: string, details?: Record<string, any>);
}
