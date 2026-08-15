# SPEC 13 — Brands y Categories en base-products

> **Status:** Aprovado
> **Depends on:** SPEC 02 (paginación/filtros), SPEC 05 (base-products CRUD), SPEC 10 (flujo de create), SPEC 11 (patrón many-to-many)
> **Date:** 2026-08-14
> **Objective:** Agregar las entidades cross `brand` y `category` al módulo products, cada una con CRUD completo paginado y filtrable (name + description, name único), y vincularlas al base-product con `brandId` nullable (una marca) y una relación many-to-many a categorías, aceptando `brandId`/`categoryIds` al crear y actualizar el base-product y filtrando el listado por ambos.

## Scope

**In:**

- Entidad `Brand` (tabla `brand`): `id`, `name` (único), `description` (nullable).
- Entidad `Category` (tabla `category`): `id`, `name` (único), `description` (nullable).
- Relación ManyToOne `base_product` → `brand`: columna `brandId` nullable con FK.
- Relación many-to-many `base_product` ↔ `category` con tabla intermedia `base_product_category` (PK compuesta `(baseProductId, categoryId)` → par único), patrón `person_role` del spec 11.
- CRUD completo de `brands` (`/brands`) y `categories` (`/categories`): POST, GET paginado con filtro `search` unaccent sobre `name`, GET `:id`, PATCH, DELETE (409 si tiene base-products asociados).
- `CreateBaseProductDto` / `UpdateBaseProductDto`: nuevos campos `brandId?: number | null` y `categoryIds?: number[]`.
- Semántica en base-products: `brandId` `undefined` → no toca, `null` → limpia la marca, número → valida existencia (404) y asigna; `categoryIds` `undefined` → no toca, `[]` → limpia, presente → reemplaza el set (mismo patrón que `roleIds` del spec 11).
- `BaseProductFilterDto`: filtros opcionales `brandId` y `categoryId`.
- `BaseProductDto`: campos `brand: { id, name } | null` y `categories: { id, name }[]` (listado, detalle y create).
- Migración de esquema.

**Out of scope (for future specs):**

- Categorías jerárquicas (`parentId`).
- Soft delete de brand/category.
- Logo/imagen de brand/category (vincularía el spec 07).
- CRUD separado de las asociaciones base-product↔categorías (solo se gestionan vía create/update de base-product).
- `brand`/`categories` en `product` (viven solo en el base-product).

## Data model

Cambio de esquema: 3 tablas nuevas + 1 columna nueva.

```ts
// src/modules/products/entities/brand.entity.ts (nuevo)
@Entity('brand')
export class Brand {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, unique: true }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
  @OneToMany(() => BaseProduct, (bp) => bp.brand) baseProducts: BaseProduct[];
}

// src/modules/products/entities/category.entity.ts (nuevo)
@Entity('category')
export class Category {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, unique: true }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
  @ManyToMany(() => BaseProduct, (bp) => bp.categories)
  baseProducts: BaseProduct[];
}
```

```ts
// src/modules/products/entities/base-product.entity.ts (modificado)
@ManyToOne(() => Brand, (brand) => brand.baseProducts, { nullable: true })
@JoinColumn({ name: 'brandId' })
brand: Brand | null;

@Column({ type: 'integer', nullable: true })
brandId: number | null;

@ManyToMany(() => Category, (category) => category.baseProducts)
@JoinTable({
  name: 'base_product_category',
  joinColumn: { name: 'baseProductId', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
})
categories: Category[];
```

DTOs:

```ts
// dtos/brand/brand.dto.ts (nuevo) — id, name, description, con fromEntity
// dtos/brand/create-brand.dto.ts (nuevo) — name @IsString @IsNotEmpty; description @IsOptional @IsString
// dtos/brand/update-brand.dto.ts (nuevo) — PartialType(CreateBrandDto)
// dtos/brand/filter-brand.dto.ts (nuevo) — extends PaginationDto, search? @IsOptional @IsString
// dtos/category/... — mismos 4 DTOs
// dtos/category/category.dto.ts — id, name, description, con fromEntity

// dtos/base-product/create-base-product.dto.ts (modificado) — se añaden
@IsOptional() @IsInt() @Type(() => Number)
@ApiPropertyOptional({ example: 1, description: 'Marca del base-product' })
brandId?: number | null;

@IsOptional() @IsArray() @IsInt({ each: true }) @ArrayUnique()
@ApiPropertyOptional({ example: [1, 2], description: 'Categorías del base-product' })
categoryIds?: number[];

// dtos/base-product/update-base-product.dto.ts (modificado) — mismos campos
// dtos/base-product/base-product.dto.ts (modificado) — se añaden
@ApiProperty({ example: { id: 1, name: 'Cerámica' }, nullable: true })
brand: { id: number; name: string } | null;

@ApiProperty({ example: [{ id: 1, name: 'Ferretería' }] })
categories: { id: number; name: string }[];

// dtos/base-product/filter-base-product.dto.ts (modificado) — se añaden
@IsOptional() @IsInt() @Type(() => Number)
@ApiPropertyOptional({ example: 1 })
brandId?: number;

@IsOptional() @IsInt() @Type(() => Number)
@ApiPropertyOptional({ example: 2 })
categoryId?: number;
```

Convenciones:

- `base_product.brandId` se crea en migración con FK a `brand` (sin ON DELETE cascade → el 409 al borrar brand depende de la FK; se maneja con `isForeignKeyViolation`).
- `base_product_category` con PK compuesta: el par (baseProductId, categoryId) es único.
- `findAll`/`findOne` de base-products usan SQL con subqueries: `brand` como `json_build_object` y `categories` como `json_agg` (ordenado por `id`, `[]` si no hay), manteniendo `productCount`. El filtro `categoryId` filtra vía `EXISTS` sobre `base_product_category`.
- `categoryIds` duplicados → 400 (`@ArrayUnique`).
- El delete de `category` verifica en el servicio si está referenciada en `base_product_category` (count) → 409, sin depender del ON DELETE de la FK intermedia.

## Implementation plan

1. Crear entidades `Brand` y `Category`; agregar en `BaseProduct` la relación `brand` (ManyToOne + columna `brandId`) y `categories` (ManyToMany + `@JoinTable`); registrar las entidades en `ProductsModule` (`TypeOrmModule.forFeature`).
2. Generar migración (`npm run migration:add BrandsAndCategories`) y aplicarla; verificar `brand`, `category`, `base_product_category` y `base_product.brandId` en la BD.
3. Crear DTOs de brand y category: `BrandDto`, `CreateBrandDto`, `UpdateBrandDto`, `BrandFilterDto`, `CategoryDto`, `CreateCategoryDto`, `UpdateCategoryDto`, `CategoryFilterDto`.
4. Crear `BrandsService` y `CategoriesService` (create/update con 409 en name duplicado, delete con 409 si hay asociaciones, findAll paginado con `search` unaccent, findOne) y sus controllers (`/brands`, `/categories`).
5. Ampliar `CreateBaseProductDto`/`UpdateBaseProductDto` con `brandId` y `categoryIds`; ampliar `BaseProductFilterDto` con `brandId` y `categoryId`.
6. Modificar `BaseProductsService.create`: validar `brandId` y cada `categoryId` (404 con rollback total) y persistir marca/categorías en la misma transacción (UnitOfWork).
7. Modificar `BaseProductsService.update`: aplicar semántica de `brandId` (undefined/null/número) y de `categoryIds` (undefined/[]/reemplazo).
8. Modificar `findAll` y `findOne` (SQL con subqueries) para incluir `brand` y `categories` y aplicar los filtros; actualizar `BaseProductDto` (incluye `fromRow`/`fromEntity`).
9. Tests unitarios: `brands.service.spec.ts`, `categories.service.spec.ts` y casos nuevos en `base-products.service.spec.ts`.
10. `npm run build`, `npm run lint`, `npm test` y verificación manual de endpoints contra la BD.

## Acceptance criteria

- [ ] Migración crea `brand`, `category` y `base_product_category` (PK compuesta) y agrega `base_product.brandId` nullable con FK a `brand`.
- [ ] `POST /brands { name, description? }` → **201** con `BrandDto`; `name` duplicado → **409**; sin `name` → **400**.
- [ ] `GET /brands` → `PaginatedResult` con `search` unaccent sobre `name`; `GET /brands/:id` → detalle; id inexistente → **404**.
- [ ] `PATCH /brands/:id` actualiza `name`/`description`; id inexistente → **404**; `name` duplicado → **409**.
- [ ] `DELETE /brands/:id` sin base-products asociados → **204**; con base-products asociados → **409**.
- [ ] Los mismos criterios aplican para `/categories`.
- [ ] `POST /base-products { name, units, brandId, categoryIds }` → **201** con `brand: {id,name}` y `categories[]` en la respuesta; las asociaciones quedan persistidas.
- [ ] `POST /base-products` con `brandId` inexistente → **404** y rollback total (no queda base-product ni unidades ni producto).
- [ ] `POST /base-products` con algún `categoryId` inexistente → **404** y rollback total.
- [ ] `POST /base-products` sin `brandId`/`categoryIds` → **201** con `brand: null` y `categories: []`.
- [ ] `PATCH /base-products/:id`: `brandId` número → reasigna; `brandId: null` → limpia la marca; `categoryIds` presente → reemplaza el set; `categoryIds: []` → limpia; ambos ausentes → no tocan las asociaciones.
- [ ] `categoryIds` con duplicados → **400**.
- [ ] `GET /base-products` devuelve `brand` y `categories` por cada item; `GET /base-products?brandId=1` y `?categoryId=2` filtran correctamente.
- [ ] El `defaultProduct` del create no cambia (no tiene brand/categories).
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.

## Decisions

- **Sí:** `brand` como ManyToOne nullable sobre `base_product` (`brandId` columna + FK). Una marca por base-product; nullable para no romper data ni flujos existentes.
- **Sí:** `category` como many-to-many con tabla intermedia `base_product_category` (PK compuesta), mismo patrón que `person_role` del spec 11.
- **Sí:** `name` único en brand y category (**409** al duplicar), consistente con `attribute`/`base_product`.
- **Sí:** columnas `name` + `description` (nullable) en ambas tablas.
- **Sí:** categorías planas; la jerarquía (`parentId`) se difiere a otro spec.
- **Sí:** `brandId`/`categoryIds` opcionales en create/update de base-product con semántica PATCH tipo `roleIds` (`undefined` no toca, `[]` limpia, presente reemplaza); `brandId: null` limpia la marca.
- **Sí:** las respuestas de base-product (listado, detalle, create) incluyen `brand` y `categories` para que el front no haga consultas extra.
- **Sí:** filtros `brandId`/`categoryId` en `GET /base-products`.
- **Sí:** `DELETE` de brand/category con asociaciones → **409**; en category se verifica explícitamente sobre `base_product_category` para no depender del ON DELETE de la FK intermedia.
- **Sí:** CRUD de brands/categories dentro del módulo products (`/brands`, `/categories`), según lo pedido.
- **No:** jerarquía de categorías, soft delete, logo/imagen, CRUD separado de asociaciones, `brand`/`categories` en `product`.

## Risks

| Risk                                                                                                   | Mitigation                                                                                          |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `findAll`/`findOne` de base-products usan SQL raw; agregar brand/categories/filtros complica la query. | Subqueries con `json_build_object`/`json_agg`; cobertura con tests y verificación manual contra BD. |
| El `DELETE` de category depende del ON DELETE de la FK de `base_product_category`.                     | Verificación explícita (count de referencias) en el servicio; no se asume comportamiento de la FK.  |
| `brandId` nullable en `@IsOptional` + `@IsInt` y el caso `null` ("limpiar").                           | `null`/`undefined` se aceptan en el DTO; la semántica vive en el service y se cubre con tests.      |
| `brandId`/`categoryId` llegan como string desde query/body.                                            | `@Type(() => Number)` en el DTO; `categoryIds` con `@IsInt({ each: true })`.                        |
| Base-products existentes sin marca/categorías quedan con `null`/`[]`.                                  | Aceptado: son campos opcionales por diseño.                                                         |

## What is **not** in this spec

- Categorías jerárquicas (`parentId`).
- Soft delete de brand/category.
- Logo/imagen de brand/category.
- CRUD separado de las asociaciones base-product↔categorías.
- `brand`/`categories` en `product`.

Cada uno de esos, si llega, va en su propio spec.
