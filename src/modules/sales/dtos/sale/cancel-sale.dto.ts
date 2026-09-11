import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @ApiProperty({
    example: 'Cliente desistió de la compra',
    description: 'Motivo de la cancelación',
    maxLength: 500,
  })
  cancellationReason: string;
}
