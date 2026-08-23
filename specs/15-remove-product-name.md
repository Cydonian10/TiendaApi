# SPEC 15 — Eliminar el nombre persistido de Product

> **Status:** Aprobado
> **Depends on:** SPEC 06 (products CRUD), SPEC 10 (producto por default), SPEC 14 (precio y stock iniciales)
> **Date:** 2026-08-21
> **Objective:** Eliminar `product.name` del modelo, base de datos, DTOs y respuestas, usando exclusivamente `base_product.name` como nombre del producto y como criterio de búsqueda.

## Scope

**In:**

- Eliminar la propiedad `name` de `Product` en `src/modules/products/entities/producto.entity.ts`.
- Crear y aplicar una migración que elimine la columna `product.name`.
- Eliminar `name` de `ProductDto` y de todas las respuestas de productos.
- Mantener `baseProductName`, obtenido desde `BaseProduct.name`.
- Eliminar cualquier cálculo, asignación o actualización de `product.name`.
- Mantener `productAttributes` como datos separados, sin generar un nombre compuesto.
- Cambiar `GET /products?search=...` para filtrar por `base_product.name`.
- Mantener `CreateProductDto` y `UpdateProductDto` sin un campo `name`.
- Actualizar los tests unitarios relacionados con productos.
- Verificar migración, compilación, lint, tests y endpoints de productos.

**Out of scope (for future specs):**

- Cambiar el nombre de `BaseProduct`.
- Modificar la estructura o el comportamiento de `ProductAttribute`.
- Agregar un nuevo nombre calculado para `Product`.
- Cambiar precios, stock, unidades, marcas o categorías.
- Modificar los endpoints de `BaseProduct`.

## Data model

La entidad `Product` deja de tener una columna propia para el nombre:

```ts
// src/modules/products/entities/producto.entity.ts (modificado)
@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  attributeKey: string;

  @ManyToOne(() => BaseProduct, (baseProduct) => baseProduct.products, {
    nullable: false,
  })
  baseProduct: BaseProduct;
}
```

La migración elimina `product.name`; no migra ni conserva sus valores porque los datos se eliminarán y se volverán a cargar.

`ProductDto` conserva `baseProductName`, `productAttributes`, `stock`, `price`, `baseProductId`, `stockLabel` y `units`, pero no expone `name`:

```ts
// src/modules/products/dtos/product/product.dto.ts (modificado)
baseProductName: string;
```

La búsqueda de productos usa la relación `Product.baseProduct` y el campo `BaseProduct.name`:

```sql
unaccent(LOWER(bp.name)) ILIKE unaccent(LOWER(:search))
```

## Implementation plan

1. Eliminar `name` de `ProductDto` y ajustar `ProductDto.fromEntity` para usar únicamente `baseProductName` y los atributos separados.
2. Eliminar `name` de la entidad `Product` y quitar las asignaciones a `name` en `ProductsService.create` y `ProductsService.update`; conservar `attributeKey` para la unicidad de las variantes.
3. Modificar `ProductsService.findAll` para unir `base_product` y aplicar `search` sobre `bp.name`, manteniendo paginación, precios, stock y orden actuales.
4. Generar y aplicar la migración con `npm run migration:add RemoveProductName` y `npm run migration:run`; verificar que la columna `product.name` ya no exista.
5. Actualizar los tests unitarios de productos para cubrir la ausencia de `name`, la creación y actualización sin nombre persistido, el reflejo de `baseProductName` y la búsqueda por nombre de `base_product`.
6. Ejecutar `npm run build`, `npm run lint` y `npm test`; verificar manualmente `POST /products`, `GET /products`, `GET /products/:id` y `PATCH /products/:id` contra la base de datos recargada.

## Acceptance criteria

- [ ] `Product` no declara una propiedad `name`.
- [ ] La migración elimina la columna `name` de la tabla `product`.
- [ ] Los valores antiguos de `product.name` no se conservan, conforme a la decisión de eliminar y recargar los datos.
- [ ] `ProductDto` no declara ni devuelve `name`.
- [ ] `CreateProductDto` y `UpdateProductDto` no declaran `name`.
- [ ] `POST /products` crea correctamente un producto sin persistir un nombre propio.
- [ ] `PATCH /products/:id` actualiza correctamente el producto sin calcular ni persistir `product.name`.
- [ ] Las respuestas de `POST /products`, `GET /products`, `GET /products/:id` y `PATCH /products/:id` no incluyen `name`.
- [ ] Las respuestas de productos incluyen `baseProductName` tomado de `BaseProduct.name`.
- [ ] Cambiar `BaseProduct.name` se refleja en `baseProductName` de los productos relacionados.
- [ ] `productAttributes` se devuelve como estructura separada y no se concatena para generar un nombre.
- [ ] `GET /products?search=...` filtra por `base_product.name` usando búsqueda insensible a mayúsculas y acentos.
- [ ] Los filtros existentes de precio y stock continúan funcionando.
- [ ] La unicidad de variantes continúa usando `baseProduct` y `attributeKey`.
- [ ] `npm run build` pasa.
- [ ] `npm run lint` pasa.
- [ ] `npm test` pasa.

## Decisions

- **Sí:** eliminar completamente `product.name` de la entidad, tabla, DTOs, servicios y respuestas.
- **Sí:** usar `baseProductName` como única representación del nombre base del producto.
- **Sí:** eliminar el nombre compuesto que combinaba el nombre base con los atributos.
- **Sí:** conservar los atributos como datos independientes en `productAttributes`.
- **Sí:** filtrar `GET /products?search=...` por `base_product.name`, no por una columna de `product`.
- **Sí:** eliminar la columna mediante migración sin migrar valores existentes, porque la base de datos se eliminará y se recargará.
- **Sí:** mantener `attributeKey` y el índice único existente para identificar variantes, aunque ya no exista un nombre calculado.
- **No:** agregar un nuevo campo de nombre calculado o persistido en `Product`.
- **No:** cambiar el contrato de nombres de `BaseProduct`.
- **No:** modificar precios, stock, unidades, marcas, categorías o atributos.
- **Sí:** definición rápida de las secciones del documento a petición del usuario; las decisiones funcionales fueron confirmadas previamente.

## Risks

| Risk                                                                                      | Mitigation                                                                                               |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Consultas o serializadores externos todavía esperan `product.name`.                       | Buscar todas las referencias al campo, actualizar DTOs y ejecutar compilación y tests.                   |
| El filtro por nombre puede dejar de funcionar si no se une correctamente `base_product`.  | Cubrir `search` con un test específico y verificar el SQL mediante la prueba del servicio.               |
| La migración destructiva elimina datos existentes.                                        | La eliminación y recarga de datos fue confirmada; aplicar la migración solo en el entorno previsto.      |
| El cambio de nombre de `BaseProduct` puede afectar respuestas previamente materializadas. | Aceptar el comportamiento dinámico: `baseProductName` siempre refleja el nombre actual del base-product. |

## What is **not** in this spec

- Nombre propio o nombre calculado persistido en `Product`.
- Nuevo nombre compuesto basado en atributos.
- Cambio del nombre de `BaseProduct`.
- Cambios en `ProductAttribute`, precios, stock, unidades, marcas o categorías.
- Cambios en los endpoints de `BaseProduct`.

Cada uno de esos cambios, si llega a ser necesario, debe definirse en su propio spec.
