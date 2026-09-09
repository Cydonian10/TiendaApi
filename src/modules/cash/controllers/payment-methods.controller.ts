import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Get,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CreatePaymentMethodDto } from '../dtos/payment-method/create-payment-method.dto';
import { UpdatePaymentMethodDto } from '../dtos/payment-method/update-payment-method.dto';
import { PaymentMethodsService } from '../services/payment-methods.service';
import { PaymentMethodDto } from '../dtos/cash-response.dto';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@Roles('ADMINISTRADOR')
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @ApiOkResponse({ type: () => [PaymentMethodDto] })
  findAll() {
    return this.paymentMethodsService
      .findAll()
      .then((methods) =>
        methods.map((method) => PaymentMethodDto.fromEntity(method)),
      );
  }

  @Post()
  @ApiCreatedResponse({ type: PaymentMethodDto })
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService
      .create(dto)
      .then((method) => PaymentMethodDto.fromEntity(method));
  }

  @Patch(':id')
  @ApiOkResponse({ type: PaymentMethodDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService
      .update(id, dto)
      .then((method) => PaymentMethodDto.fromEntity(method));
  }

  @Patch(':id/activate')
  @ApiOkResponse({ type: PaymentMethodDto })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService
      .activate(id)
      .then((method) => PaymentMethodDto.fromEntity(method));
  }

  @Patch(':id/deactivate')
  @ApiOkResponse({ type: PaymentMethodDto })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.paymentMethodsService
      .deactivate(id)
      .then((method) => PaymentMethodDto.fromEntity(method));
  }
}
