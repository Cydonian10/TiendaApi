# SPEC 14 — Precio y stock iniciales del producto por default

> **Status:** Aprobado
> **Depends on:** SPEC 09 (unidades en base-products), SPEC 10 (producto por default), SPEC 13 (brands y categories)
> **Date:** 2026-08-19
> **Objective:** Hacer obligatorios `initialPrice` e `initialStock` al crear un base-product para persistirlos, redondeados a dos decimales, en el producto por default creado automáticamente.

## Scope

**In:**

- `CreateBaseProductDto`: nuevos campos obligatorios `initialPrice: number` e `initialStock: number` (ambos `@IsNumber`, `@Type(() => Number)`, `@Min(0)`).
- `POST /base-products` persiste esos valores en el `defaultProduct` (previamente creado en SPEC 10), redondeados a dos decimales, en lugar de `0`.
- Validación: omitir cualquiera de los dos → **400** y rollback total (no se crea base-product, unidades, marca/categorías ni producto).
- Valores negativos → **400**.
- Strings numéricos transformables por `ValidationPipe` aceptados (`"12.50"`).
- `defaultProduct.price` / `defaultProduct.stock` devuelven los valores ingresados (normalizados a 2 decimales) en `CreateBaseProductResponseDto`.
- Tests unitarios ampliados en `base-products.service.spec.ts`.

**Out of scope (for future specs):**

- Cambiar precio/stock del default vía `PATCH /base-products/:id`.
- Configurar precio/stock inicial en `POST /products` (otros productos).
- Conversiones de unidad sobre el stock inicial.
- Modificar `ProductDto` o los endpoints de lectura de productos.

## Data model

Sin cambios de esquema (ya existe `product`, tabla `producto`, columnas `price`/`stock` decimal(2)).

```ts
// dtos/base-product/create-base-product.dto.ts (modificado)
@IsNumber()
@Type(() => Number)
@Min(0)
@ApiProperty({ example: 10.5, description: 'Precio inicial del producto por default' })
initialPrice: number;

@IsNumber()
@Type(() => Number)
@Min(0)
@ApiProperty({ example: 100, description: 'Stock inicial del producto por default' })
initialStock: number;
```

En `BaseProductsService.create` (dentro de `unitOfWork.execute` del SPEC 10):

```ts
const product = manager.create(Product, {
  name: baseProduct.name,
  stock: this.round2(dto.initialStock), // '0.00' si 0
  price: this.round2(dto.initialPrice),
  attributeKey: '',
  baseProduct,
});
```

`round2` normaliza a dos decimales (ej. `1.239` → `1.24`) antes de persistir.

## Implementation plan

1. Agregar `initialPrice` e `initialStock` a `CreateBaseProductDto` (obligatorios, `@Min(0)`, `@Type(() => Number)`) y su `@ApiProperty`.
2. Modificar `BaseProductsService.create` para usar esos valores en el `defaultProduct`, con normalización a 2 decimales, sin romper la atomicidad del SPEC 10.
3. Ampliar `test/unit/products/base-products.service.spec.ts`: caso feliz (valores reflejados), campos omitidos → 400, negativo → 400, decimales redondeados, strings numéricos, rollback total.
4. `npm run build`, `npm run lint`, `npm test` y verificación manual de `POST /base-products` contra la BD.

## Acceptance criteria

- [ ] `POST /base-products` sin `initialPrice` o sin `initialStock` → **400** y no se crea ninguna entidad (rollback).
- [ ] `initialPrice` o `initialStock` negativos → **400**.
- [ ] `POST /base-products { ..., initialPrice, initialStock }` → **201**; `defaultProduct.price`/`defaultProduct.stock` devuelven los valores normalizados a 2 decimales.
- [ ] `1.239` → se persiste como `1.24`.
- [ ] String numérico `"12.50"` aceptado y convertido.
- [ ] `name` duplicado / `unitId` inexistente / `brandId` o `categoryId` inexistentes → **409/404** con rollback total, incluido el nuevo producto default.
- [ ] `GET /products` y `POST /products` sin cambios.
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.

## Decisions

- **Sí:** `initialPrice`/`initialStock` obligatorios en el DTO (no opcionales) — rompe el contrato previo de SPEC 10 donde eran 0, pero está en desarrollo.
- **Sí:** precisión de 2 decimales con redondeo estándar, coherente con la columna existente.
- **Sí:** strings numéricos transformables por `ValidationPipe` (`@Type(() => Number)`).
- **Sí:** rollback total heredado de SPEC 10 si falla cualquier paso.
- **Sí:** reutilizar `CreateBaseProductResponseDto` y `ProductDto` sin nuevos campos.
- **No:** modificar `PATCH /base-products/:id`, `POST /products`, `ProductDto` ni endpoints de lectura.

## Risks

| Risk                                                                                   | Mitigation                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Cambiar campos obligatorios rompe clientes que creaban base-products sin precio/stock. | Aceptado: en desarrollo, se recrea la data. Cubierto por tests. |
| Redondeo a 2 decimales pueda diferir de lo esperado en borde.                          | Usar `round2` explícito; test con `1.239`.                      |
| Rollback debe incluir el nuevo default.                                                | Misma transacción `unitOfWork` del SPEC 10.                     |

## What is **not** in this spec

- Editar precio/stock del default por PATCH.
- Precio/stock inicial en `POST /products`.
- Conversiones de unidad.
- Cambios en `ProductDto` o endpoints de lectura.

Cada uno, si llega, va en su propio spec.
