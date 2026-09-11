import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class PaySaleDto {
  @IsNumber()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'ID del método de pago activo' })
  paymentMethodId: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @ApiProperty({ example: 21, description: 'Importe total pagado' })
  amount: number;
}
