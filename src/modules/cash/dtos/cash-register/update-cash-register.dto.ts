import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCashRegisterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'Caja secundaria' })
  name?: string;
}
