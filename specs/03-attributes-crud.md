# SPEC 03 — CRUD de attributes y attribute_values

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-01
> **Objective:** Implementar el CRUD completo de `Attribute` y `AttributeValue` (endpoints, services y DTOs) usando DTOs de respuesta en vez de entidades, el sobre de respuesta `{ data, message }` de SPEC 02 y paginación/filtros con `PaginationDto`.

## Scope

**In:**

- Endpoints CRUD para `Attribute` (`POST/GET/GET:id/PATCH/DELETE`) en `src/modules/attributes/controllers/attributes.controller.ts` bajo `/attributes`.
- Endpoints CRUD para `AttributeValue` (`POST/GET/GET:id/PATCH/DELETE`) en controller propio bajo `/attribute-values`.
- Endpoint anidado `GET /attributes/:id/values` (pagina los valores de un atributo, usando `AttributeValueFilterDto` con `attributeId` fijo al de la URL).
- Services `AttributesService` y `AttributeValuesService` con `@InjectRepository`.
- `Attribute.name` pasa a **único** (migración nueva).
- DTOs de entrada: `CreateAttributeDto`, `UpdateAttributeDto`, `CreateAttributeValueDto`, `UpdateAttributeValueDto`.
- DTOs de respuesta planos con `fromEntity` estático: `AttributeDto` (`{ id, name }`), `AttributeValueDto` (`{ id, value, attributeId }`).
- Filtros: `AttributeFilterDto` (`search`) y `AttributeValueFilterDto` (`search`, `attributeId`), ambos `extends PaginationDto`; búsqueda con `unaccent(LOWER(col)) ILIKE unaccent('%q%')`.
- Respuestas paginadas `PaginatedResult` en los `findAll` (envueltas por el interceptor de SPEC 02).
- Excepciones: `NotFoundException` (404) si no existe; `ConflictException` (409) en unicidad violada o borrado restringido.
- Borrado: `RESTRICT` — borrar un `Attribute` con values → 409; `AttributeValue` referenciado en `product_attribute` → 409 por FK.
- Registrar `AttributesController` y `AttributeValuesController` en `AttributesModule`.

**Out of scope (for future specs):**

- Gestión de `ProductAttribute` desde la API (crear producto con atributos) — pertenece al CRUD de `products`.
- Validación cruzada `attributeValueId.attributeId == attributeId` en `ProductAttribute` — diferida del SPEC 01.
- CRUD de `products`.
- Filtros avanzados (operadores `>`, `<`, `in`, full-text).
- Soft delete / restauración.

## Data model

```ts
// src/modules/attributes/dtos/attribute/attribute.dto.ts (respuesta)
export class AttributeDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;

  static fromEntity(a: Attribute): AttributeDto {
    const dto = new AttributeDto();
    dto.id = a.id;
    dto.name = a.name;
    return dto;
  }
}
```

```ts
// src/modules/attributes/dtos/attribute-value/attribute-value.dto.ts (respuesta)
export class AttributeValueDto {
  @ApiProperty() id: number;
  @ApiProperty() value: string;
  @ApiProperty() attributeId: number;

  static fromEntity(av: AttributeValue): AttributeValueDto {
    const dto = new AttributeValueDto();
    dto.id = av.id;
    dto.value = av.value;
    dto.attributeId = av.attribute?.id ?? av.attributeId;
    return dto;
  }
}
```

```ts
// src/modules/attributes/dtos/attribute/filter-attribute.dto.ts
export class AttributeFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  search?: string;
}

// src/modules/attributes/dtos/attribute-value/filter-attribute-value.dto.ts
export class AttributeValueFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ required: false })
  attributeId?: number;
}
```

```ts
// src/modules/attributes/dtos/attribute/create-attribute.dto.ts
export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Color' })
  name: string;
}
// UpdateAttributeDto: mismo shape, todos opcionales (@IsOptional).
// CreateAttributeValueDto / UpdateAttributeValueDto:
//   value: string (no vacío); attributeId: number (opcional en update).
```

Convenciones:

- El `search` se aplica con `unaccent(LOWER(col)) ILIKE unaccent('%q%')` (requiere la extensión de SPEC 02).
- Los services de `findAll` devuelven `PaginatedResult<AttributeValueDto | AttributeDto>`.
- `findOne`/métodos de escritura devuelven el DTO plano; el interceptor de SPEC 02 los envuelve en `{ data, message }`.

## Implementation plan

1. Crear DTOs de respuesta `AttributeDto` y `AttributeValueDto` con `fromEntity` estático.
2. Crear `AttributeFilterDto` y `AttributeValueFilterDto` (ambos `extends PaginationDto`).
3. Crear DTOs de entrada: `CreateAttributeDto`, `UpdateAttributeDto`, `CreateAttributeValueDto`, `UpdateAttributeValueDto`.
4. Crear `AttributesService` (CRUD + `findAll` paginado con `search` unaccent + borrado RESTRICT) y registrarlo.
5. Crear `AttributeValuesService` (CRUD + `findAll` paginado con `search`/`attributeId` + borrado con manejo de FK) y registrarlo.
6. Crear `AttributesController` (`/attributes`) y `AttributeValuesController` (`/attribute-values`) + endpoint `GET /attributes/:id/values`.
7. Registrar controllers en `AttributesModule`.
8. Migración para `attribute.name` único: `npm run migration:add AttributeNameUnique`, aplicar con `npm run migration:run`.
9. `npm run build` y `npm run lint` — sin errores; probar endpoints contra la BD de docker y verificar el sobre `{ data, message }` + paginación.

## Acceptance criteria

- [x] Existen `AttributesController` (`/attributes`) y `AttributeValuesController` (`/attribute-values`), registrados en `AttributesModule`.
- [x] Existe `GET /attributes/:id/values` que pagina los valores del atributo.
- [x] `Attribute` soporta POST, GET (listado paginado), GET por id, PATCH y DELETE.
- [x] `AttributeValue` soporta POST, GET (listado paginado), GET por id, PATCH y DELETE.
- [x] Todos los `findAll` devuelven `PaginatedResult` y la respuesta final incluye `data`, `message`, `total`, `page`, `limit`, `lastPage`.
- [x] Las respuestas usan DTOs planos (`AttributeDto`, `AttributeValueDto`) con `fromEntity` — nunca la entidad cruda.
- [x] `AttributeValueDto` expone `attributeId` plano.
- [x] `search` filtra sin distinguir tildes ni mayúsculas (unaccent).
- [x] `AttributeValueFilterDto.attributeId` filtra por atributo.
- [x] Crear/actualizar con nombre de atributo duplicado responde **409**.
- [x] Crear/actualizar `AttributeValue` con `(attributeId, value)` duplicado responde **409**.
- [x] `findOne`/`update`/`delete` con id inexistente responde **404**.
- [x] Borrar un `Attribute` con values responde **409** (no borra en cascada).
- [x] Borrar un `AttributeValue` referenciado en `product_attribute` responde **409**.
- [x] La migración hace `attribute.name` único y `npm run migration:run` la aplica sin errores.
- [x] `npm run build` compila sin errores de tipos.
- [x] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** controller separado para `AttributeValue` (`/attribute-values`) + endpoint anidado `GET /attributes/:id/values` solo para listar. CRUD limpio, listado por atributo como conveniencia.
- **Sí:** borrado `RESTRICT` (409) en vez de CASCADE/soft-delete. Evita destruir datos referenciados por `product_attribute`; el front decide borrar los values primero.
- **Sí:** `attribute.name` único vía migración. Los duplicados se rechazan en la BD y se reportan como 409.
- **Sí:** DTOs de respuesta planos (`{ id, value, attributeId }`) con `fromEntity` estático. Más simple para tablas/selects del front; el anidado se agrega solo si se pide.
- **Sí:** filtros `search` + `attributeId` con `unaccent` (extensión de SPEC 02), ambos extendiendo `PaginationDto`.
- **Sí:** errores con `NotFoundException` (404) y `ConflictException` (409). Formato por defecto de Nest (SPEC 02).
- **Sí:** el update de `AttributeValue` acepta `attributeId` opcional (permite mover el valor de atributo), validando la unicidad `(attributeId, value)` → 409.
- **No:** gestión de `ProductAttribute` ni validación cruzada `attributeValueId.attributeId == attributeId` — fuera de alcance (CRUD de `products`).

## Risks

| Risk                                                                                           | Mitigation                                                                                               |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Error 409 en borrado por FK de `product_attribute` depende de que existan filas referenciadas. | Manejar `QueryFailedError` (código `23503` de Postgres) en el delete y traducirlo a `ConflictException`. |
| `unaccent(LOWER(col)) ILIKE` sin índice puede degradar listados grandes.                       | Datos de catálogo pequeños por ahora; se evalúa índice `GIN`/`trgm` si crece (spec futuro).              |
| `attributeId` de la URL en `GET /attributes/:id/values` puede no existir.                      | Validar existencia del `Attribute` → 404 antes de paginar.                                               |
| `attribute.name` único rompe inserts si ya hay duplicados en la BD.                            | Revisar datos antes de aplicar la migración (único riesgo de migración).                                 |

## What is **not** in this spec

- Gestión de `ProductAttribute` desde la API.
- Validación cruzada `attributeValueId.attributeId == attributeId` en `ProductAttribute`.
- CRUD de `products`.
- Filtros avanzados (operadores `>`, `<`, `in`, full-text).
- Soft delete / restauración.

Cada uno de esos, si llega, va en su propio spec.
