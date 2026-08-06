import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt } from 'class-validator';

export class CreateImageDto {
  @IsIn(['product'])
  @ApiProperty({
    example: 'product',
    description: 'Tipo de entidad (solo product)',
  })
  entityType: string;

  @IsInt()
  @Type(() => Number)
  @ApiProperty({ example: 1, description: 'ID de la entidad' })
  entityId: number;
}
