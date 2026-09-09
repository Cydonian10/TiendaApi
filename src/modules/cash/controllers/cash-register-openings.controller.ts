import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { JwtUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CloseCashRegisterOpeningDto } from '../dtos/cash-register-opening/close-cash-register-opening.dto';
import { CreateCashRegisterOpeningDto } from '../dtos/cash-register-opening/create-cash-register-opening.dto';
import { CashRegisterOpeningsService } from '../services/cash-register-openings.service';

@ApiTags('Cash Register Openings')
@ApiBearerAuth()
@Roles('ADMINISTRADOR', 'TRABAJADOR')
@Controller('cash-register-openings')
export class CashRegisterOpeningsController {
  constructor(private readonly openingsService: CashRegisterOpeningsService) {}

  @Post()
  create(
    @Body() dto: CreateCashRegisterOpeningDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.openingsService.create(dto, user);
  }

  @Get()
  findAll() {
    return this.openingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.openingsService.findOne(id);
  }

  @Patch(':id/close')
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseCashRegisterOpeningDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.openingsService.close(id, dto, user);
  }
}
