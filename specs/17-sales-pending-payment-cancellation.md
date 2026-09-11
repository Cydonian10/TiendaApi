# SPEC 17 — Flujo de ventas pendientes, pago y cancelación

> **Status:** Draft
> **Depends on:** SPEC 06 (products CRUD), SPEC 12 (autenticación y guards), SPEC 14 (precio y stock iniciales), SPEC 16 (cajas, sesiones y cierres)
> **Date:** 2026-09-10
> **Objective:** Implementar ventas con estados `PENDING`, `PAID` y `CANCELLED`, con edición previa al pago, cobro transaccional y anulación auditada mientras la sesión de caja esté abierta.

## Scope

**In:**

- Cambiar `POST /sales` para crear una venta `PENDING` sin pago ni movimiento de caja.
- Permitir editar cliente, descuento y detalles exclusivamente mientras la venta esté `PENDING`.
- Agregar `POST /sales/:id/pay` para confirmar una venta pendiente con un único pago cuyo importe sea igual al total.
- Validar y descontar stock únicamente al confirmar el pago, dentro de la transacción.
- Agregar `POST /sales/:id/cancel` con motivo obligatorio, usuario y fecha de cancelación.
- Permitir al vendedor original o a `ADMINISTRADOR` cancelar ventas pendientes y anular ventas pagadas.
- Al anular una venta `PAID`, restaurar stock, marcar su mismo pago como `CANCELLED` y crear un movimiento inverso de caja en una transacción.
- Impedir pagar, editar o cancelar ventas vinculadas a una sesión de caja cerrada.
- Agregar consulta de ventas mediante `GET /sales` y `GET /sales/:id`, con filtros por estado, sesión de caja, vendedor y rango de fechas.
- Restringir consultas: `ADMINISTRADOR` ve todas las ventas y `TRABAJADOR` solo las propias.
- Excluir las ventas `CANCELLED` de los totales efectivos calculados por el flujo de ventas.
- Crear migración, documentación Swagger y pruebas para el flujo y sus validaciones.

**Out of scope (for future specs):**

- Ventas fiadas, saldos pendientes, vencimientos y cobros posteriores en otra sesión de caja.
- Pagos mixtos o más de un método de pago por venta.
- Generación, persistencia, impresión o envío de tickets.
- Anulación de ventas después del cierre de su sesión de caja.
- Devoluciones parciales de productos.
- Reapertura de sesiones cerradas.
- Cambios en el frontend.

## Data model

Se amplían las entidades existentes; no se crean tablas nuevas para ventas, pagos ni movimientos de caja.

```ts
// src/modules/sales/entities/sale.entity.ts
export enum SaleStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING })
status: SaleStatus;

@Column({ type: 'timestamp', nullable: true })
paidAt: Date | null;

@Column({ type: 'timestamp', nullable: true })
cancelledAt: Date | null;

@ManyToOne(() => Person, { nullable: true })
cancelledBy: Person | null;

@Column({ type: 'varchar', length: 500, nullable: true })
cancellationReason: string | null;
```

```ts
// src/modules/sales/entities/sale-payment.entity.ts
export enum SalePaymentStatus {
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Column({ type: 'enum', enum: SalePaymentStatus, default: SalePaymentStatus.PAID })
status: SalePaymentStatus;
```

`SalePayment` no existe mientras la venta está `PENDING`. Al pagar se crea con estado `PAID`. Al anular una venta pagada se conserva la misma fila y pasa a `CANCELLED`.

`SaleDetail` conserva las instantáneas de producto, unidad, precio y subtotal. Al crear o editar una venta pendiente, el servidor toma el precio actual de `Product.price`, calcula los subtotales y persiste el total después del descuento global.

La anulación de una venta `PAID` crea un `CashMovement` existente con estos valores:

```ts
{
  opening: sale.cashOpening,
  type: CashMovementType.EXPENSE,
  amount: sale.totalAmount,
  reason: `Anulación de venta #${sale.id}: ${cancellationReason}`,
  createdBy: cancelledBy,
}
```

La migración agrega los estados y campos de auditoría, deja `Sale.payment` como relación opcional para ventas pendientes y conserva la restricción única de `sale_payment.saleId`.

## Implementation plan

1. Actualizar `src/modules/sales/entities/sale.entity.ts` y `src/modules/sales/entities/sale-payment.entity.ts` con estados, campos de auditoría y pago opcional; registrar cualquier repositorio adicional requerido en `src/modules/sales/sales.module.ts`.
2. Generar una nueva migración en `src/database/migrations/` que agregue los campos de estado y cancelación, permita ventas sin `sale_payment` y agregue el estado del pago; aplicar la migración sobre la base local.
3. Separar los DTOs en `src/modules/sales/dtos/sale/`: adaptar `create-sale.dto.ts` para crear una venta pendiente sin pago, completar `update-sale.dto.ts` para editarla y crear DTOs para pago, cancelación y filtros.
4. Adaptar `src/modules/sales/dtos/sale/sale.dto.ts` para devolver estado, fechas y datos de cancelación, además de representar `payment` como `null` en una venta pendiente.
5. Reescribir la creación y edición en `src/modules/sales/services/sales.service.ts`: validar sesión abierta, cliente, productos y descuento; calcular precios y totales en el servidor; permitir cambios solo en `PENDING`; no modificar stock, pagos ni caja.
6. Implementar el pago transaccional en `SalesService`: bloquear la venta y productos, comprobar que la venta y su sesión siguen abiertas, validar método e importe, revalidar stock, descontarlo, crear el pago `PAID` y actualizar la venta a `PAID` con `paidAt`.
7. Implementar la cancelación transaccional en `SalesService`: validar estado, sesión abierta y autorización del vendedor o `ADMINISTRADOR`; registrar motivo, usuario y fecha; para una venta pagada restaurar stock, cambiar su pago a `CANCELLED`, crear el egreso inverso y cambiar la venta a `CANCELLED`.
8. Implementar consultas en `SalesService` con carga de relaciones, paginación y filtros por estado, sesión, vendedor y rango de fechas; aplicar visibilidad total a `ADMINISTRADOR` y limitada al vendedor autenticado para `TRABAJADOR`.
9. Ampliar `src/modules/sales/controllers/sales.controller.ts` con `PATCH /sales/:id`, `POST /sales/:id/pay`, `POST /sales/:id/cancel`, `GET /sales` y `GET /sales/:id`, documentando cuerpos, parámetros y respuestas en Swagger.
10. Crear pruebas unitarias y/o e2e para creación pendiente, edición, pago, cancelación pendiente, anulación pagada, permisos, cierre de caja, stock insuficiente, pago inválido, filtros y rollback transaccional; ejecutar `npm run build`, `npm run lint` y `npm test`.

## Acceptance criteria

- [ ] `POST /sales` crea una venta `PENDING` con detalles, total calculado por el servidor y sin pago, movimiento de caja ni modificación de stock.
- [ ] `POST /sales` rechaza una sesión de caja inexistente o cerrada.
- [ ] Una venta `PENDING` puede editar cliente, descuento y detalles mediante `PATCH /sales/:id`.
- [ ] `PATCH /sales/:id` recalcula precios, subtotales y total usando el precio actual de los productos.
- [ ] `PATCH /sales/:id` rechaza ventas `PAID` y `CANCELLED`.
- [ ] `POST /sales/:id/pay` exige que la venta esté `PENDING` y que su sesión de caja siga `open`.
- [ ] El pago exige un método activo y un importe exactamente igual al total final.
- [ ] Confirmar el pago revalida stock, crea un único `SalePayment` con estado `PAID`, descuenta stock y cambia la venta a `PAID` con `paidAt`.
- [ ] Si el stock es insuficiente o el importe no coincide, la venta permanece `PENDING` y no se persisten pago, movimientos ni cambios de stock.
- [ ] `POST /sales/:id/cancel` exige un motivo de entre 1 y 500 caracteres.
- [ ] El vendedor original y `ADMINISTRADOR` pueden cancelar; otro `TRABAJADOR` recibe `403`.
- [ ] Cancelar una venta `PENDING` la cambia a `CANCELLED`, registra usuario, fecha y motivo, y no modifica stock ni caja.
- [ ] Anular una venta `PAID` solo es posible si su sesión de caja está `open`.
- [ ] Anular una venta `PAID` restaura el stock, cambia el pago asociado a `CANCELLED`, registra un egreso por el total en la misma sesión y cambia la venta a `CANCELLED`.
- [ ] Una venta vinculada a una sesión cerrada no puede pagarse, editarse ni cancelarse.
- [ ] Una venta `CANCELLED` conserva detalles, pago, motivo, usuario y fecha de cancelación; no se elimina de la base de datos.
- [ ] Las ventas y pagos `CANCELLED` no aportan importes a los cálculos efectivos de caja.
- [ ] `GET /sales` filtra por estado, `cashOpeningId`, `sellerId` y rango de fechas, con paginación.
- [ ] `GET /sales/:id` devuelve los detalles, estado, pago opcional y datos de cancelación.
- [ ] Un `ADMINISTRADOR` puede consultar todas las ventas; un `TRABAJADOR` solo puede consultar las ventas donde es vendedor.
- [ ] Las operaciones compuestas de pago y anulación son atómicas y no dejan datos parciales ante un error.
- [ ] La migración se aplica correctamente sobre la base local.
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.

## Decisions

- **Sí:** usar `PENDING`, `PAID` y `CANCELLED` como valores en inglés del estado de venta para mantener consistencia de código.
- **Sí:** crear la venta como `PENDING` sin pago ni descuento de stock.
- **Sí:** separar creación, edición, pago y cancelación en endpoints distintos para representar transiciones válidas del ciclo de vida.
- **Sí:** permitir editar únicamente ventas `PENDING`; las ventas `PAID` y `CANCELLED` son inmutables.
- **Sí:** obtener el precio actual al crear o editar detalles pendientes y persistirlo como instantánea en `SaleDetail`.
- **Sí:** validar stock al crear o editar para informar al usuario y revalidarlo al pagar como condición definitiva.
- **Sí:** crear un único pago al confirmar la venta y cambiar la misma fila de `SalePayment` a `CANCELLED` al anular.
- **Sí:** permitir cancelar al vendedor original y a `ADMINISTRADOR`; no a otros trabajadores.
- **Sí:** exigir un motivo de cancelación para cualquier venta, pendiente o pagada.
- **Sí:** permitir anular ventas pagadas solo mientras su `cashOpening` tenga estado `open`.
- **No:** usar un plazo fijo de una semana para anular; el cierre de caja es el límite operativo y protege el arqueo ya consolidado.
- **Sí:** restaurar stock y registrar un egreso inverso de caja al anular una venta pagada, sin borrar el movimiento original ni la venta.
- **Sí:** conservar las ventas canceladas para auditoría y excluirlas de cálculos efectivos.
- **Sí:** dar visibilidad completa a `ADMINISTRADOR` y restringir a cada `TRABAJADOR` a sus propias ventas.
- **No:** soportar pago fiado en este spec; requiere saldo, vencimiento y cobros posteriores asociados a una nueva sesión de caja.
- **No:** implementar ticket, impresión o integración con PDKMake en este spec.
- **No:** permitir pagos mixtos o múltiples pagos por venta.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Dos pagos concurrentes consumen el mismo stock disponible. | Bloquear pesimistamente la venta y los productos dentro de la transacción de pago; validar existencias tras adquirir los bloqueos. |
| Una operación falla después de descontar o restaurar stock. | Ejecutar pago y anulación en `UnitOfWork` para revertir todos sus cambios al fallar. |
| Una anulación posterior al cierre altera el arqueo consolidado. | Rechazar pago, edición y cancelación si la sesión asociada ya está `closed`. |
| El motivo de anulación no identifica el movimiento inverso correspondiente. | Incluir el ID de venta y el motivo en `CashMovement.reason`. |
| Una venta pendiente conserva un precio obsoleto. | Recalcular precios cuando se crea o edita y persistir el precio confirmado al pagar. |
| Un trabajador intenta consultar o cancelar ventas de otro vendedor. | Filtrar consultas por el usuario autenticado y validar autorización antes de cancelar. |
| Datos previos no cumplen los nuevos campos o estados. | La migración debe asignar estados coherentes a registros existentes y verificarse en la base local antes de desplegar. |

## Lo que **no** incluye este spec

- Ventas fiadas, cuentas por cobrar, vencimientos y cobros posteriores.
- Pagos mixtos, múltiples métodos de pago o múltiples pagos por venta.
- Tickets, numeración de comprobantes, impresión o integración con PDKMake.
- Anulaciones, pagos o ediciones después del cierre de la sesión de caja.
- Devoluciones parciales, cambios de productos o notas de crédito.
- Reapertura de sesiones cerradas.
- Reportes financieros consolidados y exportaciones.
- Cambios en el frontend.

Cada uno de estos temas, si se requiere, debe definirse en su propio spec.
