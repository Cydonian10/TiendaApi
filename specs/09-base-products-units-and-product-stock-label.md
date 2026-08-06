# SPEC 09 — Unidades en el create de base-product y `stockLabel` en productos

> **Status:** Aprobado
> **Depends on:** SPEC 02 (response/pagination/filter), SPEC 05 (base-products), SPEC 06 (products), SPEC 08 (measurement-units)
> **Date:** 2026-08-06
> **Objective:** Permitir crear un base-product junto con sus unidades en un solo `POST /base-products` (array `units` obligatorio con validaciones), y al listar/detallar productos exponer su `stockLabel` ("10 kg") construido con la abreviatura de la unidad principal (`isMain`) del base-product, además del array completo de unidades.

## Scope

**In:**

- `POST /base-products` acepta `{ name, units }` donde `units` es un **array obligatorio** de `{ unitId, factor, isMain }`:
  - `factor` **obligatorio**, `> 0`.
  - **Exactamente una** unidad del array con `isMain: true` (0 o 2+ → **400**, validado por custom validator del DTO).
  - `unitId` repetido dentro del array → **409**.
  - `unitId` inexistente → **404**.
  - `name` duplicado → **409** (existente).
- Creación atómica con `UnitOfWork` (mismo patrón que `ProductsService`): si falla cualquier unidad, se hace rollback y no queda el base-product creado.
- `BaseProduct` entity: agregar relación `@OneToMany(() => BaseProductUnit) units` para poder cargar unidades con `relations`.
- `ProductDto`: agregar `stockLabel: string | null` ("10 kg", con el `value` de la `isMain` del base-product) y `units: ProductUnitDto[]` (array completo de unidades del base-product, cada una con su `isMain`).
- `GET /products` y `GET /products/:id`: cargan `baseProduct.units.unit` y exponen los nuevos campos. Caso sin unidad principal → `stockLabel: null`, `units: []`.
- Reutiliza `ProductUnitDto` del módulo measurement-units (import cross-module) para el array `units`.

**Out of scope (for future specs):**

- Conversión automática de cantidades entre unidades (uso del `factor`).
- Asociar unidades directamente al `product` (tabla `product-unit`) — aquí las unidades son **solo lectura** heredadas del base-product.
- Editar el array de unidades en `PATCH /base-products/:id` (eso sigue vía endpoints del spec 08).
- Seeds/migración de datos: se recrea la data a mano tras reiniciar migraciones.

## Data model

Sin cambios de esquema: la tabla `base-product-unit` ya existe (spec 08). No hay migración nueva.

```ts
// src/modules/products/entities/base-product.entity.ts (modificación)
@Entity('base_product')
export class BaseProduct {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'varchar', length: 255, unique: true }) name: string;

  @OneToMany(() => Product, (product) => product.baseProduct)
  products: Product[];

  @OneToMany(() => BaseProductUnit, (bpu) => bpu.baseProduct)
  units: BaseProductUnit[];

  productCount?: number;
}
```

```ts
// src/modules/products/dtos/base-product/create-base-product.dto.ts (modificación)
export class CreateBaseProductDto {
  @IsString() @IsNotEmpty() @ApiProperty({ example: 'Clavo' }) name: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateBaseProductUnitDto)
  @IsExactlyOneMain({
    message: 'Debe haber exactamente una unidad principal (isMain: true)',
  })
  @NoDuplicatedUnitIds({
    message: 'No se puede repetir la misma unitId en el array',
  })
  @ApiProperty({
    type: () => [CreateBaseProductUnitDto],
    example: [
      { unitId: 1, factor: 1, isMain: true },
      { unitId: 2, factor: 12.5, isMain: false },
    ],
  })
  units: CreateBaseProductUnitDto[];
}

// src/modules/products/dtos/base-product/create-base-product-unit.dto.ts (nuevo)
export class CreateBaseProductUnitDto {
  @IsInt() @Type(() => Number) @ApiProperty({ example: 1 }) unitId: number;
  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  @ApiProperty({ example: 1 })
  factor: number;
  @IsBoolean() @ApiProperty({ example: true }) isMain: boolean;
}
```

Custom validators de class-validator (`IsExactlyOneMain`, `NoDuplicatedUnitIds`) viven en `dtos/base-product/validators/`.

```ts
// src/modules/products/dtos/product/product.dto.ts (modificación)
export class ProductDto {
  // ... campos existentes ...

  @ApiProperty({
    example: '10 kg',
    nullable: true,
    description:
      'Stock formateado con la abreviatura de la unidad principal del base-product',
  })
  stockLabel: string | null;

  @ApiProperty({
    type: () => [ProductUnitDto],
    description: 'Unidades del base-product del producto',
  })
  units: ProductUnitDto[];
}
```

`fromEntity` calcula:

- `stockLabel = main ? \`${parseFloat(product.stock)} ${main.unit.value}\` : null`(si no hay`isMain`→`null`).
- `units = (product.baseProduct.units ?? []).map(ProductUnitDto.fromEntity)`.

`BaseProductsService.create` (con `UnitOfWork`):

```ts
async create(dto: CreateBaseProductDto): Promise<BaseProductDto> {
  return this.unitOfWork.execute(async (qr) => {
    const manager = qr.manager;
    const baseProduct = manager.create(BaseProduct, { name: dto.name });
    try { await manager.save(baseProduct); } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(...); throw e;
    }
    for (const item of dto.units) {
      const unit = await manager.findOneBy(MeasurementUnit, { id: item.unitId });
      if (!unit) throw new NotFoundException(`MeasurementUnit ${item.unitId} no encontrada`);
    }
    await manager.save(BaseProductUnit, dto.units.map((item) =>
      manager.create(BaseProductUnit, {
        baseProduct, unit: { id: item.unitId },
        factor: item.factor.toFixed(2), isMain: item.isMain,
      }),
    ));
    return BaseProductDto.fromEntity(baseProduct);
  });
}
```

## Implementation plan

1. Agregar relación `units` a `BaseProduct` (entity) y los custom validators de `units`.
2. Modificar `CreateBaseProductDto` + crear `CreateBaseProductUnitDto`.
3. Reescribir `BaseProductsService.create` con `UnitOfWork` (inyectar `UnitOfWork`; validar unidades 404, guardar `BaseProductUnit`).
4. Extender `ProductDto` con `stockLabel` y `units`; ajustar `fromEntity`.
5. Extender las `relations` en `ProductsService` (`findAll`, `findOne`, `loadProductDto`) a `baseProduct: { units: { unit: true } }`.
6. `npm run build`, `npm run lint`, verificación manual contra la BD.

No se toca `ProductsModule` (las entidades `MeasurementUnit`/`BaseProductUnit` ya están registradas por `MeasurementUnitsModule`; se usan con `manager`).

## Acceptance criteria

- [ ] `POST /base-products { name, units: [{ unitId, factor, isMain }] }` → **201** y crea el base-product + sus filas `base-product-unit` (incluida la `isMain`).
- [ ] `units` omitido o vacío → **400**.
- [ ] Exactamente 0 o 2+ items con `isMain: true` → **400**.
- [ ] `unitId` repetido en el array → **409**; `unitId` inexistente → **404** (y el base-product **no** queda creado — rollback).
- [ ] `factor` omitido o `<= 0` → **400**.
- [ ] `name` duplicado → **409** sin insertar unidades.
- [ ] `GET /products` devuelve en cada producto `stockLabel` ("10 kg") y `units` (array con `unitId/unitName/unitValue/isMain/factor`).
- [ ] Producto cuyo base-product no tiene unidad principal → `stockLabel: null` y `units: []`.
- [ ] `GET /products/:id` expone los mismos campos nuevos.
- [ ] `POST /base-products/:id/units`, `PATCH ...`, `DELETE ...` del spec 08 siguen funcionando sin cambios.
- [ ] `npm run build` compila sin errores; `npm run lint` pasa.

## Decisions

- **Sí:** creación atómica con `UnitOfWork` (patrón ya usado en `ProductsService`); fallo de una unidad → rollback total.
- **Sí:** array `units` **obligatorio** en `POST /base-products` (el usuario está en desarrollo y puede reiniciar la BD; no hay retrocompatibilidad que cuidar). Se registra la decisión de "sin seeds, se recrea la data a mano".
- **Sí:** `factor` **obligatorio** en el array embebido (difiere del spec 08 donde es opcional con default 1 en el endpoint individual) — decisión puntual del create en bloque.
- **Sí:** **exactamente una** `isMain: true` por request, validada por custom validator del DTO (no auto-asignación).
- **Sí:** reutilizar `ProductUnitDto` (import cross-module) para el array `units` del `ProductDto` en lugar de duplicar el DTO.
- **Sí:** relación `units` en `BaseProduct` para cargar todo en una sola pasada con `relations` (sin query N+1).
- **Sí:** `stockLabel` como `parseFloat(stock) + ' ' + main.unit.value` (nunca "10.00 kg"); `null` si no hay principal.
- **Sí:** mantener intactos los endpoints de units del spec 08 (solo se agrega la opción de crear en bloque).
- **No:** nueva tabla ni migración — `base-product-unit` ya existe y el modelo no cambia.
- **No:** asociar unidades al nivel `product`, conversión automática, editar unidades en `PATCH /base-products/:id` — fuera de scope.

## Risks

| Risk                                                                                        | Mitigation                                                                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `units` obligatorio rompe clientes que creaban base-products sin unidades.                  | Aceptado: estamos en desarrollo y se reinicia la BD; se recrea la data a mano.                |
| Import cross-module (`ProductDto` → `ProductUnitDto`) crea acoplamiento leve entre módulos. | Aceptado; se reusa el DTO existente para consistencia. Si molesta después, se duplica el DTO. |
| Base-product sin unidad principal → `stockLabel` sin sentido.                               | Se devuelve `null`; la validación del create obliga a mandar exactamente una principal.       |
| Race condition del unique parcial `(baseProductId) WHERE "isMain"`.                         | No aplica en el create (id nuevo); el patrón del spec 08 ya cubre los endpoints individuales. |
| `parseFloat(product.stock)` pierde precisión decimal.                                       | Es solo para el `stockLabel` visual; el valor numérico real sigue en `stock`.                 |

## What is **not** in this spec

- Conversión automática de cantidades entre unidades (uso del `factor`).
- Unidades asociadas directamente al `product` (tabla `product-unit`).
- Editar/agregar/quitar unidades vía `PATCH /base-products/:id` (sigue por los endpoints del spec 08).
- Seeds en migración.

Cada uno de esos, si llega, va en su propio spec.
