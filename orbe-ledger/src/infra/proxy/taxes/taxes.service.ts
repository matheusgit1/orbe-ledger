import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom, lastValueFrom } from 'rxjs';

@Injectable()
export class TaxesService {
  constructor(private readonly httpService: HttpService) {}

  async getServiceByCode(code: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`/services/${code}`).pipe(
        catchError((error: AxiosError) => {
          throw new Error(`HTTP request failed: ${error.message}`);
        }),
      ),
    );

    return data
  }
}
