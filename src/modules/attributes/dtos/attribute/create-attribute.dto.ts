import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Color', description: 'Nombre del atributo' })
  name: string;
}
