import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive, Max, Min } from 'class-validator';

export class FilterCashRegisterOpeningsDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  cashRegisterId: number;

  @IsInt()
  @Min(1000)
  @Max(9999)
  @Type(() => Number)
  @ApiProperty({ example: 2026 })
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  @ApiProperty({ example: 9 })
  month: number;
}
