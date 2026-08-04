# SPEC 06 — CRUD de products con attributes, nombre computado y filtros

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02, SPEC 03, SPEC 05
> **Date:** 2026-08-02
> **Objective:** Implementar el CRUD de `product` con asignación de attribute values (validando que pertenezcan a su atributo), stock/price positivos, nombre computado a partir del base-product y sus attributes, y listado paginado con filtros (search, precio, stock).

## Scope

**In:**

- CRUD completo de `Product` (POST, GET, GET `:id`, PATCH, DELETE) en `src/modules/products/controllers/products.controller.ts` bajo `/products`.
- Columna `price decimal(10,2)` en `product` (migración nueva).
- `CreateProductDto`: `{ baseProductId, stock, price, productAttributes: [{ attributeId, attributeValueId }] }` — **sin `name`** (se computa). `stock > 0` y `price > 0`.
- `UpdateProductDto`: todos los campos opcionales; si viene `productAttributes` se hace **reemplazo completo** (borra y recrea) en transacción.
- Nombre computado guardado en `product.name`: `"<baseProduct.name> - <Attribute>: <Value>, ..."` (orden alfabético por `attribute.name`).
- Validación cruzada en POST y PATCH: cada `attributeValueId` debe pertenecer a su `attributeId` → **400** si no.
- `GET /products` paginado con `ProductFilterDto`: `search` (unaccent sobre el nombre computado `product.name`), `baseProductId`, `minPrice`, `maxPrice`, `minStock`.
- `GET /products/:id` devuelve el producto con sus `productAttributes` (`attributeId`, `attributeName`, `attributeValueId`, `attributeValue`).
- DTOs de respuesta con `fromEntity`: `ProductDto`, `ProductAttributeDto`.
- Unicidad por `baseProductId` + set completo de attributes mediante `attributeKey`; sets idénticos → **409**, sets distintos → productos legítimos.
- Errores: `NotFoundException` (404), `BadRequestException` (400), `ConflictException` (409 unique).
- `DELETE` borra los `product_attribute` del producto y luego el `product`, en transacción.

**Out of scope (for future specs):**

- Imágenes polimórficas (SPEC 07).
- CRUD de `base-products` (SPEC 05).
- Filtros avanzados (operadores, full-text, orden).
- Soft delete / restauración.

## Data model

```ts
// src/modules/products/entities/producto.entity.ts (modificación)
@Entity('product')
@Index('UQ_product_baseProductId_attributeKey', ['baseProduct', 'attributeKey'], {
  unique: true,
})
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string; // computado
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string; // nuevo
  @Column({ type: 'varchar', length: 255, default: '' })
  attributeKey: string; // pares "attributeId:attributeValueId" ordenados, clave de unicidad
  @ManyToOne(() => BaseProduct, (bp) => bp.products, { nullable: false })
  baseProduct: BaseProduct;
  @OneToMany(() => ProductAttribute, (pa) => pa.product)
  productAttributes: ProductAttribute[];
}
```

```ts
// src/modules/products/dtos/product/create-product.dto.ts (modificación)
export class ProductAttributeItemDto {
  @IsNumber() @Type(() => Number) @ApiProperty() attributeId: number;
  @IsNumber() @Type(() => Number) @ApiProperty() attributeValueId: number;
}

export class CreateProductDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 10 })
  stock: number;
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 1.5 })
  price: number;
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  baseProductId: number;
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeItemDto)
  @ApiProperty({ type: () => [ProductAttributeItemDto] })
  productAttributes: ProductAttributeItemDto[];
}
// UpdateProductDto: mismos campos, todos @IsOptional.
```

```ts
// src/modules/products/dtos/product/filter-product.dto.ts
export class ProductFilterDto extends PaginationDto {
  @IsOptional() @IsString() @ApiProperty({ required: false }) search?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiProperty({ required: false })
  baseProductId?: number;
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiProperty({ required: false })
  minPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiProperty({ required: false })
  maxPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @ApiProperty({ required: false })
  minStock?: number;
}
```

```ts
// src/modules/products/dtos/product/product.dto.ts (respuesta)
export class ProductAttributeDto {
  @ApiProperty() attributeId: number;
  @ApiProperty() attributeName: string;
  @ApiProperty() attributeValueId: number;
  @ApiProperty() attributeValue: string;
}

export class ProductDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() stock: number; // parseFloat del decimal string
  @ApiProperty() price: number; // parseFloat
  @ApiProperty() baseProductId: number;
  @ApiProperty() baseProductName: string;
  @ApiProperty({ type: () => [ProductAttributeDto] })
  productAttributes: ProductAttributeDto[];
}
```

Convenciones:

- `product.name` guarda el nombre computado (derivado, no editable) → permite `search` directo con unaccent.
- `stock`/`price` se exponen como `number` en el DTO (el string decimal queda interno, SPEC 01).
- La validación cruzada carga `attribute` y `attributeValue` por id; si `attributeValue.attributeId !== attributeId` → `BadRequestException`.
- Duplicado del mismo `attributeId` dentro del body → 409 por unique `(productId, attributeId)`.
- `attributeKey` computado como los pares `attributeId:attributeValueId` ordenados por `attributeId` y unidos con `,`. Índice único `(baseProductId, attributeKey)` → impide dos productos del mismo baseProduct con el **mismo set completo** de attributes → **409**. El orden del body no importa (el key se ordena). Un set con más/menos attributes es un producto distinto y legítimo.
- `findAll` hace la consulta paginada solo sobre `product` y **una segunda consulta** carga `baseProduct` + `productAttributes` (con `attribute` y `attributeValue`) para los ids de la página — evita el row-duplication del join 1:N con `skip/take`.

## Implementation plan

1. Migración `ProductPrice`: `ALTER TABLE product ADD COLUMN price decimal(10,2) NOT NULL DEFAULT 0`; aplicar con `npm run migration:run`.
2. Modificar `Product` entity (agregar `price`).
3. Modificar `CreateProductDto` (sin `name`, con `price`, `@Min(0.01)` en stock/price); crear `UpdateProductDto` y `ProductFilterDto`.
4. Crear DTOs de respuesta `ProductAttributeDto` y `ProductDto` con `fromEntity`.
5. Implementar `ProductsService.create` con `UnitOfWork`: validar `baseProduct` (404), validación cruzada (400), computar nombre, insertar product + productAttributes (unique → 409).
6. Implementar `findAll` con filtros (`search`, `baseProductId`, `minPrice`, `maxPrice`, `minStock`) + segunda consulta para relaciones + paginación.
7. Implementar `findOne` (con relaciones), `update` (reemplazo de attributes + recomputo de nombre en transacción), `remove` (borra children antes que el product).
8. Implementar `ProductsController` (CRUD bajo `/products`).
9. `npm run build`, `npm run lint` y verificación manual contra la BD.
10. (Añadido durante la implementación) Agregar `attributeKey`, limpiar duplicados existentes y aplicar unicidad por set completo de attributes.

## Acceptance criteria

- [x] `POST /products` con `{ baseProductId, stock, price, productAttributes }` crea el producto y responde **201** con `name` computado `"Base - Atributo: Valor, ..."`.
- [x] `name` enviado en el body es descartado (whitelist) — nunca se guarda el name del cliente.
- [x] `stock <= 0` o `price <= 0` → **400** (en POST y PATCH).
- [x] `baseProductId` inexistente → **404**.
- [x] `attributeValueId` que no pertenece a `attributeId` → **400** (en POST y PATCH).
- [x] Repetir el mismo `attributeId` dentro del body → **409**.
- [x] Crear/PATCHear un producto con el **mismo set completo** de attributes que otro producto del mismo `baseProductId` (independiente del orden del body) → **409**.
- [x] Un set con más/menos attributes (o values distintos) del mismo `baseProductId` es un producto legítimo → **201/200**.
- [x] `PATCH /products/:id` actualiza campos y, si envía `productAttributes`, reemplaza los existentes (no quedan los viejos) y recomputa `name`; id inexistente → **404**.
- [x] `GET /products` devuelve `PaginatedResult` y cada item incluye `productAttributes` con `{ attributeId, attributeName, attributeValueId, attributeValue }`.
- [x] `search` filtra por nombre computado sin distinguir tildes/mayúsculas (unaccent).
- [x] `baseProductId`, `minPrice`, `maxPrice`, `minStock` filtran correctamente.
- [x] `GET /products/:id` devuelve el producto con sus attributes; id inexistente → **404**.
- [x] `DELETE /products/:id` borra el producto y sus `product_attribute`; id inexistente → **404**.
- [x] La migración agrega `price` y `npm run migration:run` la aplica sin errores.
- [x] `npm run build` compila sin errores de tipos.
- [x] `npm run lint` pasa sin errores (queda un warning preexistente en `main.ts`).

## Decisions

- **Sí:** columna `price decimal(10,2)` en `product` (requerida en el body, `> 0` igual que stock).
- **Sí:** el nombre computado se **guarda** en `product.name` (derivado, no editable). Permite `search` directo y consistencia con el listado.
- **Sí:** formato `"Base - Atributo: Valor, ..."` con orden alfabético por `attribute.name` para que el nombre sea determinista.
- **Sí:** validación cruzada `attributeValue.attributeId === attributeId` → **400**, en POST y PATCH.
- **Sí:** `stock` y `price` con `@Min(0.01)` (mayor a 0, acepta decimales).
- **Sí:** PATCH con reemplazo completo de `productAttributes` en transacción (`UnitOfWork`). Predecible y respeta el unique `(productId, attributeId)`.
- **Sí:** `findAll` en dos consultas para no romper la paginación por el join 1:N.
- **Sí:** `DELETE` borra los `product_attribute` antes que el `product` (no hay CASCADE en la BD).
- **Sí:** `stock`/`price` expuestos como `number` en la respuesta.
- **Sí:** unicidad de producto por `baseProductId` + **set completo** de attributes vía columna `attributeKey` + índice único `(baseProductId, attributeKey)` → **409** en POST/PATCH. El orden del body es irrelevante; dos sets distintos (aunque compartan attributes) son productos legítimos. *(Decisión añadida durante la implementación, sobre el riesgo de nombres iguales aceptado inicialmente.)*
- **No:** `name` editable por el cliente.
- **No:** filtros avanzados ni orden (`orderBy`) — quedan para un spec futuro.

## Risks

| Risk                                                                                | Mitigation                                                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Join 1:N con `skip/take` duplica filas y rompe la paginación.                       | `findAll` en dos consultas: paginar sobre `product` y cargar relaciones por ids. |
| `product.name` computado no es único: dos productos pueden quedar con igual nombre. | Mitigado con `attributeKey` + índice único `(baseProductId, attributeKey)` → 409. |
| Duplicado de `attributeId` en el body depende del unique de BD.                     | Manejar `isUniqueViolation` → 409 dentro del `UnitOfWork`.                       |
| Cambiar `baseProductId` en PATCH recomputa el nombre.                               | Recalcular `name` siempre tras guardar los attributes/baseProduct.               |
| Migración con duplicados existentes rompería el índice único.                       | La migración `ProductAttributeKey` hace backfill del key y **elimina** los duplicados (conserva el de menor id) antes de crear el índice. |

## What is **not** in this spec

- Imágenes polimórficas (SPEC 07).
- CRUD de `base-products` (SPEC 05).
- Filtros avanzados (operadores `>`, `<`, `in`, full-text, orden).
- Soft delete / restauración.

Cada uno de esos, si llega, va en su propio spec.
