import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class CloseCashRegisterOpeningDetailDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID del método de pago activo' })
  paymentMethodId: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 120, description: 'Monto contado en el arqueo' })
  realAmount: number;
}

export class CloseCashRegisterOpeningDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique(
    (detail: CloseCashRegisterOpeningDetailDto) => detail.paymentMethodId,
  )
  @ValidateNested({ each: true })
  @Type(() => CloseCashRegisterOpeningDetailDto)
  @ApiProperty({ type: () => [CloseCashRegisterOpeningDetailDto] })
  details: CloseCashRegisterOpeningDetailDto[];
}
