import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class SetMainImageDto {
  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'Marcar como imagen principal' })
  isMain: boolean;
}
