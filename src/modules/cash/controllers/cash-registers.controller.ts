import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { CreateCashRegisterDto } from '../dtos/cash-register/create-cash-register.dto';
import { UpdateCashRegisterDto } from '../dtos/cash-register/update-cash-register.dto';
import { CashRegistersService } from '../services/cash-registers.service';
import { CashRegisterDto } from '../dtos/cash-response.dto';

@ApiTags('Cash Registers')
@ApiBearerAuth()
@Controller('cash-registers')
export class CashRegistersController {
  constructor(private readonly cashRegistersService: CashRegistersService) {}

  @Get()
  @Roles('ADMINISTRADOR', 'TRABAJADOR')
  @ApiOkResponse({ type: () => [CashRegisterDto] })
  findAll(@CurrentUser() user: JwtUser) {
    return this.cashRegistersService
      .findAll(user.roles)
      .then((registers) =>
        registers.map((register) => CashRegisterDto.fromEntity(register)),
      );
  }

  @Post()
  @Roles('ADMINISTRADOR')
  @ApiCreatedResponse({ type: CashRegisterDto })
  create(@Body() dto: CreateCashRegisterDto) {
    return this.cashRegistersService
      .create(dto)
      .then((register) => CashRegisterDto.fromEntity(register));
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR')
  @ApiOkResponse({ type: CashRegisterDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashRegisterDto,
  ) {
    return this.cashRegistersService
      .update(id, dto)
      .then((register) => CashRegisterDto.fromEntity(register));
  }

  @Patch(':id/deactivate')
  @Roles('ADMINISTRADOR')
  @ApiOkResponse({ type: CashRegisterDto })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.cashRegistersService
      .deactivate(id)
      .then((register) => CashRegisterDto.fromEntity(register));
  }
}
