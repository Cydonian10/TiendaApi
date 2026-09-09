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
import { CloseCashRegisterOpeningDto } from '../dtos/cash-register-opening/close-cash-register-opening.dto';
import { CreateCashRegisterOpeningDto } from '../dtos/cash-register-opening/create-cash-register-opening.dto';
import { CashRegisterOpeningsService } from '../services/cash-register-openings.service';
import { CashRegisterOpeningDto } from '../dtos/cash-response.dto';

@ApiTags('Cash Register Openings')
@ApiBearerAuth()
@Roles('ADMINISTRADOR', 'TRABAJADOR')
@Controller('cash-register-openings')
export class CashRegisterOpeningsController {
  constructor(private readonly openingsService: CashRegisterOpeningsService) {}

  @Post()
  @ApiCreatedResponse({ type: CashRegisterOpeningDto })
  create(
    @Body() dto: CreateCashRegisterOpeningDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.openingsService
      .create(dto, user)
      .then((opening) => CashRegisterOpeningDto.fromEntity(opening));
  }

  @Get()
  @ApiOkResponse({ type: () => [CashRegisterOpeningDto] })
  findAll() {
    return this.openingsService
      .findAll()
      .then((openings) =>
        openings.map((opening) => CashRegisterOpeningDto.fromEntity(opening)),
      );
  }

  @Get(':id')
  @ApiOkResponse({ type: CashRegisterOpeningDto })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.openingsService
      .findOne(id)
      .then((opening) => CashRegisterOpeningDto.fromEntity(opening));
  }

  @Patch(':id/close')
  @ApiOkResponse({ type: CashRegisterOpeningDto })
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseCashRegisterOpeningDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.openingsService
      .close(id, dto, user)
      .then((opening) => CashRegisterOpeningDto.fromEntity(opening));
  }
}
