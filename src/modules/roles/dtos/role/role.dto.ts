import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../entities/role.entity';

export class RoleDto {
  @ApiProperty({ example: 1, description: 'ID del rol' })
  id: number;

  @ApiProperty({ example: 'CLIENTE' })
  name: string;

  static fromEntity(r: Role): RoleDto {
    const dto = new RoleDto();
    dto.id = r.id;
    dto.name = r.name;
    return dto;
  }
}
