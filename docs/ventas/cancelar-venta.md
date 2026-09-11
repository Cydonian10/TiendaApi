# Estados de la venta

Una venta puede tener los siguientes estados:

| Estado      | Descripción                                                           |
| ----------- | --------------------------------------------------------------------- |
| `PENDIENTE` | La venta fue iniciada, pero todavía no se ha completado el pago.      |
| `PAGADA`    | El pago fue registrado correctamente y la venta fue finalizada.       |
| `CANCELADA` | La venta fue anulada y ya no debe considerarse como una venta válida. |

## Flujo de estados

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE

    PENDIENTE --> PAGADA : Pago confirmado
    PENDIENTE --> CANCELADA : Cancelar venta

    PAGADA --> CANCELADA : Anular venta

    PAGADA --> [*]
    CANCELADA --> [*]
```

---

# Flujo completo de venta

```mermaid
flowchart TD
    A([Inicio]) --> B[Usuario inicia sesión]
    B --> C[Seleccionar caja registradora]

    C --> D{¿Caja abierta?}

    D -- No --> E[Abrir caja]
    E --> F[Iniciar venta]

    D -- Sí --> F

    F --> G[Crear venta con estado PENDIENTE]

    G --> H[Agregar productos]

    H --> I{¿Hay productos?}

    I -- No --> J{¿Cancelar venta?}

    J -- Sí --> K[Cambiar estado a CANCELADA]
    K --> Z([Fin])

    J -- No --> H

    I -- Sí --> L[Validar stock]

    L --> M{¿Stock suficiente?}

    M -- No --> N[Mostrar error de stock]
    N --> H

    M -- Sí --> O[Calcular total]

    O --> P{¿Continuar con la venta?}

    P -- No --> K

    P -- Sí --> Q[Seleccionar método de pago]
    Q --> R[Registrar pago]

    R --> S{¿Pago correcto?}

    S -- No --> T[Mantener venta PENDIENTE]
    T --> Q

    S -- Sí --> U[Cambiar estado a PAGADA]
    U --> V[Registrar detalle de venta]
    V --> W[Actualizar stock]
    W --> X[Registrar movimiento de caja]
    X --> Y[Generar ticket]
    Y --> Z([Fin])
```

---

# Cancelación de una venta

Una venta puede cancelarse mientras está pendiente o después de haber sido pagada.

## Cancelar venta pendiente

```mermaid
flowchart TD
    A[Venta PENDIENTE] --> B[Usuario solicita cancelar]
    B --> C[Registrar motivo de cancelación]
    C --> D[Cambiar estado a CANCELADA]
    D --> E[Registrar usuario que canceló]
    E --> F[Registrar fecha de cancelación]
    F --> G([Fin])
```

Cuando una venta está `PENDIENTE`, normalmente todavía no se modificó el stock ni se registraron movimientos definitivos de caja.

---

## Anular una venta pagada

Si una venta ya está `PAGADA`, la cancelación necesita más operaciones.

```mermaid
flowchart TD
    A[Venta PAGADA] --> B[Usuario solicita anulación]

    B --> C{¿Puede anular ventas?}

    C -- No --> D[Mostrar acceso denegado]

    C -- Sí --> E[Solicitar motivo de anulación]

    E --> F[Registrar anulación]

    F --> G[Devolver productos al stock]

    G --> H[Registrar movimiento inverso de caja]

    H --> I[Cancelar o revertir pagos]

    I --> J[Cambiar venta a CANCELADA]

    J --> K[Registrar usuario y fecha]

    K --> L([Fin])
```

---

# Reglas de cancelación

- Una venta no debe eliminarse de la base de datos.
- Una venta cancelada conserva su información para auditoría.
- Debe registrarse quién canceló la venta.
- Debe registrarse cuándo fue cancelada.
- Debe registrarse el motivo de cancelación.
- Una venta `CANCELADA` no debe contarse en los ingresos del día.
- Una venta `CANCELADA` no debe contarse dentro de las ventas efectivas.
- Si una venta `PAGADA` es anulada, el stock debe restaurarse.
- Si afectó la caja, debe crearse un movimiento inverso.
- No se debe borrar el movimiento original.
- Los pagos asociados deben quedar anulados o revertidos según corresponda.

---

# Campos recomendados para `sales`

```text
sales
--------------------------------
id
cash_register_opening_id
user_id
status
subtotal
total
created_at
paid_at

cancelled_at
cancelled_by
cancellation_reason
```

El campo:

```text
status
```

podría aceptar:

```text
PENDING
PAID
CANCELLED
```

o en español:

```text
PENDIENTE
PAGADA
CANCELADA
```

Para código recomiendo mantener los valores en inglés:

```typescript
enum SaleStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}
```

---

# Ejemplo del ciclo de vida

```text
Venta #125

10:20
PENDING
↓
Se agregan 3 productos
↓
Total S/ 58.00
↓
Pago con Yape
↓
10:23
PAID
↓
Se genera ticket
```

Si posteriormente se anula:

```text
Venta #125

PAID
↓
Usuario solicita anulación
↓
Motivo:
"Cliente solicitó cancelar la compra"
↓
Stock restaurado
↓
Movimiento de caja revertido
↓
CANCELLED
```

La venta `#125` sigue existiendo en la base de datos; simplemente queda registrada como cancelada.
