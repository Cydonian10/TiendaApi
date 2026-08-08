import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from '../role/role.dto';

export class PersonDto {
  @ApiProperty({ example: 1, description: 'ID de la persona' })
  id: number;

  @ApiProperty({ example: 'Juan', description: 'Nombres' })
  firstName: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellidos' })
  lastName: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Fecha de nacimiento (YYYY-MM-DD)',
  })
  birthDate: string;

  @ApiProperty({ example: 'Av. Los Clavos 123', description: 'Dirección' })
  address: string;

  @ApiProperty({ example: '12345678', description: 'DNI' })
  dni: string;

  @ApiProperty({ type: () => [RoleDto] })
  roles: RoleDto[];

  static fromEntity(person: {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: string | Date;
    address: string;
    dni: string;
    roles: { id: number; name: string }[];
  }): PersonDto {
    const dto = new PersonDto();
    dto.id = person.id;
    dto.firstName = person.firstName;
    dto.lastName = person.lastName;
    dto.birthDate =
      person.birthDate instanceof Date
        ? person.birthDate.toISOString().slice(0, 10)
        : String(person.birthDate);
    dto.address = person.address;
    dto.dni = person.dni;
    dto.roles = (person.roles ?? []).map((r) => {
      const rd = new RoleDto();
      rd.id = r.id;
      rd.name = r.name;
      return rd;
    });
    return dto;
  }
}
