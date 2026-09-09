import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiPropertyOptional({ example: 'Tarjeta de crédito' })
  name?: string;
}
