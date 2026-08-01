# SPEC 01 — Atributos, stock de producto y relación producto-atributo

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-08-01
> **Objective:** Crear las entidades `attribute` y `attribute_value`, agregar `stock` al producto y enlazar cada producto con un único valor por atributo mediante una entidad de unión explícita.

## Scope

**In:**

- Entidad `Attribute` (id, name) y `AttributeValue` (id, value, attributeId) en el módulo `attributes`.
- Constraint único `(attributeId, value)` en `attribute_value`.
- Columna `stock` (`decimal(10,2)`, `default: 0`) en la entidad `Product` existente.
- Entidad de unión `ProductAttribute` (tabla `product_attribute`) con `productId`, `attributeId`, `attributeValueId` y único `(productId, attributeId)` — un producto no puede tener dos valores del mismo atributo.
- Módulo `AttributesModule` y registro en `AppModule`.
- Actualizar `TypeOrmModule.forFeature` de `ProductsModule` para incluir `ProductAttribute`.
- Una migración que cree las tres tablas y altere `product`.

**Out of scope (for future specs):**

- Services, controllers, DTOs y endpoints de `attributes` (CRUD).
- Services, controllers, DTOs y endpoints para gestionar `ProductAttribute`.
- Validación cruzada a nivel de servicio de que `attributeValueId.attributeId == attributeId`.
- Seeders / datos iniciales de atributos.

## Data model

```ts
// src/modules/attributes/entities/attribute.entity.ts
@Entity('attribute')
export class Attribute {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @OneToMany(() => AttributeValue, (av) => av.attribute)
  values: AttributeValue[];
}

// src/modules/attributes/entities/attribute-value.entity.ts
@Entity('attribute_value')
export class AttributeValue {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) value: string;
  @ManyToOne(() => Attribute, (a) => a.values, { nullable: false })
  attribute: Attribute; // columna attributeId
}
// Unique (attributeId, value) definido en la migración.
```

```ts
// src/modules/products/entities/producto.entity.ts (modificación)
@Entity('product')
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: string; // TypeORM devuelve decimal como string
  @ManyToOne(() => BaseProduct, (bp) => bp.products, { nullable: false })
  baseProduct: BaseProduct;
  @OneToMany(() => ProductAttribute, (pa) => pa.product)
  productAttributes: ProductAttribute[];
}

// src/modules/products/entities/product-attribute.entity.ts (nuevo)
@Entity('product_attribute')
export class ProductAttribute {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Product, (p) => p.productAttributes, { nullable: false })
  product: Product;                 // productId
  @ManyToOne(() => Attribute, { nullable: false })
  attribute: Attribute;             // attributeId
  @ManyToOne(() => AttributeValue, { nullable: false })
  attributeValue: AttributeValue;   // attributeValueId
}
// Unique (productId, attributeId) definido en la migración.
```

Convenciones:

- `decimal(10,2)` → JS recibe `string`; la app debe parsear al mostrar/operar.
- Tabla de unión: `product_attribute` (entidad explícita, no `@JoinTable`).

## Implementation plan

1. Crear `src/modules/attributes/entities/attribute.entity.ts` y `attribute-value.entity.ts`.
2. Crear `src/modules/attributes/attributes.module.ts` con `TypeOrmModule.forFeature([Attribute, AttributeValue])` (sin controllers/providers).
3. Modificar `src/modules/products/entities/producto.entity.ts`: agregar `@Column stock` y `@OneToMany productAttributes`.
4. Crear `src/modules/products/entities/product-attribute.entity.ts` con las tres FK.
5. Actualizar `ProductsModule.forFeature([BaseProduct, Product, ProductAttribute])`.
6. Importar `AttributesModule` en `AppModule`.
7. `npm run build` (sanea tipos) y luego `npm run migration:add AttributesAndStock`. Revisar que cree `attribute`, `attribute_value` (unique `attributeId,value`), `product_attribute` (unique `productId,attributeId` + FKs) y `ALTER TABLE product ADD COLUMN stock decimal(10,2) DEFAULT 0`. Corregir a mano los constraints que falten.
8. `docker compose up -d`, `npm run migration:run`, verificar con `npm run migration:show`.
9. `npm run start:dev` y confirmar que las entidades quedan cargadas vía `autoLoadEntities`.

## Acceptance criteria

- [x] Existen `attribute.entity.ts` y `attribute-value.entity.ts` en `src/modules/attributes/entities/`.
- [x] `AttributeValue` tiene FK `attributeId` a `attribute`.
- [x] `attribute_value` tiene constraint único sobre `(attributeId, value)`.
- [x] `Product` incluye la columna `stock` de tipo `decimal(10,2)` con `default 0`.
- [x] Existe `product-attribute.entity.ts` con FKs a `product`, `attribute` y `attribute_value`.
- [x] `product_attribute` tiene constraint único sobre `(productId, attributeId)`.
- [x] `AttributesModule` está importado en `AppModule`.
- [x] `ProductsModule.forFeature` incluye `ProductAttribute`.
- [x] `npm run migration:add` generó una migración coherente (3 tablas + `ALTER product`).
- [x] `npm run migration:run` finaliza sin errores contra la BD de docker.
- [x] `npm run build` compila sin errores de tipos.
- [x] `npm run lint` pasa sin errores.

## Decisions

- **Sí:** entidad de unión explícita `ProductAttribute` (tabla `product_attribute`) con único `(productId, attributeId)`. Garantiza a nivel de BD que un producto no tenga dos valores del mismo atributo.
- **No:** `@ManyToMany` puro con `@JoinTable` entre `product` y `attribute_value`. No permite el único sobre `(productId, attributeId)` porque esa columna no existe en la unión automática.
- **Sí:** `stock` como `decimal(10,2)` con `default 0`, aceptando que TypeORM lo devuelve como `string`.
- **No:** `integer` o `double precision` para `stock` — se pidió decimal explícitamente.
- **Sí:** único `(attributeId, value)` en `attribute_value` para evitar valores duplicados por atributo.
- **Sí:** módulo `attributes` solo con entidades (sin endpoints); el CRUD queda para otro spec.
- **No:** validar en la BD que `attributeValueId.attributeId == attributeId` dentro de `product_attribute`. Postgres no lo hace trivialmente; queda para el service (futuro spec).

## Risks

| Risk                                                                                                          | Mitigation                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `product_attribute.attributeValueId` puede apuntar a un `attribute_value` cuyo `attributeId` no coincida con `product_attribute.attributeId`. | Validación en el service (próximo spec). No se asegura consistencia a nivel de BD en este spec. |
| `decimal` se devuelve como `string`, lo que puede sorprender al consumir la API.                             | Documentado; el DTO/service futuro convertirá a número si conviene.            |

## What is **not** in this spec

- CRUD de `attributes` (services/controllers/DTOs/endpoints).
- Gestión de `ProductAttribute` desde la API.
- Validación cruzada `attributeValueId.attributeId == attributeId` a nivel de servicio.
- Seeders de atributos y valores.