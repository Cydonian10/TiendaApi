# SPEC 16 — Gestión de caja, sesiones y cierres por método de pago

> **Status:** Implementado
> **Depends on:** SPEC 12 (autenticación y guards)
> **Date:** 2026-09-07
> **Objective:** Implementar la operación de cajas con apertura, movimientos, ventas de pago único, cierre auditado y arqueo por cada método de pago activo.

## Scope

**In:**

- Completar el módulo `src/modules/cash/` con controladores, servicios, DTOs y pruebas para cajas, aperturas, movimientos y cierres.
- Exponer CRUD para `CashRegister` mediante `/cash-registers`.
- Abrir una sesión en `/cash-register-openings` con `cashRegisterId` y `openingAmount`, asignando `openedBy` desde el JWT.
- Permitir como máximo una sesión con estado `open` por caja, aunque varias cajas distintas pueden tener sesiones abiertas simultáneamente.
- Cerrar una sesión con `/cash-register-openings/:id/close` solo por quien la abrió o por un usuario con rol `ADMINISTRADOR`.
- Registrar movimientos `income` y `expense` solo en una sesión abierta mediante `/cash-movements`, asignando `createdBy` desde el JWT y requiriendo `reason`.
- Mantener la relación de sesión en `Sale.cashOpening`; una venta pertenece a una sesión abierta.
- Conservar `SalePayment` como el único pago obligatorio de cada venta, con un único `paymentMethod` y un importe igual al total final de la venta.
- Crear una relación única entre `Sale` y `SalePayment` para impedir pagos múltiples por venta.
- Agregar `active` a `PaymentMethod`, exponer su CRUD en `/payment-methods` y garantizar un método activo llamado `Efectivo`.
- Al cerrar, crear un `ClosingDetail` por cada método de pago activo, calcular sus montos esperados en el servidor y recibir únicamente sus montos reales.
- Calcular el esperado de `Efectivo` como apertura más pagos en efectivo más ingresos menos egresos; el esperado de los demás métodos será la suma de sus pagos.
- Persistir el usuario que cierra (`closedBy`) y las diferencias por método y por sesión.
- Crear una migración nueva para ajustar el esquema ya existente; no modificar la migración histórica `1786358750546-cash.ts`.

**Out of scope (for future specs):**

- Renombrar `CashRegisterOpening` o la tabla `cash_register_opening` a `CashRegisterSession`.
- Pagos mixtos o más de un `SalePayment` por venta.
- Mover una venta o un pago entre sesiones después de crearlos.
- Reapertura de sesiones cerradas, anulaciones de ventas, devoluciones y reversión de movimientos.
- Auditorías, reportes consolidados entre cajas y exportaciones.
- Cambios en el frontend; si el frontend usa el término sesión, conservará comentarios de mapeo hacia `CashRegisterOpening`.

## Data model

Las entidades existentes se ajustan sin renombrar `CashRegisterOpening`:

```ts
// src/modules/cash/entities/cash-register-opening.entity.ts
@ManyToOne(() => Person, { nullable: true })
closedBy: Person | null;

@Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
expectedAmount: string;

@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
realAmount: string | null;

@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
difference: string | null;
```

```ts
// src/modules/cash/entities/cash-movement.entity.ts
@ManyToOne(() => Person, { nullable: false })
createdBy: Person;

@Column({ type: 'varchar', length: 255 })
reason: string;
```

```ts
// src/modules/cash/entities/closing-detail.entity.ts
@Column({ type: 'decimal', precision: 10, scale: 2 })
expectedAmount: string;

@Column({ type: 'decimal', precision: 10, scale: 2 })
realAmount: string;

@Column({ type: 'decimal', precision: 10, scale: 2 })
difference: string;
```

```ts
// src/modules/sales/entities/sale.entity.ts
@ManyToOne(() => CashRegisterOpening, (opening) => opening.sales, {
  nullable: false,
})
cashOpening: CashRegisterOpening;

@OneToOne(() => SalePayment, (payment) => payment.sale, { cascade: true })
payment: SalePayment;
```

```ts
// src/modules/sales/entities/sale-payment.entity.ts
@OneToOne(() => Sale, (sale) => sale.payment, { nullable: false })
@JoinColumn()
sale: Sale;

@ManyToOne(() => PaymentMethod, (method) => method.salePayments, {
  nullable: false,
})
paymentMethod: PaymentMethod;

@Column({ type: 'decimal', precision: 10, scale: 2 })
amount: string;
```

```ts
// src/modules/sales/entities/payment-method.entity.ts
@Column({ type: 'boolean', default: true })
active: boolean;
```

La migración agrega `closedById`, `createdById`, `closing_detail.difference` y `payment_method.active`; hace obligatorio `cash_movement.reason`; y convierte la relación `sale_payment.saleId` en única. La sesión mantiene los totales del cierre como suma de sus detalles:

```text
closingDetail.difference = realAmount - expectedAmount
cashRegisterOpening.expectedAmount = SUM(closingDetail.expectedAmount)
cashRegisterOpening.realAmount = SUM(closingDetail.realAmount)
cashRegisterOpening.difference = realAmount - expectedAmount
```

Para el método activo con nombre exacto `Efectivo`:

```text
expectedAmount = openingAmount + salePayments + incomeMovements - expenseMovements
```

Para cualquier otro método activo, `expectedAmount` es la suma de `SalePayment.amount` de las ventas de la sesión y de ese método.

## Implementation plan

1. Ajustar las entidades de caja, ventas y métodos de pago; registrar todas las entidades necesarias en `CashModule` y `SalesModule` sin cambiar los nombres de `CashRegisterOpening` ni de sus tablas.
2. Generar una migración nueva que agregue los campos de auditoría y diferencia, active métodos de pago, vuelva obligatorio el motivo de movimiento y garantice un único pago por venta; aplicar la migración en una base de datos local.
3. Crear DTOs, servicio y controlador de `PaymentMethod` para listar, crear, editar, activar y desactivar métodos; asegurar la existencia y activación del método `Efectivo`.
4. Crear DTOs, servicio y controlador de `CashRegister` para administrar cajas activas; restringir la administración a `ADMINISTRADOR`.
5. Implementar apertura y consulta de `CashRegisterOpening`; tomar el usuario del JWT, rechazar cajas inactivas y rechazar una segunda sesión abierta en la misma caja.
6. Implementar `CashMovement` con transacción, sesión abierta, usuario del JWT y motivo obligatorio; limitarlo a `ADMINISTRADOR` o `TRABAJADOR`.
7. Extender la creación de ventas para recibir una única forma de pago, exigir que su monto coincida con el total tras descuento y asociar la venta a una sesión abierta; persistir un solo `SalePayment`.
8. Implementar el cierre transaccional de sesión: validar autorización, requerir el monto real de cada método activo, calcular esperados y diferencias, crear los detalles y marcar la sesión como `closed` con `closedAt` y `closedBy`.
9. Agregar DTOs de respuesta y documentación Swagger para `/cash-registers`, `/cash-register-openings`, `/cash-movements` y `/payment-methods`, incluyendo el detalle calculado de cierre.
10. Añadir pruebas unitarias y/o e2e para reglas de apertura, movimientos, venta con pago único, permisos, cálculos de cierre y transacciones fallidas; ejecutar `npm run build`, `npm run lint` y `npm test`.

## Acceptance criteria

- [ ] Un `ADMINISTRADOR` puede crear, editar, listar y desactivar una caja mediante `/cash-registers`.
- [ ] Una caja inactiva no puede abrir una sesión.
- [ ] Abrir una sesión asigna `openedBy` desde el JWT y persiste el `openingAmount` recibido.
- [ ] No se puede abrir una segunda sesión en estado `open` para la misma caja.
- [ ] Dos cajas distintas pueden tener simultáneamente una sesión en estado `open`.
- [ ] Un `ADMINISTRADOR` o `TRABAJADOR` puede registrar un ingreso o egreso solo en una sesión abierta.
- [ ] Un movimiento sin `reason` devuelve `400` y no se persiste.
- [ ] Cada movimiento persiste `createdBy` desde el JWT.
- [ ] Una venta se asocia a una sesión abierta y persiste exactamente un `SalePayment`.
- [ ] Una venta con más de un pago, sin pago o con un pago distinto al total final devuelve `400` y no deja datos parciales.
- [ ] `SalePayment.saleId` es único en la base de datos.
- [ ] Los métodos de pago se administran en `/payment-methods`, tienen estado `active` y existe un método activo `Efectivo`.
- [ ] El cierre crea un `ClosingDetail` para cada método de pago activo, incluso cuando su esperado es `0.00`.
- [ ] El esperado de un método distinto de `Efectivo` coincide con la suma de sus pagos en la sesión.
- [ ] El esperado de `Efectivo` incluye apertura, pagos en efectivo, ingresos y egresos con la fórmula definida.
- [ ] Cada detalle persiste `expectedAmount`, `realAmount` y `difference = realAmount - expectedAmount`.
- [ ] El cierre persiste los totales agregados, `closedAt`, `closedBy` y estado `closed` en la sesión.
- [ ] El usuario que abrió la sesión puede cerrarla; otro `TRABAJADOR` recibe `403`; un `ADMINISTRADOR` puede cerrarla.
- [ ] No se puede agregar un movimiento, venta ni segundo cierre a una sesión cerrada.
- [ ] `npm run build`, `npm run lint` y `npm test` pasan.

## Decisions

- **Sí:** conservar `CashRegisterOpening` y `cash_register_opening` como nombres internos para evitar un renombre amplio; el frontend puede documentar su equivalente funcional como sesión de caja.
- **No:** agregar `cashRegisterOpeningId` a `SalePayment`; la sesión permanece en `Sale` porque una venta tendrá un único pago.
- **Sí:** mantener `SalePayment` en vez de mover sus campos a `Sale`; conserva el concepto de cobro y permite ampliar a pagos mixtos en otro spec.
- **Sí:** limitar cada venta a un único `SalePayment` mediante relación uno a uno y restricción única en la base de datos.
- **Sí:** una sola sesión abierta por caja, permitiendo sesiones simultáneas en cajas distintas.
- **Sí:** el autor de la apertura puede cerrar su sesión y `ADMINISTRADOR` puede cerrar cualquier sesión; `TRABAJADOR` puede abrir, vender y registrar movimientos.
- **Sí:** los métodos activos determinan los detalles de cierre, incluidos los que no registraron pagos.
- **Sí:** el servidor calcula importes esperados y diferencias; el cliente solo declara los montos reales del arqueo.
- **Sí:** efectivo incorpora apertura y movimientos, mientras que los otros métodos se calculan exclusivamente desde pagos.
- **No:** modificar la migración histórica de caja; los ajustes se aplican en una migración nueva.

## Risks

| Risk                                                                     | Mitigation                                                                                                                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos solicitudes intentan abrir la misma caja al mismo tiempo.            | Validar en transacción y respaldar la regla con una restricción de unicidad parcial para sesiones `open` si TypeORM/Postgres lo permite en la migración. |
| El método `Efectivo` se renombra o desactiva y altera el cálculo físico. | Garantizar su existencia y estado activo; impedir su desactivación mientras sea el método de efectivo configurado.                                       |
| Una operación falla tras crear datos de venta, pago o cierre.            | Ejecutar cada operación compuesta dentro de `UnitOfWork` para aplicar rollback total.                                                                    |
| Los datos existentes tienen varias filas `sale_payment` para una venta.  | Revisar y resolver esos datos antes de aplicar la restricción única en el entorno destino.                                                               |

## What is **not** in this spec

- Renombrar `CashRegisterOpening` o su tabla.
- Pagos mixtos, varios métodos de pago o varias sesiones por venta.
- Reapertura de caja, anulaciones, devoluciones o reversión de movimientos.
- Reportes consolidados, auditorías avanzadas y exportaciones.
- Cambios en el frontend.

Cada uno de esos temas, si se requiere, se definirá en su propio spec.
