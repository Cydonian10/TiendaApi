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
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';
import { CashRegistersService } from '../services/cash-registers.service';

@ApiTags('Cash Registers')
@ApiBearerAuth()
@Roles('ADMINISTRADOR')
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Get()
  findAll() {
    return this.cashRegistersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCashRegisterDto) {
    return this.cashRegistersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashRegisterDto,
  ) {
    return this.cashRegistersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.cashRegistersService.deactivate(id);
  }
}
