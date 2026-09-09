import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from '@/modules/people/entities/person.entity';
import { PaymentMethod } from '@/modules/sales/entities/payment-method.entity';
import { CashRegister } from './entities/cash-register.entity';
import { CashRegisterOpening } from './entities/cash-register-opening.entity';
import { CashMovement } from './entities/cash-movement.entity';
import { ClosingDetail } from './entities/closing-detail.entity';
import { PaymentMethodsController } from './controllers/payment-methods.controller';
import { CashRegistersController } from './controllers/cash-registers.controller';
import { CashRegisterOpeningsController } from './controllers/cash-register-openings.controller';
import { CashMovementsController } from './controllers/cash-movements.controller';
import { PaymentMethodsService } from './services/payment-methods.service';
import { CashRegistersService } from './services/cash-registers.service';
import { CashRegisterOpeningsService } from './services/cash-register-openings.service';
import { CashMovementsService } from './services/cash-movements.service';

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
  controllers: [
    PaymentMethodsController,
    CashRegistersController,
    CashRegisterOpeningsController,
    CashMovementsController,
  ],
  providers: [
    PaymentMethodsService,
    CashRegistersService,
    CashRegisterOpeningsService,
    CashMovementsService,
  ],
})
export class CashModule {}
