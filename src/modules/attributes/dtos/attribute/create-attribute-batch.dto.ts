import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttributeBatchValueDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Rojo', description: 'Valor del atributo' })
  value: string;
}

export class CreateAttributeBatchDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Color', description: 'Nombre del atributo' })
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeBatchValueDto)
  @ApiProperty({
    type: () => [CreateAttributeBatchValueDto],
    description: 'Valores del atributo (máx. 50)',
  })
  values: CreateAttributeBatchValueDto[];
}
