import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from './entities/sale.entity';
import { SaleDetail } from './entities/sale-detail.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Product } from '@/modules/products/entities/producto.entity';
import { MeasurementUnit } from '@/modules/measurement-units/entities/measurement-unit.entity';
import { CashRegisterOpening } from '@/modules/cash/entities/cash-register-opening.entity';
import { SalesService } from './services/sales.service';
import { SalesController } from './controllers/sales.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleDetail,
      SalePayment,
      PaymentMethod,
      Product,
      MeasurementUnit,
      CashRegisterOpening,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
