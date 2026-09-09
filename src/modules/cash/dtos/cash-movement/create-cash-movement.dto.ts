import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CashMovementType } from '../../entities/cash-movement.entity';

export class CreateCashMovementDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID de la sesión de caja abierta' })
  cashOpeningId: number;

  @IsEnum(CashMovementType)
  @ApiProperty({ enum: CashMovementType, example: CashMovementType.INCOME })
  type: CashMovementType;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 20, description: 'Importe del movimiento' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ example: 'Cambio inicial adicional' })
  reason: string;
}
