import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Rojo', description: 'Valor del atributo' })
  value: string;

  @Type(() => Number)
  @IsInt()
  @ApiProperty({ example: 1, description: 'ID del atributo al que pertenece' })
  attributeId: number;
}
