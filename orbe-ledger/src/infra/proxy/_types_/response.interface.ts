import { ServicesAvailable } from './services.type';
import { Taxes } from './taxes.type';

export interface BaseResponse<T> {
  success: boolean;
  data: T;
  tracingId: string;
  timestamp: string;
}

export interface TaxesServiceResponse {
  code: string;
  name: string;
  description?: string;
  type: ServicesAvailable;
  taxes?: Taxes[];
  isActive?: boolean;
  metadata?: Record<string, any>;
}
