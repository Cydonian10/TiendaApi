import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from '@/modules/roles/dtos/role/role.dto';

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

  @ApiProperty({ example: false, description: 'Tiene registro de auth' })
  hasAuth: boolean;

  @ApiProperty({
    example: { id: 1, email: 'admin@correo.com', google: false },
    description: 'Registro de auth asociado (null si no tiene)',
  })
  auth: { id: number; email: string; google: boolean } | null;

  static fromEntity(person: {
    id: number;
    firstName: string;
    lastName: string;
    birthDate: string | Date;
    address: string;
    dni: string;
    roles: { id: number; name: string }[];
    auth?: {
      id: number;
      email: string;
      google: boolean;
    } | null;
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
    dto.hasAuth = person.auth != null;
    dto.auth = person.auth
      ? {
          id: person.auth.id,
          email: person.auth.email,
          google: person.auth.google,
        }
      : null;
    return dto;
  }
}
