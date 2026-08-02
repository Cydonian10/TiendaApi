# SPEC 04 — Batch de attributes con UnitOfWork + tests del módulo

> **Status:** Implementado
> **Depends on:** SPEC 02, SPEC 03
> **Date:** 2026-08-02
> **Objective:** Ruta `POST /attributes/batch` que crea un atributo junto con sus values en una transacción (UnitOfWork), reutilizando el atributo si ya existe, y tests unitarios para los tres services de `attributes`.

## Scope

**In:**

- `POST /attributes/batch` en `AttributesController`: body `{ name, values: [{ value }] }`.
- `AttributesBatchService` con `UnitOfWork` (usa `qr.manager.getRepository(...)`; repos solo vía transacción).
- Semántica: si `name` no existe → crea atributo y sus values (**201**); si existe → lo reutiliza e inserta solo los values nuevos (**200**). Duplicado dentro del lote → 409 + rollback (unique `(attributeId, value)`).
- DTOs: `CreateAttributeBatchDto` (+ `CreateAttributeBatchValueDto` anidado), `AttributeWithValuesDto` (`{ id, name, values: AttributeValueDto[] }`).
- Tests unitarios en `test/unit/attributes/`: `attributes.service.spec.ts`, `attribute-values.service.spec.ts`, `attributes-batch.service.spec.ts` (repos mokeados; `QueryBuilder` mokeado para `findAll`).
- Registrar `AttributesBatchService` en `AttributesModule`.

**Out of scope (for future specs):**

- Tests e2e del módulo `attributes`.
- Gestión de `ProductAttribute` desde la API (CRUD de `products`).
- Upsert total de attributes (actualizar name de un existente desde el batch).
- CRUD de `products`.

## Data model

```ts
// src/modules/attributes/dtos/attribute/create-attribute-batch.dto.ts
export class CreateAttributeBatchValueDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Rojo' })
  value: string;
}

export class CreateAttributeBatchDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Color' })
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeBatchValueDto)
  @ApiProperty({ type: () => [CreateAttributeBatchValueDto] })
  values: CreateAttributeBatchValueDto[];
}
```

```ts
// src/modules/attributes/dtos/attribute/attribute-with-values.dto.ts (respuesta)
export class AttributeWithValuesDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: () => [AttributeValueDto] })
  values: AttributeValueDto[]; // reusa AttributeValueDto.fromEntity (con attributeId plano)
}
```

Convenciones:

- `AttributeValueDto.fromEntity` ya expone `attributeId` plano (SPEC 03); se reutiliza tal cual en `values`.
- El batch devuelve el atributo con **todos** sus values (los preexistentes + los nuevos insertados) cuando reutiliza un atributo existente.
- El interceptor de SPEC 02 envuelve la respuesta en `{ data, message }`.

## Implementation plan

1. Crear DTOs de entrada `CreateAttributeBatchValueDto` y `CreateAttributeBatchDto` (`name` no vacío; `values` no vacío, máx. 50, cada `value` no vacío).
2. Crear DTO de respuesta `AttributeWithValuesDto` con `values: AttributeValueDto[]` (convenience `fromEntity(attribute, values)`).
3. Crear `AttributesBatchService` inyectando solo `UnitOfWork`. Dentro de `execute(qr)`:
   - `qr.manager.getRepository(Attribute)` y `qr.manager.getRepository(AttributeValue)`.
   - `findOneBy({ name })` → si no existe, `create` + `save` (atributo nuevo).
   - Cargar values existentes del atributo; insertar solo los values del lote que no existan.
   - Duplicados dentro del lote contra values ya insertados → unique de BD → `ConflictException` (rollback completo, no queda el atributo nuevo).
   - Devolver `{ attribute, values: AttributeValueDto[], created: boolean }`.
4. Controller: `@Post('batch')` en `AttributesController` con `@Res({ passthrough: true })` → `res.status(created ? 201 : 200)`.
5. Registrar `AttributesBatchService` en `AttributesModule`.
6. Crear `test/unit/attributes/attributes.service.spec.ts` y `attribute-values.service.spec.ts`: repos mokeados; `QueryBuilder` mokeado con chain (`andWhere/skip/take → this`, `getManyAndCount → [rows, total]`).
7. Crear `test/unit/attributes/attributes-batch.service.spec.ts`: `UnitOfWork` mokeado (`execute` invoca `work(qr)` con `qr.manager.getRepository` fake).
8. `npm run build`, `npm run lint`, `npm test`; smoke test de `POST /attributes/batch` contra la BD de docker.

## Acceptance criteria

- [x] `POST /attributes/batch` crea atributo + values en una transacción; responde **201** con `{ data: { id, name, values: [{ id, value, attributeId }] }, message: 'Creado' }`.
- [x] Si el atributo ya existe por `name`, lo reutiliza, inserta solo los values nuevos y responde **200** con todos sus values.
- [x] `values` vacío → **400**; más de 50 → **400**; algún `value` vacío → **400`.
- [x] Value duplicado dentro del lote → **409** y rollback: no queda ningún value insertado ni (si era nuevo) el atributo creado.
- [x] Los tres spec files corren verdes en `npm test`.
- [x] `npm run build` y `npm run lint` pasan sin errores.

## Decisions

- **Sí:** reutilizar atributo por `name` (semántica upsert-lite); los duplicados reales de values → 409 + rollback.
- **Sí:** status **201** si crea atributo nuevo, **200** si reutiliza, vía `@Res({ passthrough: true })`. Nota: el `ResponseInterceptor` de SPEC 02 fija `message` según el método HTTP (POST → "Creado"), no según el status; conviven sin problema.
- **Sí:** `values` no vacío y máx. 50 (`@ArrayNotEmpty` + `@ArrayMaxSize`).
- **Sí:** `AttributeWithValuesDto` reutilizando `AttributeValueDto` (values con `attributeId` plano).
- **Sí:** tests unitarios de los tres services con repos mokeados; `findAll` con mock del `QueryBuilder`.
- **No:** tests e2e del módulo en este spec (spec futuro).

## Risks

| Risk                                                                                         | Mitigation                                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Reutilizar por `name` con values que ya existen en BD: inserción "no-op" (200 sin cambios).  | Comportamiento elegido (reutilizar); documentado en los criterios.                       |
| Duplicados intra-batch dependen del unique de BD; si el value ya existía, se salta (no 409). | Coherente con "reutilizar"; el 409 intra-batch solo aplica a values no existentes.       |
| `@Res` puede interferir con el `ResponseInterceptor` (envuelve la respuesta).                | `passthrough: true` mantiene el interceptor operativo.                                   |
| Mock del `QueryBuilder` divergente del runtime real de TypeORM.                              | Probar el batch y el `findAll` contra la BD real en el smoke test como red de seguridad. |

## What is **not** in this spec

- Tests e2e del módulo `attributes`.
- Gestión de `ProductAttribute` desde la API.
- Upsert total de attributes (actualizar `name` de un existente desde el batch).
- CRUD de `products`.

Cada uno de esos, si llega, va en su propio spec.
