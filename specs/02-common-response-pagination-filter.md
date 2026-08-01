# SPEC 02 — Infra común: sobre de respuesta, paginación y filtros reutilizables

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-01
> **Objective:** Introducir un sobre de respuesta uniforme `{ data, message }` (con paginación en listados), un interceptor global que lo aplica, y DTOs base de paginación/filtro reutilizables por todos los módulos — dejando los errores en manos del manejo de excepciones de NestJS.

## Scope

**In:**

- `src/common/dtos/pagination.dto.ts`: `PaginationDto` con `page`, `limit`, con validaciones y `@Type`.
- `src/common/interceptors/response.interceptor.ts`: interceptor global que envuelve cualquier retorno de controller en `{ data, message }`, con `message` genérico por verbo HTTP.
- `src/common/interfaces/paginated-result.ts`: interfaz `PaginatedResult<T>` (`{ data, total, page, limit, lastPage }`) que los services devuelven en los `findAll`.
- Lógica de paginación en el interceptor: si el valor retornado es `PaginatedResult`, la respuesta final incluye `total`, `page`, `limit`, `lastPage` (`Math.ceil(total/limit)`, `0` si `total=0`).
- Mensajes genéricos por verbo: `GET → OK`, `POST → Creado`, `PATCH → Actualizado`, `DELETE → Eliminado`.
- Convención: cada módulo crea su `XxxFilterDto extends PaginationDto` con sus filtros específicos (se usa en SPEC 03). El campo `search` buscará **insensible a tildes y mayúsculas** (ver migración).
- Migración que habilita la extensión **`unaccent`** de PostgreSQL (`CREATE EXTENSION IF NOT EXISTS "unaccent"`), generada con `npm run migration:add EnableUnaccent` (el nombre de clase/timestamp lo pone el CLI).
- Errores: se mantiene el formato de excepciones por defecto de NestJS (sin sobre custom).

**Out of scope (for future specs):**

- CRUD de `attributes` (es SPEC 03).
- CRUD de `products` (esqueleto actual; queda para su spec).
- Filtros avanzados (operadores `>`, `<`, `in`, full-text, comparadores) — solo `search` simple con unaccent en el futuro.
- Sobre de error personalizado o códigos de error propios.
- Seeders.
- Refactor del patrón sobre otros módulos existentes (solo se define la infra; el primer consumidor es SPEC 03).

## Data model

```ts
// src/common/dtos/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

```ts
// src/common/interfaces/paginated-result.ts
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  lastPage: number; // Math.ceil(total / limit), 0 si total === 0
}
```

```ts
// src/common/interceptors/response.interceptor.ts (esqueleto)
// Mensajes por verbo: GET → 'OK', POST → 'Creado', PATCH → 'Actualizado',
// DELETE → 'Eliminado', otros → 'OK'.
// Si el handler retorna PaginatedResult<T> → { ...paginated, message }
// Si no → { data: T, message }
```

```sql
-- Migración generada con `npm run migration:add EnableUnaccent`
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- down: DROP EXTENSION IF EXISTS "unaccent";
```

Convenciones:

- El interceptor se registra como `APP_INTERCEPTOR` global (no en cada controller).
- Los services de `findAll` devuelven `PaginatedResult<T>`; los demás handlers devuelven `T` o `null`.
- El filtro `search` (SPEC 03) usará `unaccent(LOWER(col)) ILIKE unaccent('%q%')`.
- Sin `orderBy`/`order` en esta versión — el orden queda al criterio por defecto de la consulta (p. ej. `id`).

## Implementation plan

1. Crear `src/common/dtos/pagination.dto.ts` con `page`/`limit` validados y defaults (`1`/`20`).
2. Crear `src/common/interfaces/paginated-result.ts` con `PaginatedResult<T>`.
3. Crear `src/common/interceptors/response.interceptor.ts`: envuelve el retorno en `{ data, message }` con mensaje por verbo HTTP; si el retorno tiene la forma de `PaginatedResult` (presenta `total`/`page`/`limit`), calcula `lastPage` y expone `total`, `page`, `limit`, `lastPage`.
4. Registrar el interceptor como `APP_INTERCEPTOR` en `AppModule` (providers globales).
5. Ejecutar `npm run migration:add EnableUnaccent` y revisar que la migración genere `CREATE EXTENSION IF NOT EXISTS "unaccent"` (con `down` que la dropea). Aplicar con `npm run migration:run` contra la BD de docker.
6. `npm run build` y `npm run lint` — sin errores. Verificación manual: levantar la app, llamar un endpoint y confirmar el sobre `{ data, message }` (primer consumidor real: SPEC 03).

Nota: el paso 4/6 se verifica "en seco" hasta SPEC 03 porque aún no hay endpoints que devuelvan `PaginatedResult`; el interceptor se prueba en ese spec.

## Acceptance criteria

- [x] `PaginationDto` existe en `src/common/dtos/pagination.dto.ts` con `page` (default `1`) y `limit` (default `20`), ambos opcionales, numéricos y con `@Type`.
- [x] `PaginatedResult<T>` existe en `src/common/interfaces/paginated-result.ts` con `data`, `total`, `page`, `limit`, `lastPage`.
- [x] `ResponseInterceptor` existe en `src/common/interceptors/response.interceptor.ts` y está registrado como `APP_INTERCEPTOR` en `AppModule`.
- [x] `GET → OK`, `POST → Creado`, `PATCH → Actualizado`, `DELETE → Eliminado` (mensajes por verbo).
- [x] Un retorno no-paginado se envuelve como `{ data, message }`.
- [x] Un retorno `PaginatedResult` se envuelve como `{ data, message, total, page, limit, lastPage }`.
- [x] `lastPage === Math.ceil(total / limit)` y `lastPage === 0` cuando `total === 0`.
- [x] La migración `EnableUnaccent` habilita la extensión `unaccent` y `npm run migration:run` la aplica sin errores.
- [x] `npm run build` compila sin errores de tipos.
- [x] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** errores vía excepciones de NestJS, sin sobre de error propio. Formato por defecto de Nest; añadir otro sería mantenimiento sin valor.
- **Sí:** interceptor global para envolver respuestas (`APP_INTERCEPTOR`). Un solo lugar, cero repetición en controllers.
- **Sí:** `{ data, message }` con `message` genérico por verbo HTTP (`OK`/`Creado`/`Actualizado`/`Eliminado`). Simple, sin catálogo de mensajes por recurso.
- **Sí:** las mutations devuelven `data` (entidad/DTO) recién creado/actualizado para que el front haga auto-reload.
- **Sí:** paginación siempre activa con defaults `page=1, limit=20`, y `PaginatedResult<T>` con `lastPage = Math.ceil(total/limit)` (0 si total=0). Evita endpoints que devuelven tablas enteras.
- **Sí:** cada módulo declara `XxxFilterDto extends PaginationDto` con sus filtros específicos.
- **Sí:** `PaginationDto` solo con `page`/`limit`. **No:** `orderBy`/`order` — se descartaron para esta versión; el orden queda al default de la consulta.
- **Sí:** extensión `unaccent` habilitada vía migración, para búsquedas insensibles a tildes (la consume SPEC 03).
- **Sí:** response-DTOs con método estático `fromEntity` (convención que se aplicará en SPEC 03). Explícito, tipeado, sin depender de `@Expose`.
- **No:** paginación opt-in (sin `page`/`limit` → todo). Siempre paginado para evitar N+1 de memoria.

## Risks

| Risk                                                                                               | Mitigation                                                                                                         |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| La extensión `unaccent` requiere privilegios de superusuario en Postgres.                          | El usuario `postgres` del `docker-compose` es superusuario; `CREATE EXTENSION` aplica sin fricción.                |
| El interceptor podría malinterpretar un objeto de negocio que tenga `total`/`page` por casualidad. | Se detecta la forma `PaginatedResult` con `Array.isArray(data) && total !== undefined`; casos así son improbables. |
| El interceptor envuelve también respuestas `StreamableFile`/streams si algún día existen.          | Se excluyen explícitamente los retornos de tipo stream en el interceptor.                                          |

## What is **not** in this spec

- CRUD de `attributes` (es SPEC 03).
- CRUD de `products` (esqueleto actual; queda para su spec).
- Filtros avanzados (operadores `>`, `<`, `in`, full-text, comparadores).
- Sobre de error personalizado o códigos de error propios.
- Seeders.
- Refactor del patrón sobre otros módulos existentes.

Cada uno de esos, si llega, va en su propio spec.
