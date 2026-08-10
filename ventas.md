# tablas

### metodo-pago

- id
- nombre // ejmplos efectivo - yape - plin - tarjeta

### sale-pago

- id
- saleId
- metodoPagoId
- monto

### caja

- id
- nombre
- activo

### caja-apertura

- id
- caja-id
- usuario-id quien lo aperturo
- fecha apertura con hora
- fecha cierre
- monto esperado
- moont real
- diferncia

### detalle-cierre

- id
- caja-apertura-id
- tipo-pago
- monto real
- monto esperado

### movimeinto-caja

- id
- id-caja-apertura
- tipo // entrada de dinero o salida de dinero
- monto
