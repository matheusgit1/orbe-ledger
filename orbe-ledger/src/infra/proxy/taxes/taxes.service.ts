import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, lastValueFrom } from 'rxjs';
import type {
  BaseResponse,
  TaxesServiceResponse,
} from '../_types_/response.interface';
import { Taxes } from '../_types_/taxes.type';
import { ServicesAvailable } from '../_types_/services.type';

@Injectable()
export class TaxesService {
  constructor(private readonly httpService: HttpService) {}

  async getServiceByCode(code: string) {
    const { data } = await firstValueFrom(
      this.httpService
        .get<BaseResponse<TaxesServiceResponse>>(
          `/orbe-services/services/${code}`,
        )
        .pipe(
          catchError((error: AxiosError) => {
            throw new Error(`HTTP request failed: ${error.message}`);
          }),
        ),
    );

    return data;
  }
}
