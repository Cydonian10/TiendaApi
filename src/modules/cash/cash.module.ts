import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '@/modules/people/entities/person.entity';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import { CashRegister } from './entities/cash-register.entity';
import { CashRegisterOpening } from './entities/cash-register-opening.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { ClosingDetail } from './entities/closing-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashRegister,
      CashRegisterOpening,
      CashMovement,
      ClosingDetail,
      PaymentMethod,
      Person,
    ]),
  ],
  controllers: [],
  providers: [],
})
export class CashModule {}
