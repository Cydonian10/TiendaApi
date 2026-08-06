# SPEC 08 — Módulo measurement-units: CRUD de unidades y unidades por base-product

> **Status:** Draft
> **Depends on:** SPEC 02 (response/pagination/filter), SPEC 05 (base-products)
> **Date:** 2026-08-06
> **Objective:** Implementar el módulo measurement-units con CRUD de unidades de medida (name y value únicos, listado paginado con búsqueda) y la gestión de unidades por base-product (listar/agregar/editar/quitar) bajo `/base-products/:baseProductId/units`, con `factor` opcional y una única unidad principal por base-product garantizada por unique parcial en la BD.

## Scope

**In:**

- `MeasurementUnitsModule` en `src/modules/measurement-units/` registrado en `AppModule`.
- CRUD de `MeasurementUnit` (tabla `measurement-unit`) bajo `/measurement-units`: `POST`, `GET` (paginado + `search`), `GET :id`, `PATCH :id`, `DELETE :id`.
- `name` y `value` **únicos** → **409** en POST/PATCH.
- Endpoints de `ProductUnit` (tabla `product-unit`) anidados bajo `/base-products/:baseProductId/units`:
  - `GET` → lista las unidades del base-product.
  - `POST` `{ unitId, factor?, isMain? }` → asocia una unidad; valida baseProduct (404), unidad (404), no duplicada (409); `isMain:true` degrada la principal anterior.
  - `PATCH /:unitId` `{ factor?, isMain? }` → edita `factor`/`isMain`; `isMain:true` degrada la principal anterior; 404 si la unidad no pertenece al base-product.
  - `DELETE /:unitId` → desasocia; valida que la unidad pertenezca al base-product (404); **409** si la unidad es la `isMain`.
- `:unitId` = id de `measurement-unit` (no el id de la fila `product-unit`).
- `factor` opcional, default `1`, `> 0`.
- Unique parcial `(baseProductId) WHERE is_main` → la BD garantiza una sola principal por base-product; el service degrada la anterior antes del insert/update para no violarlo.
- Migración `CreateMeasurementUnits` creando `measurement-unit` y `product-unit` con sus índices y FKs.
- DTOs con `@ApiProperty` y `fromEntity`; errores con `pg-errors` (`isUniqueViolation`, `isForeignKeyViolation`).

**Out of scope (for future specs):**

- Conversión automática de cantidades entre unidades (uso del `factor`).
- Heredar/propagar unidades de un base-product a sus `product`.
- Reordenar / priorizar unidades más allá de `isMain`.
- Soft delete / restauración.

## Data model

```ts
// src/modules/measurement-units/entities/measurement-unit.entity.ts (modificación)
@Entity('measurement-unit')
@Index('UQ_measurement_unit_name', ['name'], { unique: true })
@Index('UQ_measurement_unit_value', ['value'], { unique: true })
export class MeasurementUnit {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 5 }) value: string; // abreviatura ("kg", "u")
}
```

```ts
// src/modules/measurement-units/entities/baseProduct-unit.entity.ts (modificación)
@Entity('product-unit')
@Index('UQ_product_unit_productId_unitId', ['baseProduct', 'unit'], {
  unique: true,
})
@Index('UQ_product_unit_productId_isMain', ['baseProduct'], {
  unique: true,
  where: '"is_main"',
})
export class ProductUnit {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => BaseProduct, { nullable: false }) baseProduct: BaseProduct;
  @ManyToOne(() => MeasurementUnit, { nullable: false }) unit: MeasurementUnit;
  @Column({ type: 'boolean', default: false }) isMain: boolean;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 }) factor: string;
}
```

```ts
// src/modules/measurement-units/dtos/measurement-unit/create-measurement-unit.dto.ts
export class CreateMeasurementUnitDto {
  @IsString() @IsNotEmpty()
  @ApiProperty({ example: 'Kilogramo' }) name: string;
  @IsString() @IsNotEmpty() @MaxLength(5)
  @ApiProperty({ example: 'kg' }) value: string;
}
// UpdateMeasurementUnitDto: mismos campos, @IsOptional.
```

```ts
// src/modules/measurement-units/dtos/measurement-unit/measurement-unit-filter.dto.ts
export class MeasurementUnitFilterDto extends PaginationDto {
  @IsOptional() @IsString()
  @ApiPropertyOptional({ example: 'kilo' }) search?: string; // unaccent sobre name
}
```

```ts
// src/modules/measurement-units/dtos/measurement-unit/measurement-unit.dto.ts (respuesta)
export class MeasurementUnitDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() value: string;
  static fromEntity(u: MeasurementUnit): MeasurementUnitDto { ... }
}
```

```ts
// src/modules/measurement-units/dtos/product-unit/add-product-unit.dto.ts
export class AddProductUnitDto {
  @IsInt() @Type(() => Number) @ApiProperty({ example: 2 }) unitId: number;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0.01)
  @ApiPropertyOptional({ example: 12.5 }) factor?: number;
  @IsOptional() @IsBoolean() @ApiPropertyOptional({ example: true }) isMain?: boolean;
}
// UpdateProductUnitDto: { factor?: number (>0), isMain?: boolean }, ambos @IsOptional.
```

```ts
// src/modules/measurement-units/dtos/product-unit/product-unit.dto.ts (respuesta)
export class ProductUnitDto {
  @ApiProperty() unitId: number;
  @ApiProperty() unitName: string;
  @ApiProperty() unitValue: string;
  @ApiProperty() isMain: boolean;
  @ApiProperty() factor: number; // parseFloat del decimal
  static fromEntity(pu: ProductUnit): ProductUnitDto { ... }
}
```

Convenciones:

- El módulo hace `TypeOrmModule.forFeature([MeasurementUnit, ProductUnit, BaseProduct])` — valida existencia de base-product y unidad con sus repos (patrón de `ImagesModule` con `Product`).
- `factor` interno como `decimal` string; se expone como `number` en el DTO (igual que `stock`/`price` en SPEC 06).
- Búsqueda `search` sobre `name` con `unaccent(LOWER(...)) ILIKE` (SPEC 03/05/06).
- Unique parcial `WHERE is_main` → el service degrada la principal anterior (`UPDATE ... SET is_main=false WHERE baseProductId AND is_main`) **antes** del insert/update con `isMain:true`. Si igual viola → **409**.
- `:unitId` en rutas = `measurement-unit.id`; la fila `product-unit` se localiza por `(baseProductId, unitId)`.

## Implementation plan

1. Modificar entidades `MeasurementUnit` (índices únicos `name`, `value`) y `ProductUnit` (índice único parcial `baseProduct WHERE is_main`).
2. Migración `CreateMeasurementUnits`: crea `measurement-unit` (con unique `name` y `value`) y `product-unit` (con unique `(baseProductId, unitId)`, unique parcial `(baseProductId) WHERE is_main`, FKs a `base_product` y `measurement-unit`); aplicar con `npm run migration:run`.
3. Crear DTOs de `measurement-unit`: `CreateMeasurementUnitDto`, `UpdateMeasurementUnitDto`, `MeasurementUnitFilterDto`, `MeasurementUnitDto` (`fromEntity`).
4. Crear `MeasurementUnitsService` (CRUD de unidades): `findAll` paginado + `search` unaccent, `findOne`, `create` (unique → 409), `update` (404 / unique → 409), `remove` (404 / FK violation si está en uso → 409).
5. Crear DTOs de `product-unit`: `AddProductUnitDto`, `UpdateProductUnitDto`, `ProductUnitDto` (`fromEntity`).
6. Crear `ProductUnitsService`: `findAll(baseProductId)` (valida baseProduct 404), `add` (valida baseProduct 404, unidad 404, no duplicada 409, degrade principal si `isMain`), `update` (valida pertenencia 404, degrade principal si `isMain`), `remove` (valida pertenencia 404, **409 si `isMain`**).
7. Crear `MeasurementUnitsController` (`/measurement-units`) y `ProductUnitsController` (`/base-products/:baseProductId/units` con `:unitId`).
8. Crear `MeasurementUnitsModule` (`forFeature([...])` + providers + controllers) y registrarlo en `AppModule`.
9. `npm run build`, `npm run lint`, verificación manual contra la BD.

## Acceptance criteria

- [ ] `POST /measurement-units { name, value }` responde **201** con `MeasurementUnitDto`.
- [ ] `name` repetido → **409**; `value` repetido → **409**.
- [ ] `GET /measurement-units?search=...&page&limit` devuelve `PaginatedResult` con `search` unaccent sobre `name`.
- [ ] `GET /measurement-units/:id` inexistente → **404**.
- [ ] `PATCH /measurement-units/:id` actualiza `name`/`value`; unique → **409**; inexistente → **404**.
- [ ] `DELETE /measurement-units/:id` borra la unidad; si está referenciada por `product-unit` → **409**; inexistente → **404**.
- [ ] `GET /base-products/:baseProductId/units` lista las unidades del base-product; baseProduct inexistente → **404**.
- [ ] `POST /base-products/:baseProductId/units { unitId, factor?, isMain? }` asocia la unidad → **201**; baseProduct inexistente → **404**; `unitId` inexistente → **404**; unidad ya asociada → **409**.
- [ ] `factor` omitido → queda `1`; `factor <= 0` → **400**.
- [ ] `isMain:true` en add queda como principal y la principal anterior (si existía) pasa a `isMain:false`.
- [ ] `PATCH /base-products/:baseProductId/units/:unitId { factor?, isMain? }` edita los campos; `isMain:true` degrada la principal anterior; unidad no perteneciente al base-product → **404**.
- [ ] `DELETE /base-products/:baseProductId/units/:unitId` desasocia la unidad; no perteneciente → **404**; si era `isMain` → **409**.
- [ ] En BD existe `measurement-unit` (unique `name`, unique `value`) y `product-unit` (unique `(baseProductId, unitId)`, unique parcial `(baseProductId) WHERE is_main`).
- [ ] `npm run build` compila sin errores de tipos.
- [ ] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** rutas en plural/inglés `/base-products/:baseProductId/units` — consistente con el resto del API (1-A).
- **Sí:** cuatro endpoints de product-unit: list / add / remove / **PATCH** (2-B).
- **Sí:** `isMain` en el body del add; mandar `isMain:true` degrada la principal anterior (3-A).
- **Sí:** unique parcial `(baseProductId) WHERE is_main` — la BD garantiza una sola principal; el service degrada la anterior antes del insert/update (sobreescrito 10 → A).
- **Sí:** `factor` opcional, default `1`, `> 0` (4-A).
- **Sí:** `name` único y `value` único en `measurement-unit` (5-A).
- **Sí:** PATCH edita `isMain` y `factor`; `isMain:true` degrada la principal anterior (6-A).
- **Sí:** `:unitId` = id de `measurement-unit`; la fila se localiza por `(baseProductId, unitId)` (7-A).
- **Sí:** borrar la unidad `isMain` → **409** (no auto-promueve; el cliente marca otra) (8-B).
- **Sí:** `search` solo sobre `name` con unaccent (9-A).
- **Sí:** validación de existencia de base-product/unidad vía sus repositorios (`forFeature([..., BaseProduct])`), igual que `ImagesModule` con `Product` — evita acoplamiento a `BaseProductsService`.
- **No:** no controlar `isMain` solo desde el service (se descarta por la race condition; gana el unique parcial).
- **No:** `:unitId` como id de `product-unit` (se descarta por la semántica de "validar que la unidad sea del base-product").
- **No:** conversión automática de cantidades, propagación a `product`, reordenamiento — fuera de scope.

## Risks

| Risk                                                                 | Mitigation                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dos requests marcan `isMain:true` a la vez para el mismo base-product. | Unique parcial en BD → el segundo falla con 409; el service degrada la anterior antes del commit. |
| Borrar `measurement-unit` en uso por `product-unit` deja FK colgada.  | Capturar `isForeignKeyViolation` → 409 en `DELETE /measurement-units/:id`.                       |
| `factor` decimal puede acumular redondeo al convertir.               | Se guarda `decimal(10,2)` y se expone `number` solo en la respuesta; cálculos en otro spec.       |
| `product-unit` sin `isMain` queda sin principal tras operaciones.     | Aceptado: el cliente marca una con PATCH; no auto-promueve.                                       |

## What is **not** in this spec

- Conversión automática de cantidades entre unidades (uso del `factor`).
- Heredar/propagar unidades de un base-product a sus `product`.
- Reordenar o priorizar unidades más allá de `isMain`.
- Soft delete / restauración.

Cada uno de esos, si llega, va en su propio spec.
