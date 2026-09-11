import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateSaleDto } from '../dtos/sale/create-sale.dto';
import { UpdateSaleDto } from '../dtos/sale/update-sale.dto';
import { PaySaleDto } from '../dtos/sale/pay-sale.dto';
import { CancelSaleDto } from '../dtos/sale/cancel-sale.dto';
import { FilterSaleDto } from '../dtos/sale/filter-sale.dto';
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

  @Get()
  @ApiOkResponse({ type: () => [SaleDto] })
  findAll(@Query() filter: FilterSaleDto, @CurrentUser() user: JwtUser) {
    return this.salesService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: SaleDto })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.salesService
      .findOne(id, user)
      .then((sale) => SaleDto.fromEntity(sale));
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaleDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSaleDto) {
    return this.salesService
      .update(id, dto)
      .then((sale) => SaleDto.fromEntity(sale));
  }

  @Post(':id/pay')
  @ApiOkResponse({ type: SaleDto })
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: PaySaleDto) {
    return this.salesService
      .pay(id, dto)
      .then((sale) => SaleDto.fromEntity(sale));
  }

  @Post(':id/cancel')
  @ApiOkResponse({ type: SaleDto })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelSaleDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.salesService
      .cancel(id, dto, user)
      .then((sale) => SaleDto.fromEntity(sale));
  }
}
