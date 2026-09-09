import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateCashMovementDto } from '../dtos/cash-movement/create-cash-movement.dto';
import { CashMovementsService } from '../services/cash-movements.service';

@ApiTags('Cash Movements')
@ApiBearerAuth()
@Roles('ADMINISTRADOR', 'TRABAJADOR')
@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  create(@Body() dto: CreateCashMovementDto, @CurrentUser() user: JwtUser) {
    return this.cashMovementsService.create(dto, user);
  }
}
