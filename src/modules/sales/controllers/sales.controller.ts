import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateSaleDto } from '../dtos/sale/create-sale.dto';
import { SalesService } from '../services/sales.service';
import { SaleDto } from '../dtos/sale/sale.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@Roles('ADMINISTRADOR', 'TRABAJADOR')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiCreatedResponse({ type: SaleDto })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: JwtUser) {
    return this.salesService
      .create(dto, user)
      .then((sale) => SaleDto.fromEntity(sale));
  }
}
