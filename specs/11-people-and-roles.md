# SPEC 11 — Personas y Roles

> **Status:** Aprobado
> **Depends on:** SPEC 02 (response/pagination/filter)
> **Date:** 2026-08-06
> **Objective:** Modelar personas y roles (CLIENTE / ADMINISTRADOR / TRABAJADOR) con relación many-to-many, exponer un CRUD de personas y un listado paginado con filtro por rol, dejando documentada la regla "Admin/Trabajador ⇒ Auth" y el filtro `hasAuth` para implementarse en el spec 12.

## Scope

**In:**

- Módulo NestJS `src/modules/people/` (subcarpetas `entities/`, `controllers/`, `services/`, `dtos/`) registrado en `AppModule`.
- Entidad `Person` (tabla `person`): `id`, `firstName`, `lastName`, `birthDate`, `address`, `dni` (único) y soft delete (`@DeleteDateColumn`).
- Entidad `Role` (tabla `role`): `id`, `name` (único), lista fija sembrada por migración: `CLIENTE`, `ADMINISTRADOR`, `TRABAJADOR`.
- Relación **many-to-many simple** `@ManyToMany` + `@JoinTable` con tabla intermedia `person_role` (PK compuesta `(personId, roleId)` → par único).
- Migración de esquema: crea `person`, `role`, `person_role` y siembra los 3 roles.
- `POST /people` — crear persona con `roleIds` opcionales.
- `PATCH /people/:id` — actualización parcial (incluye reemplazo de roles si se envía `roleIds`).
- `DELETE /people/:id` — borrado lógico (soft delete).
- `GET /people` — listado paginado (`PaginationDto` del spec 02) con filtro `roleName`.
- `GET /people/:id` — detalle con sus roles.

**Out of scope (for future specs):**

- Módulo `auth` (login, JWT, strategies) — spec 12.
- Implementar la regla "Admin/Trabajador ⇒ tiene Auth" (validación a nivel de servicio) — spec 12, cuando exista la tabla `auth`.
- **El filtro y campo `hasAuth`** del listado — spec 12 (requiere la tabla `auth`).
- CRUD de roles (son lista fija; sin endpoints).
- Búsqueda `search` por nombre/dni en el listado (descartada por decisión).
- Migración/limpieza de data existente.

## Data model

Cambio de esquema: 3 tablas nuevas.

```ts
// src/modules/people/entities/person.entity.ts (nuevo)
@Entity('person')
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  dni: string;

  @ManyToMany(() => Role, (role) => role.persons)
  @JoinTable({
    name: 'person_role',
    joinColumn: { name: 'personId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date | null;
}

// src/modules/people/entities/role.entity.ts (nuevo)
@Entity('role')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @ManyToMany(() => Person, (person) => person.roles)
  persons: Person[];
}
```

Convenciones:

- `birthDate` es `date` (solo fecha, sin hora).
- `address` es la dirección de vivienda (un solo campo de texto libre).
- `dni` único global; formato sugerido 8 dígitos (Perú) — ajustar según país si aplica.
- Sin columna `authId`/FK en `person`: la referencia la lleva `auth.personId` (spec 12). Una persona puede existir sin registro en `auth`.

DTOs:

```ts
// src/modules/people/dtos/person/create-person.dto.ts (nuevo)
export class CreatePersonDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Juan' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pérez' })
  lastName: string;

  @IsDateString()
  @ApiProperty({ example: '1990-05-15' })
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Av. Los Clavos 123' })
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '12345678' })
  dni: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayUnique()
  @ApiPropertyOptional({ example: [1, 2], description: 'IDs de roles' })
  roleIds?: number[];
}

// src/modules/people/dtos/person/update-person.dto.ts (nuevo)
export class UpdatePersonDto extends PartialType(CreatePersonDto) {}
```

Nota sobre `roleIds` en `PATCH`: si viene `undefined` los roles no se tocan; si viene `[]` se **limpian** todos los roles.

```ts
// src/modules/people/dtos/person/person.dto.ts (nuevo)
export class PersonDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Juan' }) firstName: string;
  @ApiProperty({ example: 'Pérez' }) lastName: string;
  @ApiProperty({ example: '1990-05-15' }) birthDate: string;
  @ApiProperty({ example: 'Av. Los Clavos 123' }) address: string;
  @ApiProperty({ example: '12345678' }) dni: string;
  @ApiProperty({ type: () => [RoleDto] }) roles: RoleDto[];
}

// src/modules/people/dtos/role/role.dto.ts (nuevo)
export class RoleDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'CLIENTE' }) name: string;
}

// src/modules/people/dtos/person/filter-person.dto.ts (nuevo)
export class FilterPersonDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'CLIENTE',
    description: 'Filtra por rol exacto',
  })
  roleName?: string;

  // hasAuth?: boolean  ← se implementa en el spec 12 (requiere la tabla auth)
}
```

## Implementation plan

1. Crear `Person` y `Role` entities con la relación many-to-many; generar migración (`npm run migration:add`) y añadir el seed de los 3 roles (`ON CONFLICT DO NOTHING`).
2. Crear `PeopleModule` (`TypeOrmModule.forFeature([Person, Role])`), registrarlo en `AppModule`.
3. Crear DTOs: `CreatePersonDto`, `UpdatePersonDto`, `PersonDto`, `RoleDto`, `FilterPersonDto`.
4. `PeopleService`: `create` (valida `roleIds` → 404, guarda con `UnitOfWork`), `update` (parcial, reemplaza roles si viene `roleIds`), `remove` (soft delete), `findAll` (paginado + filtro `roleName`), `findOne`.
5. `PeopleController` con los endpoints REST.
6. Tests unitarios (`test/unit/people/people.service.spec.ts`).
7. `npm run build`, `npm run lint`, `npm test`, verificación manual contra la BD.

## Acceptance criteria

- [ ] `POST /people { firstName, lastName, birthDate, address, dni }` → **201** con `PersonDto` y `roles: []`.
- [ ] `POST /people` con `roleIds` válidos → **201** con `roles` cargados.
- [ ] `roleIds` con un `id` inexistente → **404** y **no** se crea la persona (rollback).
- [ ] `dni` duplicado → **409**.
- [ ] `firstName`, `lastName`, `address`, `dni` vacíos u omitidos → **400**; `birthDate` inválida → **400**; `dni` con formato inválido → **400**.
- [ ] `PATCH /people/:id` actualiza solo los campos enviados; con `roleIds: []` limpia los roles; con `roleIds` presentes reemplaza el set.
- [ ] `DELETE /people/:id` → **204** y el registro queda con `deletedAt`; `GET /people` y `GET /people/:id` ya no lo devuelven.
- [ ] `GET /people` devuelve `PaginatedResult` (`data/total/page/limit/lastPage`) con `roles` en cada persona.
- [ ] `GET /people?roleName=CLIENTE` devuelve solo personas con ese rol exacto.
- [ ] `GET /people/:id` → detalle con roles; id inexistente → **404**.
- [ ] Migración aplica y los roles sembrados son `CLIENTE`, `ADMINISTRADOR`, `TRABAJADOR`.
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.
- [ ] `GET /people` **no** expone `hasAuth` todavía (diferido al spec 12).

## Decisions

- **Sí:** la FK de la relación Persona–Auth vive en `auth.personId` (spec 12), no en `person`. Una persona puede existir sin auth (caso clientes).
- **Sí:** many-to-many **simple** (`@ManyToMany` + `@JoinTable`) sin columnas extra en `person_role`; el par único lo garantiza la PK compuesta.
- **Sí:** roles como **lista fija** sembrada en migración; sin CRUD de roles ni endpoints.
- **Sí:** `soft delete` en `person` (`@DeleteDateColumn`), consistente con el deseo de no perder historial; `dni` se mantiene único incluso para filas borradas.
- **Sí:** `birthDate` como `date` (solo fecha).
- **Sí:** `dni` único global.
- **Sí:** módulo y endpoints con prefijo `people` (plural inglés).
- **Sí:** listado con filtro `roleName` + paginación del spec 02.
- **No:** filtro/campo `hasAuth` en este spec — requiere la tabla `auth` (spec 12). Se deja declarado en el `FilterPersonDto` como comentario para no perder el contrato.
- **No:** búsqueda `search` en el listado (descartada en la fase de preguntas).
- **No:** stub de la entidad `Auth` en este spec — se crea completa en el spec 12.
- **No:** implementar la validación "Admin/Trabajador ⇒ tiene Auth" ahora — imposible sin la tabla `auth`; se documenta y se implementa en el spec 12.

## Risks

| Risk                                                                                               | Mitigation                                                                                            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `hasAuth` y la regla "Admin/Trabajador ⇒ Auth" no implementables hasta que exista la tabla `auth`. | Se declaran en el spec y se difieren explícitamente al spec 12; no se improvisa una tabla intermedia. |
| `dni` único incluye filas con soft delete → no se puede reutilizar un dni de una persona borrada.  | Aceptado y documentado; si se necesita reactivar, se restaura `deletedAt = null` manualmente.         |
| Personas creadas ahora con roles `ADMIN`/`TRABAJADOR` sin `auth` (regla aún no aplicable).         | Riesgo temporal de desarrollo; se revisa/limpia la data al implementar el spec 12.                    |
| Seed de roles en migración duplica filas si se re-aplica.                                          | `ON CONFLICT DO NOTHING` sobre el unique `name`.                                                      |

## What is **not** in this spec

- Módulo `auth`: login, registro, JWT, strategies, guards.
- Validación "Admin/Trabajador ⇒ tiene Auth".
- Campo/filtro `hasAuth` en el listado.
- CRUD de roles.
- Búsqueda `search` por nombre/dni.
- Soft delete de roles.

Cada uno de esos, si llega, va en su propio spec.
