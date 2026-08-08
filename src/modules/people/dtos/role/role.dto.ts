import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ example: 1, description: 'ID del rol' })
  id: number;

  @ApiProperty({ example: 'CLIENTE' })
  name: string;
}
