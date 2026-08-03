# SPEC 05 — CRUD de base-products con paginación, filtro y borrado protegido

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-02
> **Objective:** Implementar el CRUD completo de `base_product` con paginación, filtro por nombre, conteo de productos por base-product y borrado protegido cuando tiene productos asociados.

## Scope

**In:**

- CRUD completo de `BaseProduct` (POST, GET, GET `:id`, PATCH, DELETE) en `src/modules/products/controllers/base-products.controller.ts` bajo `/base-products`.
- `BaseProductFilterDto extends PaginationDto` con `search` (unaccent sobre `name`).
- `BaseProductDto { id, name, productCount }` con `fromEntity` estático; `productCount` = nº de productos del base-product.
- DTOs de entrada `CreateBaseProductDto` y `UpdateBaseProductDto` (`name` requerido / opcional).
- Migración que hace `base_product.name` **único**.
- `findAll` devuelve `PaginatedResult<BaseProductDto>` (sobre `{ data, message }` de SPEC 02).
- Errores: `NotFoundException` (404) si no existe; `ConflictException` (409) si `name` duplicado o si se borra un base-product con productos.

**Out of scope (for future specs):**

- CRUD de `products` (SPEC 06).
- Imágenes polimórficas (SPEC 07).
- Filtros avanzados (operadores, full-text).
- Soft delete / restauración.

## Data model

```ts
// src/modules/products/entities/base-product.entity.ts (modificación)
// Se agrega una propiedad transitoria para el conteo (no es columna):
@Entity('base_product')
export class BaseProduct {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, unique: true }) name: string;
  @OneToMany(() => Product, (product) => product.baseProduct)
  products: Product[];
  productCount?: number; // se llena con loadRelationCountAndMap en findAll
}
```

```ts
// src/modules/products/dtos/base-product/base-product.dto.ts (respuesta)
export class BaseProductDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() productCount: number;

  static fromEntity(bp: BaseProduct): BaseProductDto {
    const dto = new BaseProductDto();
    dto.id = bp.id;
    dto.name = bp.name;
    dto.productCount = bp.productCount ?? 0;
    return dto;
  }
}
```

```ts
// src/modules/products/dtos/base-product/filter-base-product.dto.ts
export class BaseProductFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  search?: string;
}

// CreateBaseProductDto: name @IsString @IsNotEmpty.
// UpdateBaseProductDto: name opcional (@IsOptional).
```

Convenciones:

- `productCount` se obtiene con `qb.loadRelationCountAndMap('bp.productCount', 'bp.products')` en el `findAll` (propiedad transitoria, no columna).
- El `search` usa `unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER(:q))`, igual que SPEC 03.
- `base_product.name` único se aplica en migración (`migration:add BaseProductNameUnique`).

## Implementation plan

1. Crear `BaseProductDto` con `fromEntity` (`id`, `name`, `productCount`).
2. Crear `BaseProductFilterDto extends PaginationDto` con `search`.
3. Crear `CreateBaseProductDto` y `UpdateBaseProductDto`.
4. Agregar la propiedad transitoria `productCount` a `BaseProduct`.
5. Implementar `BaseProductsService`: `findAll` paginado con `loadRelationCountAndMap` + `search` unaccent, `findOne`, `create`, `update`, `remove` (FK → 409 con `isForeignKeyViolation`).
6. Implementar `BaseProductsController` (CRUD bajo `/base-products`).
7. Migración `BaseProductNameUnique` con `npm run migration:add`, aplicar con `npm run migration:run`.
8. `npm run build`, `npm run lint` y verificación manual de endpoints contra la BD.

## Acceptance criteria

- [ ] `POST /base-products` crea un base-product y responde `{ data: { id, name, productCount }, message: 'Creado' }`.
- [ ] `GET /base-products` devuelve `PaginatedResult` con `data`, `message`, `total`, `page`, `limit`, `lastPage` y cada item con `productCount` correcto.
- [ ] `search` filtra por `name` sin distinguir tildes ni mayúsculas (unaccent).
- [ ] `GET /base-products/:id` devuelve el base-product con su `productCount`; id inexistente → **404**.
- [ ] `PATCH /base-products/:id` actualiza `name`; id inexistente → **404**.
- [ ] `DELETE /base-products/:id` borra si no tiene productos; si tiene → **409**.
- [ ] Crear/actualizar con `name` duplicado → **409**.
- [ ] La migración hace `base_product.name` único y `npm run migration:run` la aplica sin errores.
- [ ] `npm run build` compila sin errores de tipos.
- [ ] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** `base_product.name` único (409 al duplicar), mismo criterio que `attribute.name` en SPEC 03.
- **Sí:** `productCount` en la respuesta del base-product (decisión del usuario); se calcula con `loadRelationCountAndMap`.
- **Sí:** reutilizar el patrón de SPEC 03: DTOs de respuesta planos con `fromEntity`, filtro `search` unaccent, errores de NestJS.
- **No:** productos anidados en la respuesta del base-product — se pidió el conteo, no la lista.
- **No:** soft delete / restauración.

## Risks

| Risk                                                       | Mitigation                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `loadRelationCountAndMap` añade un subquery por fila.      | Datos de catálogo pequeños por ahora; se evalúa índice si crece.   |
| El 409 al borrar depende de la FK `product.baseProductId`. | Manejar `isForeignKeyViolation` (código `23503`) y traducir a 409. |

## What is **not** in this spec

- CRUD de `products` (SPEC 06).
- Imágenes polimórficas (SPEC 07).
- Filtros avanzados (operadores `>`, `<`, `in`, full-text).
- Soft delete / restauración.

Cada uno de esos, si llega, va en su propio spec.
