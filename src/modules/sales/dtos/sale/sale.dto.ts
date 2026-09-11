import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleDetail } from '../../entities/sale-detail.entity';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { SalePaymentStatus } from '../../entities/sale-payment.entity';

export class SalePaymentDto {
  @ApiProperty({ example: 1, description: 'ID del método de pago' })
  paymentMethodId: number;

  @ApiProperty({
    example: 'Efectivo',
    description: 'Nombre del método de pago',
  })
  paymentMethodName: string;

  @ApiProperty({ example: 12.5, description: 'Monto pagado' })
  amount: number;

  @ApiProperty({ enum: SalePaymentStatus, example: SalePaymentStatus.PAID })
  status: SalePaymentStatus;
}

export class SaleDetailDto {
  @ApiProperty({ example: 1, description: 'ID del detalle' })
  id: number;

  @ApiProperty({ example: 1, description: 'ID del producto' })
  productId: number;

  @ApiProperty({
    example: 'Tornillo',
    description: 'Nombre del producto base',
  })
  productName: string;

  @ApiProperty({ example: 2, description: 'Cantidad vendida' })
  quantity: number;

  @ApiProperty({
    example: 1.5,
    description: 'Precio unitario al momento de la venta',
  })
  unitPrice: number;

  @ApiProperty({ example: 3, description: 'Subtotal (quantity * unitPrice)' })
  subtotal: number;

  static fromEntity(detail: SaleDetail): SaleDetailDto {
    const dto = new SaleDetailDto();
    dto.id = detail.id;
    dto.productId = detail.product.id;
    dto.productName = detail.product.baseProduct.name;
    dto.quantity = detail.quantity;
    dto.unitPrice = parseFloat(detail.unitPrice);
    dto.subtotal = parseFloat(detail.subtotal);
    return dto;
  }
}

export class SaleDto {
  @ApiProperty({ example: 1, description: 'ID de la venta' })
  id: number;

  @ApiProperty({
    example: '2026-08-08T10:00:00.000Z',
    description: 'Fecha de la venta',
  })
  saleDate: Date;

  @ApiProperty({ example: 1, description: 'ID del cliente (Person)' })
  customerId: number;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del cliente',
  })
  customerName: string;

  @ApiProperty({ example: 2, description: 'ID del vendedor (Person)' })
  sellerId: number;

  @ApiProperty({
    example: 'Ana Gómez',
    description: 'Nombre completo del vendedor',
  })
  sellerName: string;

  @ApiProperty({ example: 2.5, description: 'Descuento en monto fijo' })
  discount: number;

  @ApiProperty({ example: 12.5, description: 'Total de la venta' })
  totalAmount: number;

  @ApiProperty({ enum: SaleStatus, example: SaleStatus.PENDING })
  status: SaleStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  paidAt: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  cancelledAt: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  cancelledById: number | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'Cliente desistió de la compra',
  })
  cancellationReason: string | null;

  @ApiProperty({ example: 1, description: 'ID de la sesión de caja' })
  cashOpeningId: number;

  @ApiPropertyOptional({ type: () => SalePaymentDto, nullable: true })
  payment: SalePaymentDto | null;

  @ApiProperty({
    type: () => [SaleDetailDto],
    description: 'Líneas de la venta',
  })
  details: SaleDetailDto[];

  static fromEntity(sale: Sale): SaleDto {
    const dto = new SaleDto();
    dto.id = sale.id;
    dto.saleDate = sale.saleDate;
    dto.customerId = sale.customer.id;
    dto.customerName = `${sale.customer.firstName} ${sale.customer.lastName}`;
    dto.sellerId = sale.seller.id;
    dto.sellerName = `${sale.seller.firstName} ${sale.seller.lastName}`;
    dto.discount = parseFloat(sale.discount);
    dto.totalAmount = parseFloat(sale.totalAmount);
    dto.status = sale.status;
    dto.paidAt = sale.paidAt;
    dto.cancelledAt = sale.cancelledAt;
    dto.cancelledById = sale.cancelledBy?.id ?? null;
    dto.cancellationReason = sale.cancellationReason;
    dto.cashOpeningId = sale.cashOpening.id;
    dto.payment = sale.payment
      ? {
          paymentMethodId: sale.payment.paymentMethod.id,
          paymentMethodName: sale.payment.paymentMethod.name,
          amount: parseFloat(sale.payment.amount),
          status: sale.payment.status,
        }
      : null;
    dto.details = (sale.details ?? []).map((d) => SaleDetailDto.fromEntity(d));
    return dto;
  }
}
