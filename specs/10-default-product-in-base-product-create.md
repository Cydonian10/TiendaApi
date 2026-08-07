# SPEC 10 — Producto por default al crear un base-product

> **Status:** Implementado
> **Depends on:** SPEC 05 (base-products), SPEC 06 (products), SPEC 08 (measurement-units), SPEC 09 (unidades en create de base-product)
> **Date:** 2026-08-06
> **Objective:** Al crear un base-product, crear además automáticamente un producto "por default" sin atributos, asociado a ese base-product, dentro de la misma transacción, y devolver ambos en la respuesta.

## Scope

**In:**

- `POST /base-products` crea, en una sola transacción `UnitOfWork`:
  1. El `base-product` (con su array `units` del spec 09).
  2. Un `product` por default asociado a ese base-product: `name = baseProduct.name`, `stock = 0`, `price = 0`, `attributeKey = ''`, **sin** filas `productAttribute`.
  3. Si cualquier paso falla → rollback total (no queda base-product, ni unidades, ni producto).
- Respuesta del `POST` pasa a ser un nuevo DTO `CreateBaseProductResponseDto { baseProduct: BaseProductDto, defaultProduct: ProductDto }`.
- `defaultProduct` se carga con refetch desde la BD (relations `baseProduct.units.unit` y `productAttributes.attribute/attributeValue`), así `units`, `stockLabel` y `productAttributes` salen completos.
- `productCount` del `baseProduct` en la respuesta del create se fija a `1` (calculado en el service, sin query extra).
- Tests unitarios completos del nuevo comportamiento (`test/unit/products/base-products.service.spec.ts`).

**Out of scope (for future specs):**

- Crear el producto por default en otros flujos (seeders, scripts, imports) — solo `POST /base-products`.
- Modificar `GET /base-products` / `GET /base-products/:id` (siguen igual, sin campo default).
- Configurar stock/price inicial del default por request (siempre `0`).
- Editar el array de unidades en el PATCH de base-product (sigue por endpoints del spec 08).
- Migración de BD (no hay cambios de esquema).

## Data model

Sin cambios de esquema.

```ts
// src/modules/products/dtos/base-product/create-base-product-response.dto.ts (nuevo)
import { ApiProperty } from '@nestjs/swagger';
import { BaseProductDto } from './base-product.dto';
import { ProductDto } from '../product/product.dto';

export class CreateBaseProductResponseDto {
  @ApiProperty({ type: () => BaseProductDto })
  baseProduct: BaseProductDto;

  @ApiProperty({ type: () => ProductDto })
  defaultProduct: ProductDto;
}
```

`BaseProductsService.create` (modificación — flujo dentro de `unitOfWork.execute` ya existente):

```ts
async create(dto: CreateBaseProductDto): Promise<CreateBaseProductResponseDto> {
  return this.unitOfWork.execute(async (queryRunner) => {
    const manager = queryRunner.manager;

    const baseProduct = manager.create(BaseProduct, { name: dto.name });
    try { await manager.save(baseProduct); }
    catch (e) { if (isUniqueViolation(e)) throw new ConflictException(...); throw e; }

    for (const item of dto.units) { /* valida unitId → 404 */ }

    try { await manager.save(BaseProductUnit, dto.units.map(...)); }
    catch (e) { if (isUniqueViolation(e)) throw new ConflictException(...); throw e; }

    const product = manager.create(Product, {
      name: baseProduct.name,
      stock: '0.00',
      price: '0.00',
      attributeKey: '',
      baseProduct,
    });
    await manager.save(product);

    const loadedProduct = await manager.findOne(Product, {
      where: { id: product.id },
      relations: {
        baseProduct: { units: { unit: true } },
        productAttributes: { attribute: true, attributeValue: true },
      },
    });
    if (!loadedProduct) throw new NotFoundException(`Product ${product.id} no encontrado`);

    baseProduct.productCount = 1;
    return {
      baseProduct: BaseProductDto.fromEntity(baseProduct),
      defaultProduct: ProductDto.fromEntity(loadedProduct),
    };
  });
}
```

## Implementation plan

1. Crear `CreateBaseProductResponseDto` (baseProduct + defaultProduct).
2. Modificar `BaseProductsService.create` para crear el producto por default y devolver el nuevo DTO (stock/price `'0.00'`, `attributeKey: ''`, refetch con relations, `productCount = 1`).
3. Crear `test/unit/products/base-products.service.spec.ts` con los casos posibles.
4. `npm run build`, `npm run lint`, `npm test`, verificación manual contra la BD.

## Acceptance criteria

- [x] `POST /base-products { name, units }` → **201** con `{ baseProduct, defaultProduct }`.
- [x] `defaultProduct.name` = nombre del base-product; `stock = 0`; `price = 0`; `attributeKey = ''`; `productAttributes = []`.
- [x] `defaultProduct` trae `units` (heredadas del base-product) y `stockLabel` ("10 kg") si hay `isMain`.
- [x] `baseProduct.productCount` = 1 en la respuesta del create.
- [x] `name` duplicado → **409** y **no** se crea nada (ni base-product, ni unidades, ni producto).
- [x] `unitId` inexistente → **404** y **no** se crea nada (rollback).
- [x] `units` omitido/vacío → **400**; 0 o 2+ `isMain:true` → **400**; `unitId` repetido → **409**; `factor` omitido o `<=0` → **400**.
- [x] `GET /base-products` y `GET /base-products/:id` siguen devolviendo `BaseProductDto` sin cambios.
- [x] Tests unitarios cubren: caso feliz, `name` duplicado → 409, `unitId` inexistente → 404 (rollback), unique violation en unidades → 409, campos correctos del default product.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.

## Decisions

- **Sí:** el default product se crea en la **misma transacción** que base-product + unidades (UnitOfWork), rollback total si algo falla.
- **Sí:** valores del default: `name = baseProduct.name`, `stock/price = 0`, `attributeKey = ''`, cero `productAttribute`.
- **Sí:** respuesta del `POST` con nuevo DTO `CreateBaseProductResponseDto { baseProduct, defaultProduct }` en lugar de agregar el campo a `BaseProductDto` — no contamina `findAll`/`findOne`.
- **Sí:** `defaultProduct` se carga con refetch (patrón `loadProductDto` de `ProductsService`) para garantizar `units`/`stockLabel`/`productAttributes` correctos.
- **Sí:** `productCount` = 1 calculado en el service (sabemos que se creó un producto; sin query extra). El `findAll`/`findOne` posteriores ya cuentan con normalidad.
- **Sí:** tests unitarios incluidos en el spec (casos posibles).
- **No:** no se toca `BaseProductDto` ni los endpoints de lectura.
- **No:** sin migración — no hay cambios de esquema.
- **No:** no se configura stock/price inicial del default por request (siempre 0).

## Risks

| Risk                                                                                         | Mitigation                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POST /base-products` ahora siempre crea un producto (side effect nuevo).                    | Aceptado: es el objetivo del spec; atómico y con tests.                                                      |
| El unique `(baseProduct, attributeKey)` limita a un producto sin atributos por base-product. | Es justamente el default; futuras variantes llevan attributeKey ≠ '' (spec 06).                              |
| Refetch adicional por cada create.                                                           | Solo 1 query más en un create de baja frecuencia; compensa con DTOs completos.                               |
| `productCount = 1` hardcodeado.                                                              | Válido solo en la respuesta del create (recién se creó el primer producto); el resto consulta el count real. |

## What is **not** in this spec

- Default product en flujos que no sean `POST /base-products`.
- Cambios en `GET /base-products` / `GET /base-products/:id`.
- Stock/price inicial configurable por request.
- Migración de BD.

Cada uno de esos, si llega, va en su propio spec.
