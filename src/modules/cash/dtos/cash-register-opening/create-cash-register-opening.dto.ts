import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateCashRegisterOpeningDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID de la caja' })
  cashRegisterId: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ example: 100, description: 'Monto inicial de apertura' })
  openingAmount: number;
}
