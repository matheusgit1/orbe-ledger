import { Module } from '@nestjs/common';
import { TaxesService } from './taxes/taxes.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
        baseURL:
          process.env.NODE_ENV === 'production'
            ? process.env.KONG_PROXY
            : 'http://localhost:3001',
      }),
    }),
  ],
  providers: [TaxesService],
  exports: [TaxesService],
})
export class ProxyModule {}
