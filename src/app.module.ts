import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { ProductsModule } from './modules/products/products.module';
import { AttributesModule } from './modules/attributes/attributes.module';
import { ImagesModule } from './modules/images/images.module';
import { MeasurementUnitsModule } from './modules/measurement-units/measurement-units.module';
import { PeopleModule } from './modules/people/people.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    DatabaseModule,
    ProductsModule,
    AttributesModule,
    ImagesModule,
    MeasurementUnitsModule,
    PeopleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
