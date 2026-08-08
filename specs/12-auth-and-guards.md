# SPEC 12 — Auth y guards

> **Status:** Implementado
> **Depends on:** SPEC 02 (response/pagination), SPEC 11 (people/roles)
> **Date:** 2026-08-07
> **Objective:** Crear la tabla `auth` (1:1 con `person`), crear automáticamente el registro de auth al crear/actualizar una persona con rol TRABAJADOR o ADMINISTRADOR, exponer `POST /auth/login` (JWT access token con bcrypt) y añadir guards globales con decoradores `@Public`, `@Roles` y `@CurrentUser`.

## Scope

**In:**

- Entidad `Auth` (tabla `auth`): `id`, `email` (único), `password` (nullable), `google` (boolean, default false), `personId` (FK 1:1 única a `person`).
- Migración que crea la tabla `auth` con sus constraints.
- `CreatePersonDto` / `UpdatePersonDto`: campos opcionales `email` y `password`. **Obligatorios en el servicio** cuando los roles asignados incluyen `TRABAJADOR` o `ADMINISTRADOR`.
- `PeopleService`: al crear/actualizar una persona con rol TRABAJADOR/ADMINISTRADOR, crea el `Auth` en la misma transacción (`UnitOfWork`) con `password` hasheado con bcrypt y `google: false`. Si ya existe un auth, se conserva (y se actualiza email/password si vienen).
- `PersonDto` con campo `hasAuth: boolean` y `auth: { id, email, google } | null`.
- `FilterPersonDto` con filtro opcional `hasAuth`.
- `GET /people` y `GET /people/:id` exponen `hasAuth` y `auth` (con email) y respetan el filtro `hasAuth`.
- Módulo `src/modules/auth/` con:
  - `POST /auth/login` (`{ email, password }`) → `{ accessToken, user: { id, email, personId, roles } }`. **Ruta pública** (`@Public`).
  - `GET /auth/me` → devuelve el usuario autenticado desde el token.
- Guards globales (APP_GUARD):
  - `JwtAuthGuard`: valida el Bearer token con `@nestjs/jwt`; respeta `@Public`; inyecta el payload en `req.user`.
  - `RolesGuard`: combina auth + roles; si la ruta lleva `@Roles(...)` exige que el usuario tenga alguno de esos roles; respeta `@Public`.
- Decoradores: `@Public()`, `@Roles(...roles)`, `@CurrentUser()`.
- Dependencias nuevas: `bcrypt`, `@types/bcrypt` (dev), `@nestjs/jwt`.
- Config JWT vía `.env`: `JWT_SECRET` y `JWT_EXPIRES_IN` (ya presentes).

**Out of scope (for future specs):**

- Refresh tokens, logout/invalidación de tokens, rate limiting.
- OAuth de Google (login con Google; solo se modela el flag `google`).
- Registro público de cuentas (el auth se crea vía people).
- Cambio de password con confirmación / recuperación.
- CRUD de auth (solo login y me).
- Proteger con roles los endpoints existentes (se deja listo el mecanismo, no se aplica salvo `/auth/me`).

## Data model

Cambio de esquema: 1 tabla nueva.

```ts
// src/modules/auth/entities/auth.entity.ts (nuevo)
@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'boolean', default: false })
  google: boolean;

  @OneToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Person;

  @Column({ type: 'integer' })
  personId: number;
}
```

En `Person` (inverso de la relación, sin columna extra):

```ts
// src/modules/people/entities/person.entity.ts (modificado)
@OneToOne(() => Auth, (auth) => auth.person)
auth?: Auth | null;
```

Convenciones:

- `email` único global; formato validado (`@IsEmail`).
- `password` es nullable solo para cuentas `google: true` (aún no hay flujo OAuth; se deja modelado).
- `personId` es FK 1:1 → una persona tiene como máximo un auth.
- Borrado en cascada: al eliminar físicamente la persona se elimina su auth.

DTOs nuevos/modificados:

```ts
// src/modules/auth/dtos/auth/login.dto.ts (nuevo)
export class LoginDto {
  @IsEmail() @ApiProperty({ example: 'admin@ferreteria.com' })
  email: string;

  @IsString() @IsNotEmpty() @ApiProperty({ example: 'secret123' })
  password: string;
}

// create-person.dto.ts (modificado): se añaden
@IsOptional() @IsEmail()
@ApiPropertyOptional({ example: 'juan@correo.com' })
email?: string;

@IsOptional() @IsString() @MinLength(6)
@ApiPropertyOptional({ example: 'secret123' })
password?: string;

// filter-person.dto.ts (modificado): se añade
@IsOptional()
@Transform(({ value }) => value === 'true')
@IsBoolean()
@ApiPropertyOptional({ example: true })
hasAuth?: boolean;

// person.dto.ts (modificado): se añaden
@ApiProperty({ example: false, description: 'Tiene registro de auth' })
hasAuth: boolean;

@ApiProperty({
  example: { id: 1, email: 'admin@correo.com', google: false },
  description: 'Registro de auth asociado (null si no tiene)',
})
auth: { id: number; email: string; google: boolean } | null;
```

## Implementation plan

1. Instalar `bcrypt`, `@types/bcrypt` y `@nestjs/jwt`.
2. Crear entidad `Auth` y relación 1:1 en `Person`; generar migración (`npm run migration:add Auth`) y aplicarla.
3. Crear util `src/common/utils/password.ts` (`hashPassword`, `comparePassword` con bcrypt).
4. Crear DTOs: `LoginDto`, campos `email`/`password` en `CreatePersonDto`, filtro `hasAuth`, `hasAuth` en `PersonDto`.
5. Crear decoradores y guards: `@Public`, `@Roles`, `@CurrentUser`, `JwtAuthGuard`, `RolesGuard`; registrar como APP_GUARD.
6. Crear `AuthService` (login, me) y `AuthController`; `AuthModule` con `JwtModule.registerAsync` leyendo `.env`.
7. Modificar `PeopleService`: validar email/password cuando roles incluyen TRABAJADOR/ADMINISTRADOR; crear/actualizar el auth en la misma transacción; cargar `hasAuth` en `findAll`/`findOne`; aplicar filtro `hasAuth`.
8. Registrar `AuthModule` en `AppModule`.
9. Actualizar tests de `people.service.spec.ts` y añadir `auth.service.spec.ts`.
10. `npm run build`, `npm run lint`, `npm test` y verificación manual (login real contra BD).

## Acceptance criteria

- [ ] Migración crea `auth` con `email` único, `password` nullable, `google` default false y `personId` único con FK a `person`.
- [ ] `POST /people` sin rol TRABAJADOR/ADMINISTRADOR no exige email/password → **201** sin auth (`hasAuth: false`).
- [ ] `POST /people` con rol TRABAJADOR o ADMINISTRADOR sin email o sin password → **400** y no se crea la persona.
- [ ] `POST /people` con rol TRABAJADOR/ADMINISTRADOR y email+password → **201**; se crea `auth` con `password` hasheado (bcrypt) y `google: false`; la persona responde `hasAuth: true`.
- [ ] Email duplicado al crear auth → **409** (rollback).
- [ ] `PATCH /people/:id` que añade rol TRABAJADOR/ADMINISTRADOR a una persona sin auth exige email/password y crea el auth.
- [ ] `PATCH` a persona con rol TRABAJADOR/ADMINISTRADOR con email/password nuevos actualiza el auth existente (password re-hasheado).
- [ ] `PATCH` que quita los roles TRABAJADOR/ADMINISTRADOR conserva el auth (no se borra).
- [ ] `GET /people` devuelve `hasAuth` y `auth` (id, email, google) por persona; `GET /people?hasAuth=true` filtra solo las que tienen auth; `hasAuth=false` filtra las que no.
- [ ] `POST /auth/login` con credenciales correctas → **200** con `accessToken` y `user` (id, email, personId, roles).
- [ ] `POST /auth/login` con email inexistente, password incorrecto, o cuenta `google: true` → **401**.
- [ ] `GET /auth/me` con token válido → **200** con el usuario del token; sin token o token inválido → **401**.
- [ ] Ruta protegida sin token → **401**; con token pero sin rol requerido → **403**.
- [ ] `@Public()` permite acceso sin token.
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.

## Decisions

- **Sí:** la FK vive en `auth.personId` (1:1, `@OneToOne` + `@JoinColumn`); en `person` solo el lado inverso sin columna, consistente con spec 11.
- **Sí:** el auth se crea automáticamente en la transacción de people cuando el rol es TRABAJADOR/ADMINISTRADOR. Sin endpoint de registro separado.
- **Sí:** email/password obligatorios a nivel de servicio (no decorador condicional), para poder dar mensaje claro y mantener validación simple.
- **Sí:** bcrypt (salt 10) para hash; se instala como dependencia nueva.
- **Sí:** JWT access token solo, vía `@nestjs/jwt`; secret y expiración desde `.env` (`JWT_SECRET`, `JWT_EXPIRES_IN`).
- **Sí:** `google` como flag booleano y `password` nullable; el flujo OAuth de Google va a otro spec.
- **Sí:** guards globales (APP_GUARD) `JwtAuthGuard` + `RolesGuard` combinado, con `@Public`, `@Roles` y `@CurrentUser`.
- **Sí:** el listado expone `hasAuth` y lo filtra (pendiente del spec 11, ahora posible).
- **Sí:** el listado expone el objeto `auth` con `id`, `email` y `google` para conocer el email sin exponer el hash del password.
- **Sí:** al quitar los roles TRABAJADOR/ADMINISTRADOR el auth se conserva (no se borra).
- **No:** refresh tokens, logout, rate limiting, OAuth de Google, registro público, CRUD de auth.
- **No:** aplicar roles a los endpoints existentes ahora; solo se deja el mecanismo.

## Risks

| Risk                                                                              | Mitigation                                                                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Personas TRABAJADOR/ADMINISTRADOR creadas antes de esta migración no tienen auth. | El filtro `hasAuth` permite detectarlas; se pueden crear/actualizar vía `PATCH` o data manual.                                      |
| Filtrar por `hasAuth` con `leftJoinAndSelect` puede combinar filas por roles.     | La query paginada usa `leftJoinAndSelect`; el filtro `hasAuth` se aplica sobre el alias del auth. Se valida en verificación manual. |
| `@Transform` de booleano en query: `hasAuth=false` como string.                   | Se transforma `value === 'true'` para no caer en `Boolean('false') === true`.                                                       |
| `@IsEmail` de `class-validator` añade dependencia de validación de email.         | Ya incluido en `class-validator` (dependencia existente).                                                                           |

## What is **not** in this spec

- Refresh tokens, logout, invalidación/rotación de tokens.
- Login con Google (OAuth); solo el flag `google`.
- Registro público de cuentas.
- CRUD de auth.
- Aplicar `@Roles` a los endpoints existentes de otras features.
- Cambio/recuperación de password.

Cada uno de esos, si llega, va en su propio spec.
