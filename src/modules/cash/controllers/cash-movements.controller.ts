import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateCashMovementDto } from '../dtos/cash-movement/create-cash-movement.dto';
import { CashMovementsService } from '../services/cash-movements.service';
import { CashMovementDto } from '../dtos/cash-response.dto';

@ApiTags('Cash Movements')
@ApiBearerAuth()
@Roles('ADMINISTRADOR', 'TRABAJADOR')
@Controller('cash-movements')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  @ApiCreatedResponse({ type: CashMovementDto })
  create(@Body() dto: CreateCashMovementDto, @CurrentUser() user: JwtUser) {
    return this.cashMovementsService
      .create(dto, user)
      .then((movement) => CashMovementDto.fromEntity(movement));
  }
}
