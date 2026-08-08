import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleDetail } from './entities/sale-detail.entity';
import { Product } from '@/modules/products/entities/producto.entity';
import { MeasurementUnit } from '@/modules/measurement-units/entities/measurement-unit.entity';
import { SalesService } from './services/sales.service';
import { SalesController } from './controllers/sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleDetail, Product, MeasurementUnit]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
